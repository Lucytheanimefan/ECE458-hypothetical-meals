var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cart = require('../models/cart');
var Ingredient = require('../models/ingredient');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');
var dialog = require('dialog');

var config = require('../env.json');
var bcrypt = require('bcrypt');


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
          return res.redirect(req.baseUrl + '/profile');
        }
      }
    });
});

//POST route for updating data
router.post('/', function(req, res, next) {
  // Create a user
  // confirm that user typed same password twice
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error('Passwords do not match.');
    err.status = 400;
    res.send("passwords dont match");
    return next(err);
  }

  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf &&
    req.body.role) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf,
      role: req.body.role,
    }

    User.create(userData, function(error, user) {
      if (error) {
        console.log("Error creating user");
        return next(error);
      } else {
        console.log('Hash the password');
        bcrypt.hash(user.password, 10, function(err, hash) {
          if (err) {
            return next(err);
          }

          console.log('Successful hash');
          user.password = hash;
          user.save(function(err) {
            if (err) { return res.status(500).send({ msg: err.message }); }

            console.log("Create token");
            // Create a verification token for this user
            var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

            // Save the verification token

            token.save(function(err) {
              if (err) {
                console.log("Error saving token");
                return res.status(500).send({ msg: err.message });
              }

              console.log("Send the email for account confirmation");
              // Send the email
              var transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                auth: {
                  user: config["email"],
                  pass: config["password"]
                }
              });
              var mailOptions = {
                from: 'spothorse9.lucy@gmail.com',
                to: user.email,
                subject: 'Account Verification Token',
                text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' +
                  req.headers.host + '\/users\/confirmation?id=' + token.token + '.\n'
              };

              transporter.sendMail(mailOptions, function(err) {
                if (err) {
                  console.log("Error sending email");
                  return res.status(500).send({ msg: err.message });
                }
                res.status(200).render(index, { title: 'A verification email has been sent to ' + user.email + '.' });
              });
            });

          });

        })


      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    // Login
    User.authenticate(req.body.logemail, req.body.logpassword, function(error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else if (!user.isVerified) {
        return res.status(401).render('index', { title: 'Your account has not been verified.' });
      } else {
        req.session.userId = user._id;
        console.log("Successfully set user ID, redirecting to profile")
        return res.redirect(req.baseUrl + '/profile');
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});


router.get('/confirmation', function(req, res, next) {

  console.log("****Confirmation GET went through!!!");

  // Find a matching token
  Token.findOne({ token: req.query.id }, function(err, token) {
    if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

    // If we found a token, find a matching user
    User.findOne({ _id: token._userId }, function(err, user) {
      if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
      if (user.isVerified) return res.status(400).render('index', { title: 'This user has already been verified.' });

      // Verify and save the user
      user.isVerified = true;
      user.save(function(err) {
        if (err) { return res.status(500).send({ msg: err.message }); }
        res.status(200).render('index', { title: 'The account has been verified. Please log in.' });
      });
    });
  });
});

// TODO: hook up UI to resend token
router.post('/resendToken', function(req, res, next) {
  //req.assert('email', 'Email is not valid').isEmail();
  //req.assert('email', 'Email cannot be blank').notEmpty();
  //req.sanitize('email').normalizeEmail({ remove_dots: false });
  //if (errors) return res.status(400).send(errors);

  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) return res.status(400).send({ msg: 'We were unable to find a user with that email.' });
    if (user.isVerified) return res.status(400).render('index', { title: 'This user has already been verified.' });
    // Create a verification token, save it, and send email
    var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

    // Save the token
    token.save(function(err) {
      if (err) { return res.status(500).send({ msg: err.message }); }

      // Send the email
      var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: config["email"],
          pass: config["password"]
        }
      });
      var mailOptions = { from: config['email'], to: user.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '/users/confirmation?id=' + token.token + '.\n' };

      transporter.sendMail(mailOptions, function(err) {
        if (err) {
          return res.status(500).send({ msg: err.message });
        }
        res.status(200).render('index', { title: 'A verification email has been sent to ' + user.email + '.' });

      });
    });

  });
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
          res.render('profile', { title: 'Profile', name: user.username, mail: user.email });
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
router.get('/cart', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, async function (err, instance) {
        if (err) return next(err);

        var cart = instance["cart"][0];
        var ingredients = [];

        for (ingredient in cart) {
          var quantity = cart[ingredient];
          var amount;

          await Ingredient.find({ "name": ingredient }, function (err, instance) {
            if (err) return next(err);

            amount = instance[0].amount;
          });

          if (quantity > amount) {
            if (amount > 0) {
              ingredients.push({"ingredient" : ingredient, "quantity" : amount});
            }
          } else {
            ingredients.push({"ingredient" : ingredient, "quantity" : quantity});
          }
        }

        ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('cart', { ingredients});
      });
    }
  });
});

router.post('/add_to_cart', function(req, res, next) {
  User.count({ _id: req.session.userId }, function (err, count) {
    if (err) return next(err);

    var ingredient = req.body.ingredient;
    var quantity = Number(req.body.quantity);
    var amount = Number(req.body.amount);

    if (count > 0) {
      User.find({ "_id": req.session.userId }, function(err, instance) {
        if (err) return next(err);

        var cart = instance[0].cart[0];
        if (ingredient in cart) {
          quantity += Number(cart[ingredient]);
        }

        if (quantity > amount) {
          dialog.err('Not enough of ingredient in inventory!');
          return res.redirect('/ingredients/' + ingredient);
        }

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
  User.count({ _id: req.session.userId }, function (err, count) {
    if (err) return next(err);

    ingredient = req.body.ingredient;

    if (count > 0) {
      User.find({ "_id":req.session.userId }, function (err, instance) {
        if (err) return next(err);

        var cart = instance[0].cart[0];
        if (ingredient in cart) {
          delete cart[ingredient];
        }

        User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart
          }
        }, function (err, cart_instance) {
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
  User.count({ _id: req.session.userId }, function (err, count) {
    if (err) return next(err);

    var ingredient = req.body.ingredient;
    var quantity = Number(req.body.quantity);
    var amount = Number(req.body.amount);

    if (count > 0) {
      User.find({ "_id":req.session.userId }, async function (err, instance) {
        if (err) return next(err);

        var cart = instance[0].cart[0];
        for (ingredient in cart) {

          console.log(ingredient);
          var quantity = cart[ingredient];
          var amount;

          await Ingredient.find({ "name": ingredient }, function (err, instance) {
            if (err) return next(err);
            amount = instance[0].amount;
          });

          amount = amount - quantity;

          Ingredient.findOneAndUpdate({
            name: ingredient
          }, {
            $set: {
              amount: amount
            }
          }, function (err, cart_instance) {
            if (err) return next(err);
          });

          delete cart[ingredient];
        }

        User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            cart: cart
          }
        }, function (err, cart_instance) {
          if (err) return next(err);
          return res.redirect(req.baseUrl + '/cart');
        });
      });
    }
  });
});

module.exports = router;
module.exports.requireRole = function(role) {
  console.log("----Call user requireRole");
  return function(req, res, next) {

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
