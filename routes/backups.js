var fs = require('fs');
var express = require('express');
var router = express.Router();
var path = require("path");
const variables = require('../helpers/variables');
//var schedule = require('node-schedule');
var backupMongoose = require('mongoose');
var backup = require('mongodb-backup');
var restore = require('mongodb-restore');
var grid = require('gridfs-stream');

//grid.mongo = backupMongoose.mongo;

//var GridFS = Grid(db, backupMongoose.mongo);

// var rule5minute = new schedule.RecurrenceRule();
// rule5minute.minute = 5;

// // Every 5 minutes
// var job = schedule.scheduleJob(rule5minute, function(){
//   console.log('Run this every 5 minutes!');
// });
router.get('/', function(req, res, next) {
  if (req.session.role !== 'it_person') {
    let err = new Error('This user does not have permissions to access backups');
    err.status = 403;
    return next(err);
  }
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    gfs.files.find({}).toArray(function(err, files) {
      if (err) {
        next(err);
      }
      console.log('Files:');
      console.log(files);
      res.render('backups', { files: files });
    });
  })

})

router.get('/file/:filename', function(req, res, next) {
  if (req.session.role !== 'it_person') {
    let err = new Error('This user does not have permissions to access backups');
    err.status = 403;
    return next(err);
  }
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    try {
      var readstream = gfs.createReadStream({
        filename: req.params.filename
      });
      res.setHeader('Content-type', 'application/tar');
      readstream.pipe(res);
    } catch (err) {
      console.log(err);
      next(err);
    }
  })
})

router.post('/restore', function(req, res, next) {
  if (req.session.role !== 'it_person') {
    let err = new Error('This user does not have permissions to access backups');
    err.status = 403;
    return next(err);
  }
  console.log('File: ');
  console.log(req.body.file);
  var filePath = path.resolve(__dirname, '..', 'backups');
  restore({
    uri: variables.MONGO_URI, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
    root: filePath,
    tar: req.body.file,
    callback: function(err) {
      if (err) {
        let err = new Error('Backup file is inconsistent with current system. Please try another file.');
        err.status = 400;
        return next(err);
      } else {
        console.log('Successful restore');
        // TODO: change rendered
        res.redirect(req.baseUrl) //render('index', { alert: 'Successfully uploaded file' });
      }
    }
  });
})



var readFile = function(filename, callback) {
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    try {
      var readstream = gfs.createReadStream({
        filename: filename
      });
      callback(null, readstream);
      //res.setHeader('Content-type', 'application/tar');
      //readstream.pipe(res);
    } catch (err) {
      console.log('FAILED to read');
      console.log(err);
      //next(err);
      callback(err);
    }
  })
}

/**
 * Write the file to the database
 * @param  {[type]}   path     The path of the file on the local system
 * @param  {[type]}   name     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
var putFile = function(path, name, callback) {
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
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