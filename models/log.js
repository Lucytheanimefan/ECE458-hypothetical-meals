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
  entities: {
    type: Array, //an array of strings (the entities involved)
    required: true
  },
  initiating_user: { //the initiating user
    type: ObjectId,
    // unique: true,
    // required: true
  }
});


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