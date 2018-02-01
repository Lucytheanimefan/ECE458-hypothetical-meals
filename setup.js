var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


var MONGO_URI = (process.env.MONGODB_URI) ? process.env.MONGODB_URI : require('./env.json')[process.env.NODE_ENV || 'development']['MONGO_URI'];



// connect to mongoDB
// TODO: use env variables, either way this is a throwaway database URI

mongoose.connect(MONGO_URI, { useMongoClient: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  var seed = require('./helpers/seed.js');
});