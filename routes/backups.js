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

/**
 * Deletes all of the daily backups 1 week prior to the date parameter
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) [description]
 * @return {[type]}       [description]
 */
// router.post('/delete_daily_prior/:date', function(req, res, next)) {
//   if (req.session.role !== 'it_person') {
//     let err = new Error('This user does not have permissions to access backups');
//     err.status = 403;
//     return next(err);
//   }
//   var date = Date.parse(req.params.date);
//   console.log('Date: ' + date);
//   var oneWeekPriorDate = date - 6;
//   console.log('One week prior date: ' + oneWeekPriorDate);
//   grid.mongo = backupMongoose.mongo;
//   var conn = backupMongoose.createConnection(variables.backupURI);
//   conn.once('open', function() {
//     var gfs = grid(conn.db);
//     gfs.remove({ 'filename': { "$gte": oneWeekPriorDate, "$lt": date } }, function(err) {
//       if (err) {
//         console.log(err);
//         next(err);
//       }
//       console.log('Successfully deleted!');
//       res.render('backups', { files: files });
//     });
//   })
// }

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
        emailMessage = Date() + ': Failed to create backup ' + fileName + ' due to error: ' + err;
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
        emailMessage += Date() + ': Successfully created backup ' + fileName + ' ';
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

module.exports.deletePriorBackup = function(endDate, daysBefore) {
  var date = new Date(Date.parse(endDate));
  console.log('Date: ' + date);
  var oneWeekPriorDate = new Date();
  oneWeekPriorDate.setDate(date.getDate() - daysBefore);
  console.log('One week prior date: ' + oneWeekPriorDate);

  var backUpDates = getDates(oneWeekPriorDate, date);
  console.log(backUpDates);
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);

    for (var i = 0; i < backUpDates.length; i++) {
      (function(i) {
        gfs.remove({ filename: backUpDates[i] }, function(err, gridStore) {
          if (err) return handleError(err);
          console.log('success deleting ' + backUpDates[i]);
        });
      })(i);
    }
  })
}

var getDates = function(startDate, stopDate) {
  var dateArray = new Array();
  var currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push(new Date(currentDate).yyyymmdd() + '-backup');
    currentDate = currentDate.addDays(1);
  }
  return dateArray;
}


Date.prototype.addDays = function(days) {
  let date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
  ].join(''); //join('-');
};