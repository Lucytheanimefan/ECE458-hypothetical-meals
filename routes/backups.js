var fs = require('fs');
var express = require('express');
var router = express.Router();
var path = require("path");
const variables = require('../helpers/variables');
//var schedule = require('node-schedule');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');


mongoose.connect(variables.backupURI, { useMongoClient: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;

var backup = require('mongodb-backup');

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

var GridFS = Grid(db, mongoose.mongo);

// var rule5minute = new schedule.RecurrenceRule();
// rule5minute.minute = 5;

// // Every 5 minutes
// var job = schedule.scheduleJob(rule5minute, function(){
//   console.log('Run this every 5 minutes!');
// });

router.get('/', function(req, res, next) {

})

var putFile = function(path, name, callback) {
  var writestream = GridFS.createWriteStream({
    filename: name
  });
  writestream.on('close', function(file) {
    callback(null, file);
  });
  fs.createReadStream(path).pipe(writestream);
}


module.exports.makeBackup = function() {
  //console.log(__dirname);
  var date = new Date().yyyymmdd();
  var filePath = path.resolve(__dirname, '..', 'backups'); // + date;
  console.log(filePath);
  var fileName = date + '-backup.tar'
  backup({
    uri: variables.MONGO_URI,
    root: filePath, // write files into this dir
    tar: fileName,
    callback: function(err) {

      if (err) {
        console.error(err);
      } else {
        console.log('finish making backup: ' + path);
        // putFile(path, date, function(error, file) {
        //   console.log('Wrote file to db');
        //   console.log(file);
        // })
      }
    }
  });
}

module.exports.readBackup = function(id) {
  try {
    var readstream = GridFS.createReadStream({ _id: id });
    readstream.pipe(res);
  } catch (err) {
    console.log(err);
    return next(err);
  }
}

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
  ].join('');
};