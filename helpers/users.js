var User = require('../models/user');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');



module.exports.encryptUserData = function(req, res, next) {
	console.log('Encrypt user data!');
  return function(req, res, next) {
  	console.log('In encrypt function');
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
                    user: EMAIL,
                    pass: PASSWORD
                  }
                });
                var mailOptions = {
                  from: 'hypotheticalmeals458@gmail.com',
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
          });
        };
      })
    };
}