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
var nodemailer = require('nodemailer');



router.get('/', function(req, res, next) {
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
  console.log('File: ');
  console.log(req.body.file)
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

var sendEmail = function(receiver, subject, html_message, callback) {
  // create reusable transporter object using the default SMTP transport
  var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
      user: variables.EMAIL,
      pass: variables.PASSWORD
    }
  });
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: variables.EMAIL, // sender address
    to: receiver, // list of receivers
    subject: subject, // Subject line
    html: html_message // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      callback(error)
      //return console.log(error);
    }
    console.log('Message sent: ' + info);
    callback(null, info);
  });
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
        sendEmail('spothorse9.lucy@gmail.com', 'Backup Status', emailMessage, function(error, result) {
          if (error) {
            console.log('ERROR SENDING EMAIL:');
            console.log(error);
          } else {
            console.log('SUCCESS SENDING EMAIL');
            console.log(result);
          }
        })
      } else {
        var emailMessage = '';
        console.log('finish making backup');
        emailMessage += 'Successfully created backup ';
        putFile(filePath + '/' + fileName + '.tar', fileName, function(error, file) {
          if (error) {
            emailMessage += 'but failed to save backup to server.<br>Encountered the error: ' + error;
            console.log(error);
          } else {
            emailMessage += 'and saved to server';
            console.log('Wrote file to db');
            console.log(file);
          }
          sendEmail('spothorse9.lucy@gmail.com', 'Backup Status', emailMessage, function(error, result) {
            if (error) {
              console.log('ERROR SENDING EMAIL:');
              console.log(error);
            } else {
              console.log('SUCCESS SENDING EMAIL');
              console.log(result);
            }
          })
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