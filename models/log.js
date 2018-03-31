var mongoose = require('mongoose');
var express = require('express');
var router = express.Router();

var Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var LogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  time: {
    type: Date,
    default: Date.now,
    required: true
  },
  initiating_user: { //the initiating user
    type: String,
    // unique: true,
    // required: true
  }
});

LogSchema.statics.paginate = function(query, perPage, page, callback) {
  Log.find(query).limit(perPage).skip(perPage * page).sort({ time: -1 }).exec(function(err, logs) {
    if (err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, logs);
    }
  })
}

LogSchema.statics.count = function(callback) {
  Log.count({}).exec(function(err, count) {
    if (err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, count);
    }
  })
}

LogSchema.statics.all = function(callback) {
  Log.find({}).sort({ time: -1 }).exec(function(err, logs) {
    if (err) {
      callback(err);
    }
    console.log(logs);
    callback(null, logs);
  })
}

var Log = mongoose.model('Log', LogSchema);
module.exports = Log;