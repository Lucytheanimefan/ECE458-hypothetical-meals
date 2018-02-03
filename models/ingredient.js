var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
require('mongoose-double')(mongoose);

var SchemaTypes = mongoose.Schema.Types;
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
    type: SchemaTypes.Double,
    required: true
  }
});
IngredientSchema.plugin(mongoosePaginate);


var Ingredient = mongoose.model('Ingredient', IngredientSchema);
module.exports = Ingredient;
