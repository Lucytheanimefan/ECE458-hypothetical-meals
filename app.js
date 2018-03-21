var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
var session = require('express-session');

var schedule = require('node-schedule'); // no longer necessary probably
var cron = require('cron');

var index = require('./routes/index');
var users = require('./routes/users');
var ingredients = require('./routes/ingredients');
var vendors = require('./routes/vendors');
var files = require('./routes/files');
var inventory = require('./routes/inventory_routes');
var formulas = require('./routes/formulas');
var reports = require('./routes/reports');
var logs = require('./routes/logs');
var backups = require('./routes/backups');
var MongoStore = require('connect-mongo')(session);

var oauth = require('./routes/duke_oauth');
var variables = require('./helpers/variables');

//var seed = require('./helpers/seed.js');

var app = express();


//var MONGO_URI = (process.env.MONGODB_URI);
//var MONGO_URI = (process.env.MONGODB_URI) ? process.env.MONGODB_URI : require('./env.json')[process.env.NODE_ENV || 'development']['MONGO_URI'];




// connect to mongoDB
// TODO: use env variables, either way this is a throwaway database URI

mongoose.connect(variables.MONGO_URI, { useMongoClient: true });
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
app.use('/users', users);
app.use('/ingredients', users.requireLogin(), ingredients); //This is not ideal
app.post('/ingredients/*', users.requireRole("admin"), ingredients);
app.use('/vendors', users.requireLogin(), vendors);
app.use('/formulas', formulas);
app.use('/reports', users.requireLogin(), reports);

app.use('/files', users.requireRole('admin'), files);
app.use('/inventory', inventory);


app.use('/duke_oauth', oauth);
app.use('/logs', logs);
app.use('/backups', backups);

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


var CronJob = require('cron').CronJob;

// test the cron job
// var testsJob = new CronJob('00 * * * * *', function() {
//     /*
//      * Runs every month on Monday
//      * at 11:30:00 AM. 
//      */
//     console.log('Run this every minute');
//     //backups.makeBackup();
//     backups.deletePriorBackup(Date(), 6);
//   }, function() {
//     /* This function is executed when the job stops */
//     console.log('Job done');
//   },
//   true, /* Start the job right now */
//   'America/Los_Angeles' /* Time zone of this job. */
// );


var startJobNow = true;
var dailyJob = new CronJob('00 30 11 * * 0-6', function() {
    /*
     * Runs everyday
     * at 11:30:00 AM. It does not run on Saturday
     * or Sunday.
     */
    console.log('Make daily backup'); 
    backups.makeBackup();
  }, function() {
    /* This function is executed when the job stops */
  },
  startJobNow, /* Start the job right now */
  'America/Los_Angeles' /* Time zone of this job. */
);

var weeklyJob = new CronJob('00 30 11 * * 1', function() {
    /*
     * Runs every week on Monday
     * at 11:30:00 AM. 
     */
    console.log('Make weekly backup'); 
    backups.makeBackup();

    // delete all daily backups that occurred last week
    backups.deletePriorBackup(Date(), 6);
  }, function() {
    /* This function is executed when the job stops */
  },
  startJobNow, /* Start the job right now */
  'America/Los_Angeles' /* Time zone of this job. */
);

var monthlyJob = new CronJob('00 30 11 1 * 1', function() {
    /*
     * Runs every month on Monday
     * at 11:30:00 AM. 
     */
    console.log('Make monthly backup'); 
    backups.makeBackup();
  }, function() {
    /* This function is executed when the job stops */
  },
  startJobNow, /* Start the job right now */
  'America/Los_Angeles' /* Time zone of this job. */
);

// var dailyRule = new schedule.RecurrenceRule();
// dailyRule.hour = 7
// dailyRule.dayOfWeek = new schedule.Range(0, 6);

// var testRule = new schedule.RecurrenceRule();
// testRule.second = 5;

// // Every 5 minutes
// var job = schedule.scheduleJob(dailyRule, function() {
//   console.log('Run this every day at 7!');
//   backups.makeBackup();
// });

// // Once a month
// var monthlyRule = new schedule.RecurrenceRule();
// monthlyRule.month = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// monthlyRule.hour = 0;
// monthlyRule.minute = 0;

// var monthlyJob = schedule.scheduleJob(monthlyRule, function() {
//   console.log('Your scheduled job at beginning of month');
//   backups.makeBackup();
// });

module.exports = app;