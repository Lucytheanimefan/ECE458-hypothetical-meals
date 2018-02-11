var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');
var dialog = require('dialog');
var bcrypt = require('bcrypt');

var EMAIL = (process.env.EMAIL);
var PASSWORD = (process.env.PASSWORD);


// var EMAIL = (process.env.EMAIL) ? process.env.EMAIL : require('../env.json')['email'];
// var PASSWORD = (process.env.PASSWORD) ? process.env.PASSWORD : require('../env.json')['password'];




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
    }

    User.create(userData, function(error, user) {
      if (error) {
        console.log("Error creating user");
        return next(error);
      } else {
        console.log('Hash the password');
        res.status(200).render('login');
        // encryptPassword(user, function(err) {
        //   if (err) { return res.status(500).send({ msg: err.message }); }
        //   res.status(200).render('login');
        // })
      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    // Login
    console.log('Authenticate!');
    User.authenticate(req.body.logemail, req.body.logpassword, function(error, user) {
      if (error || !user) {
        let err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect(req.baseUrl + '/profile');
      }
    });
  } else if (req.body.netid) {
    console.log('netid!');
    User.authenticate_netid(req.body.netid, req.body.email, function(error, user) {
      if ((error != null) || user == null) {
        console.log('Error after auth: ' + error);
        console.log('Auth user: ' + user);
        res.send({ 'success': false, 'error': error });
        //return next(error);
      } else {
        req.session.userId = user._id;
        res.send({ 'success': true, 'netid': user.netid });
        //res.render('profile', {'netid': user.netid})
        //return res.redirect(req.baseUrl + '/profile');
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
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          return res.redirect(req.baseUrl + '/');
        } else {
          res.render('profile', { title: 'Profile', username: user.username, email: user.email, netid: user.netid });
        }
      }
    });
});

router.get('/admin', function(req, res, next) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          var err = new Error('Not authorized. Please ask your admin to gain administrator privileges.');
          err.status = 400;
          return next(err);
        } else if (user.role.toUpperCase() !== "ADMIN") {
          var err = new Error('Not an admin! Go back!');
          err.status = 403;
          return next(err);
        } else {
          // TODO: will probably update this later and render a different view
          res.render('users', { title: 'Users', name: user.username, mail: user.email });
        }
      }
    });
});

router.post('/delete', function(req, res, next) {
  User.findOneAndRemove({ email: req.body.email }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that user.');
      err.status = 400;
      return next(err);
    } else {
      //alert user the ingredient has been deleted.
      return res.redirect(req.baseUrl);
    }
  });
});

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
      return next(err);
    }
    return res.redirect(req.baseUrl + '/profile');
  })

});

/**
 * This route is primarily used on the client side to determine whether or not you're an admin
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) The callback that contains the dictionary information of whether you are an admin
 * @return {null}
 */
router.get('/isAdmin', function(req, res, next) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      var isAdmin = (!error && user !== null && user.role.toUpperCase() === "ADMIN");
      console.log('isAdmin: ' + isAdmin);
      res.send({ 'isAdmin': isAdmin });
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

// GET route after registering
router.get('/cart/:page?', function(req, res, next) {
  var perPage = 5;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, async function(err, user) {
        if (err) return next(err);

        let cart = user.cart[0];
        var ingredients = [];

        var numbered_cart = [];
        for (ingredient in cart) {
          await Ingredient.find({ name: ingredient }, function(err, instance) {
            if (err) return next(err);
            var amount = instance[0].amount;
            if (amount < cart[ingredient]) {
              cart[ingredient] = amount;
            }
          });
          numbered_cart.push(ingredient);
        }

        var start = perPage * (page - 1);
        for (i = start; i < start + perPage; i++) {
          var ingredient = numbered_cart[i];
          if (ingredient == undefined) {
            break;
          }
          ingredients.push({ "ingredient": ingredient, "quantity": cart[ingredient] });
        }

        /*await User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart
          }
        }, function(err, cart_instance) {
          if (err) return next(err);
        });*/

        ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('cart', { ingredients: ingredients, page: page });
      });
    }
  });
});

router.post('/add_to_cart', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    var ingredient = req.body.ingredient;
    var quantity = Number(req.body.quantity);
    var amount = Number(req.body.amount);

    if (count > 0) {
      User.findOne({ "_id": req.session.userId }, function(err, user) {
        if (err) return next(err);
        var cart;

        cart = user.cart;
        if (cart === null | cart === undefined | Array.isArray(cart) & cart.length == 0) {
          cart = [];
          cart.push({});
        }
        cart = cart[0];
        /*if (ingredient in cart) {
          quantity += Number(cart[ingredient]);
        }*/

        cart[ingredient] = quantity;

        User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart
          }
        }, function(err, cart_instance) {
          if (err) return next(err);
          return res.redirect(req.baseUrl + '/cart');
        });
      });
    } else {
      User.create({
        _id: req.session.userId,
        cart: {
          [ingredient]: quantity
        }
      }, function(err, cart_instance) {
        if (err) return next(err);
        return res.redirect(req.baseUrl + '/cart');
      });
    }
  });
});

router.post('/remove_ingredient', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    ingredient = req.body.ingredient;

    if (count > 0) {
      User.findOne({ "_id": req.session.userId }, function(err, user) {
        if (err) return next(err);

        var cart = user.cart[0];
        if (ingredient in cart) {
          delete cart[ingredient];
        }

        User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart
          }
        }, function(err, cart_instance) {
          if (err) return next(err);
          return res.redirect(req.baseUrl + '/cart');
        });
      });
    } else {
      //TODO : error handling?
    }
  });
});

router.post('/checkout_cart', function(req, res, next) {
  User.count({ _id: req.session.userId }, async function(err, count) {
    if (err) return next(err);
    var invdb;
    await Inventory.findOne({ type: "master" }, async function(err, inv) {
      if (err) { return next(err); }
      invdb = inv;
    });

    var ingredient = req.body.ingredient;
    var quantity = Number(req.body.quantity);
    var amount = Number(req.body.amount);

    if (count > 0) {
      await User.findOne({ "_id": req.session.userId }, async function(err, user) {
        if (err) return next(err);

        var cart = user.cart[0];
        var production_report;
        for (ingredient in cart) {
          var ingObj;
          /*await Ingredient.findOne({ name: ingredient }, function(err, instance) {
            if (err) { return next(err); }
            ingObj = instance;
          })*/
          var quantity = cart[ingredient];
          var amount;
          //console.log("ingObj: " + ingObj);
          //let degrees = ingObj.temperature.split(" ")[0];

          await Ingredient.find({ name: ingredient }, function(err, instance) {
            if (err) return next(err);
            console.log("ingredient " + ingredient);
            console.log("instance " + instance[0]);
            amount = Number(instance[0].amount);
          });
          console.log(amount);
          amount = amount - quantity;
          /*console.log(invdb.current[degrees]);
          invdb.current[degrees] -= amount;
          invdb.save(function(err) {
            if (err) {
              console.log(err);
              var error = new Error('Couldn\'t update the inventory.');
              error.status = 400;
              return next(error);
            }
          });*/
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
            if (report === null | report === undefined | Array.isArray(report) & report.length == 0) {
              report = [];
              report.push({});
            }
            report = report[0];

            production_report = user.production_report;
            if (production_report === null | production_report === undefined | Array.isArray(production_report) & production_report.length == 0) {
              production_report = [];
              production_report.push({});
            }
            production_report = production_report[0];
            production_report[ingredient] = (ingredient in report) ? report[ingredient] : 0;
          });

          delete cart[ingredient];
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
          return res.redirect(req.baseUrl + '/cart');
        });
      });
    }
  });
});

router.get('/report', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, function(err, user) {
        if (err) return next(err);

        let report = user.report[0];
        var ingredients = [];

        for (ingredient in report) {
          ingredients.push({ "ingredient": ingredient, "cost": report[ingredient] });
        }

        ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('report', { ingredients });
      });
    }
  });
});

router.get('/production_report', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, function(err, user) {
        if (err) return next(err);

        let report = user.production_report[0];
        var ingredients = [];

        for (ingredient in report) {
          ingredients.push({ "ingredient": ingredient, "cost": report[ingredient] });
        }

        ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('report', { ingredients });
      });
    }
  });
});

module.exports = router;
module.exports.requireRole = function(role) {
  console.log("----Call user requireRole");
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