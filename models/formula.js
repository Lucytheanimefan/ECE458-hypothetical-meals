var mongoose = require('mongoose');

var FormulaSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ingredient: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  units: {
    type: Number,
    required: true
  }
});

var Formula = mongoose.model('Formula', FormulaSchema);
module.exports = Formula;
