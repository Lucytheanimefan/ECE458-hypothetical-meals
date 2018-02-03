var mongoose = require('mongoose');
// var mongoosePaginate = require('mongoose-paginate');

var VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  location:{
    city:{
      type:String,
      required:true,
      trim: true
    },
    state:{
      type:String,
      required:true,
      trim: true
    }
  },
  catalogue:[{
    ingredient: {
      type: String,
      required: true,
      trim: true
    },
    units:{
      sack: {cost:Number,available:Number},
      pail: {cost:Number,available:Number},
      drum: {cost:Number,available:Number},
      supersack: {cost:Number,available:Number},
      truckload: {cost:Number,available:Number},
      railcar: {cost:Number,available:Number}
    }

  }],
  history:[{ingredient:String, cost:Number, units:String, number:Number}]
})

var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
