var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var VendorHelper = require('../helpers/vendor.js')
var Inventory = require('../models/inventory').model;
var Spending = require('../models/spending');
var Token = require('../models/token');
var UserHelper = require('../helpers/users');
var IngredientHelper = require('../helpers/ingredients');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');
var dialog = require('dialog');
var bcrypt = require('bcrypt');
var variables = require('../helpers/variables');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var mongoose = require('mongoose');
var Orders = require('../models/orders');
var OrderHelper = require('../helpers/orders')
mongoose.Promise = global.Promise;



/* GET users listing. */
router.get('/', function(req, res, next) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          res.render('login');
        } else {
          console.log('Render profile');
          return res.redirect(req.baseUrl + '/profile');
        }
      }
    });
});

//POST route for updating data
router.post('/', function(req, res, next) {
  // Create a user

  console.log('Request body: ');
  console.log(req.body);
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.role) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      netid: req.body.netid,
    }

    User.create(userData, function(error, user) {
      if (error) {
        console.log("Error creating user: ");
        console.log(error);
        return next(error);
      } else {
        logs.makeUserLog('Created user', 'Created user <a href="/users/user/' + user.username + '">' + user.username + '</a>', req.session.username);

        console.log('Hash the password');
        res.redirect(req.baseUrl + '/admin');
      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    // Login
    console.log('Authenticate!');
    User.authenticate(req.body.logemail, req.body.logpassword, function(error, user) {
      if (error || !user) {
        console.log('Error: ');
        console.log(error);
        console.log('User: ');
        console.log(user);
        let err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role.toLowerCase();
        return res.redirect(req.baseUrl + '/profile');
      }
    });
  } else if (req.body.netid) {
    console.log('netid!');
    User.authenticate_netid(req.body.netid, req.body.email, function(error, user) {
      if (error != null) {
        console.log('Error after auth: ' + error);
        console.log('Auth user: ' + user);
        res.send({ 'success': false, 'error': error });
        //return next(error);
      } else if (user == null) {

        // Create a user if it doesn't exist
        let user_data = { 'netid': req.body.netid, 'email': req.body.email, 'username': req.body.netid, 'isDukePerson': true };
        User.create(user_data, function(error, user) {
          if (error) {
            console.log("Error creating user: " + error);
            return res.send({ 'success': false, 'error': 'Error creating user for this Duke netid' });
          }


          logs.makeUserLog('Created user', 'Created user <a href="/users/user/' + user.username + '">' + user.username + '</a>', req.session.username);

          req.session.userId = user._id;
          req.session.username = user.username;
          req.session.role = user.role.toLowerCase();
          console.log('Render message');
          return res.send({ 'success': true, 'netid': user.netid });

        })

      } else {
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role.toLowerCase();
        res.send({ 'success': true, 'netid': user.netid });
      }
    });
  } else {
    let err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});



// GET route after registering
router.get('/profile', function(req, res, next) {
  console.log('Get profile!');
  User.current_user(req, function(error, user) {
    if (error) {
      return next(error);
    } else {
      res.render('profile', { title: 'Profile', username: user.username, email: user.email, netid: user.netid });
    }
  })
});

router.get('/admin', function(req, res, next) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          let err = new Error('Not authorized. Please ask your admin to gain administrator privileges.');
          err.status = 400;
          return next(err);
        } else if (user.role.toUpperCase() !== "ADMIN") {
          let err = new Error('Not an admin! Go back!');
          err.status = 403;
          return next(err);
        } else {
          User.all(function(err, users) {
            console.log('Get all the users');
            if (err) {
              console.log('Error getting all the users: \n' + err);
              return next(err);
            }
            res.render('users', { title: 'Users', name: user.username, mail: user.email, users: users });
          })
        }
      }
    });
});

router.post('/delete/:username', function(req, res, next) {
  if (req.session.role != 'admin') {
    let err = new Error('You must be an admin to delete a user');
    return next(err);
  }

  User.findOneAndRemove({ username: req.params.username }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that user.');
      err.status = 400;
      return next(err);
    } else {
      let username = result.username;
      logs.makeUserLog('Deleted user', 'Deleted user ' + username, req.session.username);
      //alert user the ingredient has been deleted.
      return res.redirect(req.baseUrl + '/admin');
    }
  });
});

// Any user can update their own account
router.post('/update', async function(req, res, next) {
  var userdata = null;
  if (req.body.netid !== null) {
    userdata = { 'netid': req.body.netid };
  } else if (req.body.email !== null && req.body.email.length > 0) {
    userdata = { 'email': req.body.email };
  }
  if (userdata === null) {
    return
  }

  User.update(userdata, { 'username': req.body.username, 'password': req.body.password, 'email': req.body.email }, function(err, user) {
    if (err) {
      //logs.makeUserLog('Update error', user, 'user', req.session.userId);
      return next(err);
    }
    logs.makeUserLog('Updated user', 'Updated user <a href="/users/user/' + user.username + '">' + user.username + '</a>', req.session.username);
    return res.redirect(req.baseUrl + '/profile');
  })
});

// Admin can update the user through username
router.post('/update/:username', async function(req, res, next) {
  if (req.session.role != 'admin') {
    let err = new Error('You must be an admin to delete a user');
    return next(err);
  }
  console.log('Update user by username ' + req.params.username);
  console.log('Update user body request: ')
  //console.log(req.body);
  let userdata = { 'username': req.params.username }

  User.update(userdata, { 'username': req.body.username, 'password': req.body.password, 'email': req.body.email, 'role': req.body.role }, function(err, user) {
    if (err) {
      return next(err);
    }

    logs.makeUserLog('Updated user', 'Updated user <a href="/users/user/' + user.username + '">' + user.username + '</a>', req.session.username);
    return res.redirect(req.baseUrl + '/admin');
  })
});

router.get('/user/:username', function(req, res, next) {
  var user = User.findOne({ username: req.params.username })
    .exec(function(error, user) {
      if (error) {
        next(error);
      }
      console.log('Update the user: ');
      console.log(user);
      res.render('user', { title: 'Update User', user: user });
    });
})


router.get('/role', function(req, res, next) {
  return res.send({ 'role': req.session.role });
});

router.get('/username', function(req, res, next) {
  return res.send({ 'username': req.session.username });
});

router.get('/isLoggedIn', function(req, res, next) {
  console.log('Check is logged in');
  res.send(req.session.userId !== null && req.session.userId !== undefined);
});



// GET for logout
router.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

router.get('/cart/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  var userQuery = User.getUserById(req.session.userId);
  var cart;
  var orders = [];
  var ingredients = [];
  var ids = [];
  userQuery.then(async function(user) {
    cart = user.cart;
    console.log(cart);
    underscore.sortBy(cart, "ingredient");
    console.log(cart);

    var promises = [];
    for (c = 0; c < cart.length; c++) {
      var order = cart[c];
      await promises.push(Ingredient.getIngredientById(order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
    }

    var start = perPage * (page - 1);
    var promises = [];
    for (i = start; i < start + perPage; i++) {
      var order = {};
      if (cart[i] == undefined) {
        break;
      }
      var index = ids.indexOf(cart[i].ingredient.toString());
      var ingName = ingredients[index];
      order['ingredient'] = ingName;
      order['quantity'] = cart[i].quantity;
      order ['vendor'] = cart[i].vendor;
      console.log(ingName + " " + order['quantity']);
      orders.push(order);
    }

    var lastPage = false;
    if (cart[index+1] == undefined) {
      lastPage = true;
    }

    res.render('cart', { orders: orders, page: page, lastPage: lastPage });
  }).catch(function(error) {
    next(error);
  })
});

router.get('/edit_order/:ingredient/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  var cart, id;
  var orders = [];
  var ingredient = req.params.ingredient;
  var ingQuery = Ingredient.getIngredient(ingredient);
  var ingredients = [];
  var ids = [];
  ingQuery.then(function(ing) {
    id = ing._id;
    var userQuery = User.getUserById(req.session.userId);
    return userQuery;
  }).then(async function(user) {
    cart = user.cart;
    underscore.sortBy(cart, "ingredient");

    var promises = [];
    for (c = 0; c < cart.length; c++) {
      var order = cart[c];
      await promises.push(Ingredient.getIngredientById(order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
    }

    var start = perPage * (page - 1);
    var promises = [];
    for (i = start; i < start + perPage; i++) {
      var order = {};
      if (cart[i] == undefined) {
        break;
      }
      var show;
      if (cart[i].ingredient.toString() === id.toString()) {
        show = "visible";
      } else {
        show = "hidden";
      }
      var index = ids.indexOf(cart[i].ingredient.toString());
      var ingName = ingredients[index];
      order['ingredient'] = ingName;
      order['quantity'] = cart[i].quantity;
      order ['vendor'] = cart[i].vendor;
      order['show'] = show;
      orders.push(order);
    }

    var lastPage = false;
    if (cart[index+1] == undefined) {
      lastPage = true;
    }

    res.render('edit_cart', { orders: orders, page: page, lastPage: lastPage, ingredient: ingredient });
  }).catch(function(error) {
    next(error);
  })
});

router.post('/remove_ingredient', function(req, res, next) {
  console.log('POST remove_ingredient')
  let ingredient = req.body.ingredient;
  var id;
  var ingredient_name;
  var ingQuery = Ingredient.getIngredient(ingredient);
  ingQuery.then(function(ing) {
    id = ing._id;
    ingredient_name = ing.name;
    var promise = UserHelper.removeOrder(req.session.userId, id);
    return promise;
  }).then(function(result) {
    console.log(result);
    logs.makeLog('Remove ingredient from cart', 'Removed ingredient <a href="/ingredients/' + ingredient_name + '">' + ingredient_name + '</a> from cart' /*JSON.stringify({ ingredient_id: id })*/ , req.session.username);
    res.redirect(req.baseUrl + '/cart');
  }).catch(function(error) {
    next(error);
  })
});

router.post('/edit_order', function(req, res, next) {
  console.log('Call POST /edit_order');
  let page = req.body.page;
  let ingredient = req.body.ingredient;
  var quantity = req.body.quantity;
  var cart, user, ingID, vendor, currentQuantity;
  var ingQuery = Ingredient.getIngredient(ingredient);
  ingQuery.then(function(ing) {
    ingID = ing._id;
    return User.getUserById(req.session.userId);
  }).then(function(userResult) {
    user = userResult;
    cart = user.cart;
    for (let order of cart) {
      if (ingID.toString() === order.ingredient.toString()) {
        currentQuantity = order.quantity;
        return Vendor.findVendorById(order.vendor);
      }
    }
  }).then(function(vendResult) {
    vendor = vendResult.name;
    quantity = quantity - currentQuantity;
    return UserHelper.addToCart(req.session.userId, ingID, quantity, vendor);
  }).then(function(results) {
    console.log("Edit cart results: ");
    console.log(cart);
    logs.makeLog('Edit cart order', 'Edited cart', req.session.username);
    res.redirect('/users/cart/' + page);
  }).catch(function(error) {
    next(error);
  })
});

router.get('/checkout_cart/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  var userQuery = User.getUserById(req.session.userId);
  var cart;
  var orders = [];
  var ingredients = [];
  var ids = [];
  var vendors = [];
  var user;
  userQuery.then(function(user) {
    user = user;
    cart = user.cart;
    var promises = [];
    for (let order of cart) {
      promises.push(Ingredient.getIngredientById(order.ingredient));
      //promises.push(UserHelper.removeOrder(req.session.userId, order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    var promises = [];
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
      promises.push(Vendor.findVendorsForIngredient(ing._id));
    }
    return Promise.all(promises);
  }).then(function(vends) {
    for (var v = 0; v < vends.length; v++) {
      var vend = vends[v];
      var item = [];
      for (let entry of vend) {
        var temp = {};
        temp['id'] = entry._id;
        temp['name'] = entry.name;
        for (let ing of entry.catalogue) {
          if (ing.ingredient.toString() === ids[v].toString()) {
            temp['cost'] = ing.cost;
            break;
          }
        }
        item.push(temp);
      }
      vendors.push(item);
    }

    underscore.sortBy(cart, "_id");
    var start = perPage * (page - 1);
    var promises = [];
    for (i = start; i < start + perPage; i++) {
      var order = {};
      if (cart[i] == undefined) {
        break;
      }
      var index = ids.indexOf(cart[i].ingredient.toString());
      var ingName = ingredients[index];
      var orderVendors = vendors[index];
      order['ingredient'] = ingName;
      order['quantity'] = cart[i].quantity;
      order['vendor'] = cart[i].vendor;
      order ['vendors'] = orderVendors;
      order['ingID'] = cart[i].ingredient;
      orders.push(order);
    }

    var lastPage = false;
    if (cart[index+1] == undefined) {
      lastPage = true;
    }
    console.log("here!!!");
    res.render('checkout', { orders: orders, page: page, lastPage: lastPage });
  }).catch(function(error) {
    next(error);
  })
});

router.post('/submit_page/:page?', function(req, res, next) {
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : Number(page);

  var ingredients = req.body.ingredient;
  var quantities = req.body.quantity;
  var vendors = req.body.vendor;
  if (!Array.isArray(ingredients)) {
    ingredients = [ingredients];
    quantities = [quantities];
    vendors = [vendors];
  }
  var nextPage = page;
  var placeOrder = false;
  if (req.body.next) {
    nextPage = page + 1;
  } else if (req.body.prev) {
    nextPage = page - 1;
  } else {
    placeOrder = true;
  }

  var promises = [];
  for (let ing of ingredients) {
    promises.push(Ingredient.getIngredient(ing));
  }
  Promise.all(promises).then(function(ingIDs) {
    var promises = [];
    for (i = 0; i < ingIDs.length; i++) {
      promises.push(UserHelper.addToCart(req.session.userId, ingIDs[i]._id, 0, vendors[i]));
    }
    return Promise.all(promises);
  }).then(function(results) {
    if (placeOrder) {
      return UserHelper.placeOrder(req.session.userId);
    }
    return "nextPage";
  }).then(function(result) {
    if (placeOrder) {
      logs.makeLog('Check out cart', 'Checked out cart' /*'Checkout cart with ingredients: <ul>' + checkoutIngredientLog + '</ul>'*/ , req.session.username);
      res.redirect('/ingredients');
    } else {
      res.redirect('/users/checkout_cart/' + nextPage);
    }
  }).catch(function(error) {
    next(error);
  })
});

router.get('/lot_assignment/:page?', function(req, res, next){
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  var unassigned = [];
  Orders.getAllUnassignedIngredients().then(function(orders){
    for(var i = 0; i < orders.length; i++){
      let orderNumber = orders[i].orderNumber;
      for(var j = 0; j < orders[i].products.length; j++){
        entry = {};
        entry['orderNumber'] = orderNumber;
        entry['ingID'] = orders[i]['products'][j]['ingID']['_id'];
        entry['ingredient'] = orders[i]['products'][j]['ingID']['name'];
        entry['vendID'] = orders[i]['products'][j]['vendID']['_id'];
        entry['vendor'] = [orders[i]['products'][j]['vendID']];
        entry['quantity'] = orders[i]['products'][j]['quantity'];
        entry['ingSize'] = orders[i]['products'][j]['ingID']['unitsPerPackage'];
        if(orders[i]['products'][j]['assigned'] === "none"){
          unassigned.push(entry);
        }
      }
    }
    res.render('lot_selection', { orders: unassigned, page: page });
  })
  /*
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  //console.log("skyrim belongs to the nords");
  var userQuery = User.getUserById(req.session.userId);
  var cart;
  var orders = [];
  var ingredients = [];
  var ids = [];
  var ingSize = [];
  userQuery.then(function(user) {
    cart = user.cart;
    var promises = [];
    //console.log("by the 9 divines");
    for (let order of cart) {
      promises.push(Ingredient.getIngredientById(order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    //console.log("talos guide you");
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
      ingSize.push(ing.unitsPerPackage);
    }
    var start = perPage * (page - 1);
    var promises = [];
    for (i = start; i < start + perPage; i++) {
      var order = {};
      if (cart[i] == undefined) {
        break;
      }
      var index = ids.indexOf(cart[i].ingredient.toString());
      var ingName = ingredients[index];
      order['ingredient'] = ingName;
      order['ingId'] = cart[i].ingredient.toString();
      //promises.push(UserHelper.getCartVendors(cart[i].vendors));
      order['quantity'] = cart[i].quantity;
      order['vendId'] = cart[i].vendor;
      order['ingSize'] = ingSize[index];
      orders.push(order);
    }
    var vendPromises = [];
    for(var i = 0; i < orders.length; i++){
      vendPromises.push(Vendor.model.findById(orders[i]['vendId']));
    }
    return Promise.all(vendPromises);
  }).then(function(vends){
    for(var i = 0; i < vends.length; i++){
      orders[i]['vendor'] = [vends[i]];
    }
    //console.log("be here");
    //console.log(orders);
    page = (page > orders.length) ? orders.length : page;
    res.render('lot_selection', { orders: orders, page: page });
  }).catch(function(error) {
    next(error);
  })*/
});

router.post('/lot_assignment/assign', function(req, res, next){
  req.body = JSON.parse(JSON.stringify(req.body));
  //console.log(req.body);
  var cart;
  var lotInfo = [];
  var promises= [];
  var orderPromises = [];
  var currLot = "no lot :(";
  var currIng =  "default ing";
  var currVend = "default vend";
  var currOrder = "default order";
  var currSize = 0;

  User.getUserById(req.session.userId).then(function(user){
    cart = user.cart;
    //console.log(cart);
  }).then(function(){
    for(var key in req.body) {
      if(req.body.hasOwnProperty(key)){
        if(key.indexOf("lotnumber")>=0){
          currLot = req.body[key];
        }
        if(key.indexOf("ingredient")>=0){
          let ingVend = req.body[key].split("@");
          //console.log(ingVend);
          currIng = ingVend[0];
          currVend = ingVend[1];
          currSize = ingVend[2];
          currOrder = ingVend[3];
        }
        if(key.indexOf("quantity")>=0){
          let currQuantity = req.body[key];
          let entry = {};
          entry['currQuantity'] = currQuantity;
          entry['currVend'] = currVend;
          entry['currIng'] = currIng;
          entry['currLot'] = currLot;
          entry['currSize'] = currSize;
          entry['currOrder'] = currOrder;
          //console.log(entry);
          lotInfo.push(entry);
        }
      }
    }
    return orderLotCheck(lotInfo);
  }).then(function(message){
    console.log("past error check");
    console.log(message);
    if(message.length > 0){
      var error = new Error(message);
      throw(error);
    }
    return Promise.all(promises);
  }).then(function(){
    for(var i = 0; i < lotInfo.length; i++){
      let currIng = lotInfo[i]['currIng'];
      let currVend = lotInfo[i]['currVend'];
      let currLot = lotInfo[i]['currLot'];
      let currQuantity = lotInfo[i]['currQuantity'];
      let currSize = lotInfo[i]['currSize'];
      let currOrder = lotInfo[i]['currOrder'];
      //console.log(currLot);
      //console.log(currIng);
      //console.log(currVend);
      //console.log(currOrder);
      promises.push(IngredientHelper.incrementAmount(currIng,parseFloat(currQuantity*currSize),currVend,currLot));
      orderPromises.push(OrderHelper.markIngredientAssigned(currOrder,currIng,currVend,currLot));
    }
    return Promise.all(promises);
  }).then(function(){
    return Promise.all(orderPromises);
  }).then(function(){
    res.redirect('/ingredients');
  }).catch(function(err){
      next(err);
  })
})


router.get('/report/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, function(err, user) {
        if (err) return next(err);

        let report = user.report[0];
        var ingredients = [];

        var numbered_report = [];
        for (ingredient in report) {
          numbered_report.push(ingredient);
        }

        numbered_report.sort();

        var start = perPage * (page - 1);
        for (i = start; i < start + perPage; i++) {
          var ingredient = numbered_report[i];
          if (ingredient == undefined) {
            break;
          }
          ingredients.push({ "ingredient": ingredient, "cost": report[ingredient] });
        }

        //ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('report', { ingredients: ingredients, page: page });
      });
    }
  });
});

module.exports = router;
module.exports.requireRole = function(role) {
  console.log("----Call user requireRole: for " + role);
  return function(req, res, next) {
    console.log('In require role callback function');
    if (role.toLowerCase() == req.session.role) {
      next();
    } else {
      var err = new Error('Not authorized. Please ask your admin to gain administrator privileges.');
      err.status = 403;
      return next(err);
    }
    // User.findById(req.session.userId).exec(function(error, user) {
    //   if (user === null) {
    //     var err = new Error('Not authorized. Please ask your admin to gain administrator privileges.');
    //     err.status = 403;
    //     return next(err);
    //   }
    //   if (user.role.toUpperCase() === role.toUpperCase()) {
    //     console.log("YES YOU ARE AN " + role + ", go forth and access");
    //     next();
    //   } else if (error) {
    //     res.send(403);
    //   }
    // });
  }
}

module.exports.requireLogin = function() {
  return function(req, res, next) {
    console.log('Require login!');
    if (req.session.userId !== null && req.session.userId !== undefined) {
      console.log('Logged in with id: ' + req.session.userId);
      next(); // allow the next route to run
    } else {
      // require the user to log in
      res.render('login'); // or render a form, etc.
    }
  }
}

orderLotCheck = async function(lots){
  var unassigned = [];
  var errorMessage = "";
  return new Promise(function(resolve,reject){
    Orders.getAllUnassignedIngredients().then(function(orders){
      for(var i = 0; i < orders.length; i++){
        let orderNumber = orders[i].orderNumber;
        for(var j = 0; j < orders[i].products.length; j++){
          entry = {};
          entry['orderNumber'] = orderNumber;
          entry['ingID'] = orders[i]['products'][j]['ingID'];
          entry['ingredient'] = orders[i]['products'][j]['ingID']['name'];
          entry['vendID'] = orders[i]['products'][j]['vendID'];
          entry['vendor'] = [orders[i]['products'][j]['vendID']];
          entry['quantity'] = orders[i]['products'][j]['quantity'];
          entry['ingSize'] = orders[i]['products'][j]['ingID']['unitsPerPackage'];
          if(orders[i]['products'][j]['assigned'] === "none"){
            unassigned.push(entry);
          }
        }
      }
      for(var i = 0; i < unassigned.length; i++){
        for(var j = 0; j < lots.length; j++){
          if(unassigned[i]['ingID']['_id'].equals(mongoose.Types.ObjectId(lots[j]['currIng'])) && unassigned[i]['vendID']['_id'].equals(mongoose.Types.ObjectId(lots[j]['currVend']))){
            unassigned[i]['quantity']-=parseFloat(lots[j]['currQuantity']);
          }
        }
      }
      for(var i = 0; i < unassigned.length; i++){
        if(unassigned[i]['quantity']!=0){
          if(unassigned[i]['quantity'] > 0){
            errorMessage += unassigned[i]['quantity'] + " " + unassigned[i]['ingID']['name'] + " from " + unassigned[i]['vendID']['name'] + " were not assigned to lots.\n";
          }
          else{
            errorMessage += -unassigned[i]['quantity'] + " too many "+ unassigned[i]['ingID']['name'] + " from " + unassigned[i]['vendID']['name'] + " were assigned to lots.\n";
          }
        }
      }
      console.log(errorMessage);
      return errorMessage;
    }).then(function(errorMessage){
      resolve(errorMessage);
    }).catch(function(err){
    reject(err);
    })
  })

  /*
  return new Promise(function(resolve,reject){
    var vendorIDs = [];
    var ingIDs = [];
    var vendors = [];
    var ings = [];
    var ordersCopy = orders.slice();
    var lotsCopy = lots.slice();
    var errorMessage = "";
    for(var i = 0; i < orders.length; i++){
      vendorIDs.push(Vendor.model.findById(orders[i]['vendor']));
      ingIDs.push(Ingredient.model.findById(orders[i]['ingredient']));
      for(var j = 0; j < lots.length; j++){
        if(ordersCopy[i]['ingID'].equals(mongoose.Types.ObjectId(lotsCopy[j]['currIng'])) && ordersCopy[i]['vendor'].equals(mongoose.Types.ObjectId(lotsCopy[j]['currVend']))){
          ordersCopy[i]['quantity']-=parseFloat(lotsCopy[j]['currQuantity']);
        }
      }
    }
    Promise.all(vendorIDs).then(function(vends){
      vendors = vends;
      return Promise.all(ingIDs).then(function(ingredients){
        ings = ingredients;
        for(var i = 0; i < orders.length; i++){
          if(ordersCopy[i]['quantity']!=0){
            if(ordersCopy[i]['quantity'] > 0){
              errorMessage += ordersCopy[i]['quantity'] + " " + ings[i]['name'] + " from " + vendors[i]['name'] + " were not assigned to lots.\n";
            }
            else{
              errorMessage += -ordersCopy[i]['quantity'] + " too many "+ ings[i]['name'] + " from " + vendors[i]['name'] + " were assigned to lots.\n";
            }
          }
        }
        console.log(errorMessage);
        return errorMessage;
      })
    }).then(function(errorMessage){
      resolve(errorMessage);
    }).catch(function(err){
      reject(err);
    })
  })
*/

}
