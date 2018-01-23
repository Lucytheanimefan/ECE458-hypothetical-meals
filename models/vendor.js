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
  location:{city:String,state:String,zip:Number},
  catalogue: [{food:String, units:{sack:{cost:Number,avail:Number},
    pail:{cost:Number,avail:Number},supersack:{cost:Number,avail:Number},
    truckload:{cost:Number,avail:Number},railcar:{cost:Number,avail:Number}}}]
});

VendorSchema.index({"catalogue.food":1});
VendorSchema.index({"location.city":1});
VendorSchema.index({"location.zip":1});
VendorSchema.index({"location.state":1});

var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
