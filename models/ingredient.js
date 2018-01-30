var mongoose = require('mongoose');


var IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  package: {
    type: String,
    enum: ['Sack', 'Pail', 'Drum', 'Supersack', 'Truckload', 'Railcar'],
    required: true,
    trim: true
  },
  temperature: {
    type: String,
    enum: ['frozen', 'refrigerated', 'room temperature'],
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  }
})


var Ingredient = mongoose.model('Ingredient', IngredientSchema);
module.exports = Ingredient;
