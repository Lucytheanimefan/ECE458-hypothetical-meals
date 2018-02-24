var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory').model;
var Token = require('../models/token');
var UserHelper = require('../helpers/users');
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
        console.log(error);
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
        let user_data = { 'netid': req.body.netid, 'username': req.body.netid, 'isDukePerson': true };
        User.create(user_data, function(error, user) {
          if (error) {
            console.log("Error creating user: " + error);
            res.send({ 'success': false, 'error': error });
          }

          logs.makeUserLog('Created user', user, ['user'], req.session.userId);

          // Try logging in again
          User.user_by_netid(req.body.netid, function(err, user) {
            if (err) {
              console.log('Error finding user by netid: ');
              res.send({ 'success': false, 'error': error });
            }
            res.send({ 'success': true, 'netid': user.netid });
          });
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
  if (req.session.role != 'admin'){
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
  if (req.session.role != 'admin'){
    let err = new Error('You must be an admin to update a user');
    return next(err);
  }

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
  if (req.session.role != 'admin'){
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
  userQuery.then(function(user) {
    cart = user.cart;
    cart = underscore.sortBy(cart, "ingredient");
    var start = perPage * (page - 1);
    for (i = start; i < start + perPage; i++) {
      var order = cart[i];
      if (order == undefined) {
        break;
      }
      orders.push(order);
    }
    res.render('cart', { orders: orders, page: page });
  }).catch(function(error){
    next(error);
  })
});

router.get('/edit_order/:ingredient/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  var userQuery = User.getUserById(req.session.userId);
  var cart;
  var orders = [];
  var ingredient = req.params.ingredient;
  userQuery.then(function(user) {
    cart = user.cart;
    cart = underscore.sortBy(cart, "ingredient");
    var start = perPage * (page - 1);
    for (i = start; i < start + perPage; i++) {
      var order = cart[i];
      if (order == undefined) {
        break;
      }
      var show;
      if (order.ingredient === ingredient) {
        show = "visible";
      } else {
        show = "hidden";
      }
      order['show'] = show;
      orders.push(order);
    }
    res.render('edit_cart', { orders: orders, page: page });
  }).catch(function(error){
    next(error);
  })
});

router.post('/remove_ingredient', function(req, res, next) {
  let id = req.session.userId;
  let ingredient = req.body.ingredient;
  var promise = UserHelper.removeOrder(id, ingredient);
  promise.then(function(result) {
    res.redirect(req.baseUrl + '/cart');
  }).catch(function(error) {
    next(error);
  })
});

router.post('/edit_order', function(req, res, next) {
  let ingredient = req.body.ingredient;
  let quantities = req.body.quantity;
  let codes = req.body.code;
  var vendor, cart;
  var userQuery = User.getUserById(req.session.userId);
  userQuery.then(function(user) {
    cart = user.cart;
    var promises = [];
    for (i = 0; i < codes.length; i++) {

    }
  var vendQuery = Vendor.findVendorByCode(code);
  vendQuery.then(function(vend) {
    vendor = vend.name;

  }).then(function(user) {
    var newQuantity;
    for (let order of cart) {
      if (ingredient === order.ingredient) {
        for (let vend of order.vendors) {
          if (vendor === vend.name) {
            newQuantity = quantity - vend.quantity;
          }
          break;
        }
        break;
      }
    }
    var promise = UserHelper.addToCart(req.session.userId, ingredient, newQuantity, vendor);
    return promise;
  }).then(function(results) {
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
});

router.post('/checkout_cart', function(req, res, next) {
  User.count({ _id: req.session.userId }, async function(err, count) {
    if (err) return next(err);

    var invdb;
    await Inventory.findOne({ type: "master" }, function(err, inv) {
      if (err) { return next(err); }
      invdb = inv;
    });

    if (count > 0) {
      await User.findOne({ "_id": req.session.userId }, async function(err, user) {
        if (err) return next(err);

        var cart = user.cart[0];
        var production_report;

        await User.findOne({ "_id": req.session.userId }, function(err, user) {
          if (err) return next(err);

          production_report = user.production_report;
          if (production_report === null | production_report === undefined | production_report == []) {
            production_report = [];
            production_report.push({});
          }
          production_report = production_report[0];
        });

        for (ingredient in cart) {
          var ingObj;
          var quantity = cart[ingredient];
          var amount;
          var inventories;
          var ingQuery = Ingredient.findOne({ name: ingredient });
          var invQuery = Inventory.findOne({ type: "master" });
          invQuery.then(function(invs) {
            inventories = invs;
            return ingQuery;
          }).then(function(ings, invs) {
            let temp = ings['temperature'].split(" ")[0];
            inventories['current'][temp] -= parseInt(quantity);
          });

          await Ingredient.find({ name: ingredient }, function(err, instance) {
            if (err) return next(err);
            amount = Number(instance[0].amount);
          });
          amount = amount - quantity;
          await Ingredient.findOneAndUpdate({
            name: ingredient
          }, {
            $set: {
              amount: amount
            }
          }, function(err, cart_instance) {
            if (err) return next(err);
          });

          await User.findOne({ "_id": req.session.userId }, function(err, user) {
            if (err) return next(err);

            let report = user.report;
            if (report === null | report === undefined | report == []) {
              report = [];
              report.push({});
            }
            report = report[0];

            var new_cost = (ingredient in report) ? report[ingredient] : 0;
            production_report[ingredient] = new_cost;
          });
          delete cart[ingredient];

        }

        if (inventories != undefined) {
          await inventories.save(function(err) {
            if (err) return next(err);
          });
        }

        await User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart,
            production_report: production_report
          }
        }, function(err, cart_instance) {
          if (err) return next(err);
        });

        logs.makeLog('Checked out cart and updated report', {cart: cart_instance, inventory: inventories, production_report: production_report}, ['cart', 'inventory'], req.session.userId);
        return res.redirect(req.baseUrl + '/report');
      });
    }
  });
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
