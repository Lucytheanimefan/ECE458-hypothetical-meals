var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory').model;
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
        logs.makeUserLog('Creation', user, 'user', req.session.userId);

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
        let user_data = { 'netid': req.body.netid, 'email': req.body.email,'username': req.body.netid, 'isDukePerson': true };
        User.create(user_data, function(error, user) {
          if (error) {
            console.log("Error creating user: " + error);
            return res.send({ 'success': false, 'error': 'Error creating user for this Duke netid' });
          }

          logs.makeUserLog('Created user', user, ['user'], req.session.userId);

          req.session.userId = user._id;
          console.log('Render message');
          return res.send({ 'success': true, 'netid': user.netid });

        })

      } else {
        req.session.userId = user._id;
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
      logs.makeUserLog('Deleted user', result, ['user'], req.session.userId);
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
    logs.makeUserLog('Updated user', user, ['user'], req.session.userId);
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
    logs.makeUserLog('Updated user', user, ['user'], req.session.userId);
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
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error || user == null) {
        res.send({ 'role': 'none' });
      } else {
        res.send({ 'role': user.role });
      }
    });
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
  userQuery.then(function(user) {
    cart = user.cart;
    var promises = [];
    for (let order of cart) {
      promises.push(Ingredient.getIngredientById(order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
    }
    var start = perPage * (page - 1);
    for (i = start; i < start + perPage; i++) {
      var order = {};
      if (cart[i] == undefined) {
        break;
      }
      var index = ids.indexOf(cart[i].ingredient.toString());
      var ingName = ingredients[index];
      order['ingredient'] = ingName;
      order['vendors'] = cart[i].vendors;
      order['quantity'] = cart[i].quantity;
      orders.push(order);
    }
  }).then(function(result) {
    res.render('cart', { orders: orders, page: page });
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
  }).then(function(user) {
    cart = user.cart;
    var promises = [];
    for (let order of cart) {
      promises.push(Ingredient.getIngredientById(order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    for (let ing of ings) {
      ingredients.push(ing.name);
      ids.push(ing._id.toString());
    }
    var start = perPage * (page - 1);
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
      order['vendors'] = cart[i].vendors;
      order['quantity'] = cart[i].quantity;
      order['show'] = show;
      orders.push(order);
    }
    res.render('edit_cart', { orders: orders, page: page });
  }).catch(function(error) {
    next(error);
  })
});

router.post('/remove_ingredient', function(req, res, next) {
  let ingredient = req.body.ingredient;
  var id;
  var ingQuery = Ingredient.getIngredient(ingredient);
  ingQuery.then(function(ing) {
    id = ing._id;
    var promise = UserHelper.removeOrder(req.session.userId, id);
    return promise;
  }).then(function(result) {
    res.redirect(req.baseUrl + '/cart');
  }).catch(function(error) {
    next(error);
  })
});

router.post('/edit_order', function(req, res, next) {
  let ingredient = req.body.ingredient;
  let quantities = req.body.quantities;
  let names = req.body.names;
  let codes = req.body.codes;
  var vendor, cart;
  if (!Array.isArray(names)) {
    quantities = [req.body.quantities];
    names = [req.body.names];
    codes = [req.body.codes];
  }
  var id;
  var ingQuery = Ingredient.getIngredient(ingredient);
  ingQuery.then(function(ing) {
    id = ing._id;
    var userQuery = User.getUserById(req.session.userId);
    return userQuery;
  }).then(async function(user) {
    cart = user.cart;
    //var promises = [];
    for (i = 0; i < names.length; i++) {
      var vendor = names[i];
      var quantity = quantities[i];
      var newQuantity;
      for (let order of cart) {
        if (id.toString() === order.ingredient.toString()) {
          for (i = 0; i < order.vendors.length; i++) {
            var vend = order.vendors[i];
            if (vendor === vend.name) {
              newQuantity = quantity - vend.quantity;
              await UserHelper.addToCart(req.session.userId, id, newQuantity, vendor);
              break;
            }
          }
          break;
        }
      }
    }
    //return Promise.all(promises);
  }).then(function(results) {
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
});

router.post('/checkout_cart', function(req, res, next) {
  var cart;
  var userQuery = User.getUserById(req.session.userId);
  userQuery.then(function(user) {
    cart = user.cart;
    var promises = [];
    for (let order of cart) {
      promises.push(IngredientHelper.incrementAmount(order.ingredient, order.quantity));
      promises.push(UserHelper.removeOrder(req.session.userId, order.ingredient));
    }
    return Promise.all(promises);
  }).then(function(ings) {
    //logs.makeLog('Checked out cart and updated report', { cart: cart_instance, inventory: inventories, production_report: production_report }, ['cart', 'inventory'], req.session.userId);
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
});

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

router.get('/production_report/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, function(err, user) {
        if (err) return next(err);

        let report = user.production_report[0];
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
        return res.render('production_report', { ingredients: ingredients, page: page });
      });
    }
  });
});

module.exports = router;
module.exports.requireRole = function(role) {
  console.log("----Call user requireRole: for " + role);
  return function(req, res, next) {
    console.log('In require role callback function');
    User.findById(req.session.userId).exec(function(error, user) {
      if (user === null) {
        var err = new Error('Not authorized. Please ask your admin to gain administrator privileges.');
        err.status = 403;
        return next(err);
      }
      if (user.role.toUpperCase() === role.toUpperCase()) {
        console.log("YES YOU ARE AN " + role + ", go forth and access");
        next();
      } else if (error) {
        res.send(403);
      }
    });
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
