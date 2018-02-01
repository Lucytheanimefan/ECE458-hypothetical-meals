var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
var session = require('express-session');

var index = require('./routes/index');
var users = require('./routes/users');
var ingredients = require('./routes/ingredients');
var vendors = require('./routes/vendors');
var inventory = require('./routes/inventory_routes');
var MongoStore = require('connect-mongo')(session);

//var seed = require('./helpers/seed.js');

var app = express();



var MONGO_URI = (process.env.MONGODB_URI) ? process.env.MONGODB_URI : require('./env.json')[process.env.NODE_ENV || 'development']['MONGO_URI'];




// connect to mongoDB
// TODO: use env variables, either way this is a throwaway database URI

mongoose.connect(MONGO_URI, {useMongoClient: true});
mongoose.Promise = global.Promise;
var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});


//use sessions for tracking logins
app.use(session({
  secret: 'anime',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users',users);
app.use('/ingredients', users.requireLogin(),ingredients); //This is not ideal
app.post('/ingredients/*', users.requireRole("admin"), ingredients);
app.use('/vendors', users.requireRole("admin"), vendors);
app.use('/inventory',users.requireRole("admin"),inventory);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log("404 ERROR poop");
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});




module.exports = app;
