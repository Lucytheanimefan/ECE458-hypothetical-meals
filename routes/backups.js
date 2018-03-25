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


router.get('/:page?', function(req, res, next) {
  if (req.session.role !== 'it_person') {
    let err = new Error('This user does not have permissions to access backups');
    err.status = 403;
    return next(err);
  }
  var page = parseInt(req.params.page);
  if (page == null || isNaN(page) || page < 0) {
    page = 0;
  }
  var perPage = 7;
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    gfs.files.find({}).limit(perPage).skip(perPage * page).sort({ uploadDate: -1 }).toArray(function(err, files) {
      if (err) {
        console.log(err);
        next(err);
      }
      
      res.render('backups', { files: files, page: page });
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

router.post('/restore/:id', function(req, res, next) {
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
        "_id": req.params.id
      });
      restore({
        drop: true,
        uri: variables.MONGO_URI, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
        stream: readstream,
        callback: function(error) {
          if (error) {
            sendEmail(['spothorse9.lucy@gmail.com', 'hypotheticalfoods458@gmail.com'], 'Backup restore failed', 'Restore to backup ' + req.body.filename + ' failed', function(err) {})
            console.log(error);
            let err = new Error('There was an error with the backup.');
            err.status = 400;
            return next(err);
          } else {
            console.log('Successful restore');
            sendEmail(['spothorse9.lucy@gmail.com', 'hypotheticalfoods458@gmail.com'], 'Backup restore succeeded', 'Successfully restored to backup ' + req.body.filename, function(err) {});
            res.redirect(req.baseUrl);
          }
        }
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  })
})

router.post('/delete/:id', function(req, res, next) {
  grid.mongo = backupMongoose.mongo;
  var conn = backupMongoose.createConnection(variables.backupURI);
  conn.once('open', function() {
    var gfs = grid(conn.db);
    gfs.remove({ "_id": req.params.id }, function(err, gridStore) {
      if (err) return next(err);
      console.log('success deleting backup');
      res.redirect(req.baseUrl);
    });
  })
})

router.post('/makebackup', function(req, res, next) {
  makeBackup('', function(err) {
    if (err) {
      return next(err);
    }
    res.redirect(req.baseUrl);
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

var makeBackup = function(backupType = '', callback = null) {
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
        emailMessage = Date() + ': Failed to create ' + backupType + ' backup ' + fileName + ' due to error: ' + err;
        sendEmail(['spothorse9.lucy@gmail.com', 'hypotheticalfoods458@gmail.com'], 'Backup Status', emailMessage, function(error, result) {
          if (error) {
            console.log('ERROR SENDING EMAIL:');
            console.log(error);
            if (callback) {
              callback(error);
            }
          } else {
            console.log('SUCCESS SENDING EMAIL');
            console.log(result);
            if (callback) {
              callback(null);
            }
          }
        })
      } else {
        var emailMessage = '';
        console.log('finish making backup');
        emailMessage += Date() + ': Successfully created ' + backupType + ' backup ' + fileName + ' ';
        putFile(filePath + '/' + fileName + '.tar', fileName, function(error, file) {
          if (error) {
            emailMessage += 'but failed to save backup to server.<br>Encountered the error: ' + error;
            console.log(error);
          } else {
            emailMessage += 'and saved to server';
            console.log('Wrote file to db');
            console.log(file);
          }
          sendEmail(['spothorse9.lucy@gmail.com', 'hypotheticalfoods458@gmail.com'], 'Backup Status', emailMessage, function(error, result) {
            if (error) {
              console.log('ERROR SENDING EMAIL:');
              console.log(error);
              if (callback) {
                callback(error);
              }
            } else {
              console.log('SUCCESS SENDING EMAIL');
              console.log(result);
              if (callback) {
                callback(null);
              }
            }
          })
        })
      }
    }
  });
}

module.exports = router;


module.exports.makeBackup = function(backupType = '') {
  //console.log(__dirname);
  makeBackup(backupType);
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