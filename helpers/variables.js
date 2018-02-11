var express = require('express');

module.exports.EMAIL = (process.env.EMAIL);
module.exports.PASSWORD = (process.env.PASSWORD);
module.exports.CLIENTID = process.env.clientID; 
module.exports.CLIENTSECRET = process.env.clientSecret;
module.exports.TOKEN_URL = process.env.tokenHost;
module.exports.MONGO_URI = (process.env.MONGODB_URI); 

// const MY_ENV = require('../env.json');
// module.exports.MONGO_URI = (process.env.MONGODB_URI) ? process.env.MONGODB_URI : MY_ENV[process.env.NODE_ENV || 'development']['MONGO_URI'];
// module.exports.EMAIL = (process.env.EMAIL) ? process.env.EMAIL : MY_ENV['email'];
// module.exports.PASSWORD = (process.env.PASSWORD) ? process.env.PASSWORD : MY_ENV['password'];
// module.exports.CLIENTID = MY_ENV['clientID'];
// module.exports.CLIENTSECRET = MY_ENV['clientSecret'];
// module.exports.TOKEN_URL = MY_ENV['tokenHost'];