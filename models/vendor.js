var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
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
    temp:{
      type: String,
      required: true,
      trim: true
    },
    package:{
      type: String,
      required: true,
      trim: true
    },
    available:{
      type: Number,
      required: true,
      trim: true
    },
    cost:{
      type: Number,
      required: true,
      trim: true
    }

  }],
  history:[{ingredient:String, cost:Number, number:Number}]
})

var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
