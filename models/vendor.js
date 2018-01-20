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
    type:Mixed,
    required: true
  },
  catalogue: [{food:String, units:{sack:{cost:Number,avail:Number},
    pail:{cost:Number,avail:Number},supersack:{cost:Number,avail:Number},
    truckload:{cost:Number,avail:Number},railcar:{cost:Number,avail:Number}}}]
});

VendorSchema.index({"catalogue.food":1});

VendorSchema.methods.findByCode = function(code, callback){
  Vendor.findOne({code: code})
    .exec(function(err, vendor){
      if(err){
        return callback(err)
      }else if(!vendor){
        var err = new Error('No Vendor Found with that Code.');
        err.status = 401;
        return callback(err);
      }
      return vendor;
    });
}

VendorSchema.methods.findByName = function(name, callback){
  Vendor.findOne({name: name})
    .exec(function(err,vendor){
      if(err){
        return callback(err)
      }else if(!vendor){
        var err = new Error('No Vendor Found with that Name');
        err.status = 401;
        return callback(err);
      }
      return vendor;
    })
}

VendorSchema.methods.findByIngredient = function(ingredient, callback){
  VendorSchema.find({food:food})
    .exec(function(err,vendors){
      if(err){
        return callback(err)
      }else if(!vendors){
        var err = new Error('No Vendors Selling that Ingredient');
        err.status = 401;
        return callback(err);
      }
      return vendors;
    })
}


var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
