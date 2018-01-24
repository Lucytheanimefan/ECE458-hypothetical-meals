var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var VendorSchema = new mongoose.Schema({
  name:{
    type:String,
    required: true,
  },
  code:{
    type:String,
    required: true,
    unique: true
  },
  contact:{
    type:String,
    required: true
  },
  location:{
    type:String,
    required: true
  }
})

var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
