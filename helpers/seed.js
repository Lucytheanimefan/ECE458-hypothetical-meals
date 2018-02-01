//seed.js
var User = require('../models/user');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');


var EMAIL = (process.env.EMAIL) ? process.env.EMAIL : require('../env.json')['email'];
var PASSWORD = (process.env.PASSWORD) ? process.env.PASSWORD : require('../env.json')['password'];

var user = {
  username: "Admin User",
  email: "admin@admin.com",
  role: "Admin",
  password: "admin",
  passwordConf: "admin",
  isVerified: true
}

User.create(user, function(error, user) {
  if (error) {
    console.log("Error creating user: " + error);
    return;
  } else {
    console.log('Hash the password');
    bcrypt.hash(user.password, 10, function(err, hash) {
      if (err) {
        return;
      }

      console.log('Successful hash');
      user.password = hash;
      user.save(function(err) {
        if (err) { return res.status(500).send({ msg: err.message }); }

        console.log("Done");

      });
    });
  };
})