//seed.js
var User = require('../models/user');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');

var Inventory = require('../models/inventory');

var EMAIL = (process.env.EMAIL) ? process.env.EMAIL : require('../env.json')['email'];
var PASSWORD = (process.env.PASSWORD) ? process.env.PASSWORD : require('../env.json')['password'];

var user = {
  username: 'Admin User',
  email: 'admin@admin.com',
  role: 'Admin',
  password: 'admin'
}

var ituser = {
  username: 'it_person',
  email: 'it_person',
  role: 'it_person',
  password: 'it_person'
}

// User.create(user, function(error, user) {
//   if (error) {
//     console.log('Error creating user: ' + error);
//     return;
//   } else {
//     console.log("done");
    
//   };
// })

User.create(ituser, function(error, user) {
  if (error) {
    console.log('Error creating user: ' + error);
    return;
  } else {
    console.log("done");
    
  };
})

// var inventory = { 
//   type:'master',
//   limits: {
//     refrigerated:1000,
//     frozen:1000,
//     room:1000
//   },
//   current: {
//     refrigerated:0,
//     frozen:0,
//     room:0
//   }
// }

// Inventory.create(inventory, function(error, inventory) {
//   if (error) {
//     console.log('Error creating inventory: ' + error);
//   } else {
//     console.log('Success creating inventory');
//   }
// })