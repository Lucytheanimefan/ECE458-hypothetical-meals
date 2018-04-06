var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var FinalProductSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  lots: [{
    units: Number,
    timestamp: Number
  }]
});

var FinalProduct = mongoose.model('final_product')