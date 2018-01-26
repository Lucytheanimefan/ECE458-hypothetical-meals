var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cart = require('../models/cart');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');

var config = require('../env.json');

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
    req.body.passwordConf) {

    var userRole = req.body.role ? req.body.role : "User";

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf,
      role: userRole,
    }

    User.create(userData, function(error, user) {
      if (error) {
        console.log("Error creating user");
        return next(error);
      } else {
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

      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    // Login
    User.authenticate(req.body.logemail, req.body.logpassword, function(error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        console.log("user._id: ");
        console.log(user._id);
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

// router.post('/confirmation', function(req, res, next) {

//   console.log("Confirmation POST went through!!!");

//   req.assert('email', 'Email is not valid').isEmail();
//   req.assert('email', 'Email cannot be blank').notEmpty();
//   req.assert('token', 'Token cannot be blank').notEmpty();
//   req.sanitize('email').normalizeEmail({ remove_dots: false });

//   // Check for validation errors    
//   var errors = req.validationErrors();
//   if (errors) {
//     console.log("Email confirmation errors!");
//     return res.status(400).send(errors);
//   }
//   // Find a matching token
//   Token.findOne({ token: req.body.token }, function(err, token) {
//     if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

//     // If we found a token, find a matching user
//     User.findOne({ _id: token._userId }, function(err, user) {
//       if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
//       if (user.isVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

//       // Verify and save the user
//       user.isVerified = true;
//       user.save(function(err) {
//         if (err) { return res.status(500).send({ msg: err.message }); }
//         res.status(200).send("The account has been verified. Please log in.");
//       });
//     });
//   });
// });


router.get('/confirmation', function(req, res, next) {

  console.log("****Confirmation GET went through!!!");

  
  // Find a matching token
  Token.findOne({ token: req.query.id }, function(err, token) {
    if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

    // If we found a token, find a matching user
    User.findOne({ _id: token._userId }, function(err, user) {
      if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
      if (user.isVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

      // Verify and save the user
      user.isVerified = true;
      user.save(function(err) {
        if (err) { return res.status(500).send({ msg: err.message }); }
        res.status(200).send("The account has been verified. Please log in.");
      });
    });
  });
});


router.post('/resendToken', function(req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('email', 'Email cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  // Check for validation errors    
  var errors = req.validationErrors();
  if (errors) return res.status(400).send(errors);

  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) return res.status(400).send({ msg: 'We were unable to find a user with that email.' });
    if (user.isVerified) return res.status(400).send({ msg: 'This account has already been verified. Please log in.' });

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
      var mailOptions = { from: config['email'], to: user.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '/users/confirmation/' + token.token + '.\n' };

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
          // var err = new Error('Not authorized! Go back!');
          // err.status = 400;
          // return next(err);
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
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          return res.redirect(req.baseUrl + '/');
        } else {
          res.render('cart', { title: 'Cart', name: user.username, mail: user.email });
        }
      }
    });
});


router.post('/cart', function(req, res, next) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          return res.redirect(req.baseUrl + '/');
        } else {
          Cart.findByIdAndUpdate('5a660f8df36d287087a28dc2', {
            $set: {
              cart: 'new ingredient'
            }
          }, (err, result) => {
            if (err) return res.send(err)
            res.send(result)
          })
          console.log('Added to cart')
        }
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