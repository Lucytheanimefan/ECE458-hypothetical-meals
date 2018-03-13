var fs = require('fs');
var express = require('express');
var router = express.Router();
var path = require("path");
const variables = require('../helpers/variables');
//var schedule = require('node-schedule');
var mongoose = require('mongoose');
var backup = require('mongodb-backup');
var grid = require('gridfs-stream');


//grid.mongo = mongoose.mongo;

//var GridFS = Grid(db, mongoose.mongo);

// var rule5minute = new schedule.RecurrenceRule();
// rule5minute.minute = 5;

// // Every 5 minutes
// var job = schedule.scheduleJob(rule5minute, function(){
//   console.log('Run this every 5 minutes!');
// });
router.get('/', function(req, res, next) {
  // grid.mongo = mongoose.mongo;
  // var conn = mongoose.createConnection(variables.backupURI);
  // conn.once('open', function() {
  //   var gfs = grid(conn.db);
  //   var readstream = gfs.createReadStream({
  //     filename: req.params.filename
  //   });
  //   readstream.pipe(res);
  // })
})

router.get('/:filename', function(req, res, next) {
  grid.mongo = mongoose.mongo;
  var conn = mongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    var readstream = gfs.createReadStream({
      filename: req.params.filename
    });
    res.setHeader('Content-type', 'application/tar');
    readstream.pipe(res);
  })
})


// var readFile = function(id) {
//   var conn = mongoose.createConnection(variables.backupURI);
//   conn.once('open', function() {
//     var gfs = grid(conn.db);
//     var readstream = gfs.createReadStream({
//       _id: id
//     });
//     readstream.pipe(res);
//   })
// }

/**
 * Write the file to the database
 * @param  {[type]}   path     The path of the file on the local system
 * @param  {[type]}   name     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
var putFile = function(path, name, callback) {
  grid.mongo = mongoose.mongo;
  var conn = mongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    var writestream = gfs.createWriteStream({
      filename: name
    });
    fs.createReadStream(path).pipe(writestream);
    writestream.on('close', function(file) {
      callback(null, file);
    });
  })

  // var writestream = GridFS.createWriteStream({
  //   filename: name
  // });

  // writestream.on('close', function(file) {
  //   callback(null, file);
  // });
  // fs.createReadStream(path).pipe(writestream);
}

module.exports = router;


module.exports.makeBackup = function() {
  //console.log(__dirname);
  var date = new Date().yyyymmdd();
  var filePath = path.resolve(__dirname, '..', 'backups'); // + date;
  console.log(filePath);
  var fileName = date + '-backup';
  backup({
    uri: variables.MONGO_URI,
    root: filePath, // write files into this dir
    tar: fileName + '.tar',
    callback: function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('finish making backup');

        putFile(filePath + '/' + fileName + '.tar', fileName, function(error, file) {
          console.log('Wrote file to db');
          console.log(file);
          if (error) {
            console.log(error);
          }
        })
      }
    }
  });
}


Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
  ].join('');
};