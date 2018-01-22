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
  location:{city:String,state:String,zip:Number},
  catalogue: [{food:String, units:{sack:{cost:Number,avail:Number},
    pail:{cost:Number,avail:Number},supersack:{cost:Number,avail:Number},
    truckload:{cost:Number,avail:Number},railcar:{cost:Number,avail:Number}}}]
});

VendorSchema.index({"catalogue.food":1});
VendorSchema.index({"location.city":1});
VendorSchema.index({"location.zip":1});
VendorSchema.index({"location.state":1});

VendorSchema.methods.findByCode = function(code, callback){
  Vendor.findOne({code: code})
    .exec(function(err, vendor){
      if(err){
        return callback(err)
      }
      return vendor;
    });
}

VendorSchema.methods.findVendors = function(limit, callback){
  var querry = Vendor.find({published: true}).sort({name:1}).limit(limit);
  vendors.exec(function(err, vendors){
    if(err){
      return callback(err);
    }
    return vendors;
  });
}

VendorSchema.methods.findByName = function(name, callback){
  Vendor.findOne({name: name})
    .exec(function(err,vendor){
      if(err){
        return callback(err)
      }
      return vendor;
    })
}

VendorSchema.methods.findByIngredient = function(ingredient, callback){
  VendorSchema.find({food:food})
    .exec(function(err,vendors){
      if(err){
        return callback(err);
      }
      return vendors;
    })
}

VendorSchema.methods.findByLocation = function(location,callback){
  VendorSchema.find({location:location})
    .exec(functino(err,vendors){
      if(err){
        return callback(err);
      }
      return vendors;
    })
}

VendorSchema.methods.findByLocationIngredient = function(location,ingredient,callback){
  VendorSchema.find({location:location, ingredient:ingredient})
    .exec(function(err,vendors){
      if(err){
        return callback(err);
      }
      return vendors;
    })
}

VendorSchema.methods.removeIngredient = function(code, callback){
  VendorSchema.findOneAndRemove({code:code})
    .exec(callback)
}


var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
