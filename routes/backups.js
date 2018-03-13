var fs = require('fs');
const variables = require('../helpers/variables');
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

var GridFS = Grid(mongoose.connection.db, mongoose.mongo);

var putFile = function(path, name, callback) {
  var writestream = GridFS.createWriteStream({
    filename: name
  });
  writestream.on('close', function(file) {
    callback(null, file);
  });
  fs.createReadStream(path).pipe(writestream);
}


var makeBackup = function() {
  var date = new Date().yyyymmdd();
  var path = '../backups/' + date;
  backup({
    uri: variables.backupURI, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
    root: path, // write files into this dir
    callback: function(err) {

      if (err) {
        console.error(err);
      } else {
        console.log('finish making backup');
        putFile(path, date, function(error, file) {
          console.log(file);
        })
      }
    }
  });
}

var readBackup = function(id) {
  try {
    var readstream = GridFS.createReadStream({ _id: id });
    readstream.pipe(res);
  } catch (err) {
  	//let error = new Error();
    //log.error(err);
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