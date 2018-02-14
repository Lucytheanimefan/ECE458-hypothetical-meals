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
    type: String,
    required: true
  },
  initiating_user: { //the initiating user
  	type:ObjectId, 
  	// unique: true,
  	// required: true
  }
});


var Log = mongoose.model('Log', LogSchema);
module.exports = Log;