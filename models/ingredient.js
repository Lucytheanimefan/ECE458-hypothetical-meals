var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  package: {
    type: String,
    enum: ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'],
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
});

var Ingredient = mongoose.model('Ingredient', IngredientSchema);

module.exports.createIngredient = function(name, package, temp, amount) {
  return Ingredient.create({
    'name': name,
    'package': package.toLowerCase(),
    'temperature': temp.toLowerCase(),
    'amount': parseInt(amount)
  });
}

module.exports.getIngredient = function(name) {
  return Ingredient.findOne({ 'name': name }).exec();
}

module.exports.getAllIngredients = function() {
  return Ingredient.find().exec();
}

module.exports.updateIngredient = function(name, newName, package, temp, amount) {
  return Ingredient.findOneAndUpdate({ 'name':  name }, {
    '$set': {
      'name': newName,
      'package': package.toLowerCase(),
      'temperature': temp.toLowerCase(),
      'amount': parseInt(amount)
    }
  }).exec();
}

module.exports.deleteIngredient = function(name) {
  return Ingredient.findOneAndRemove({ 'name': name }).exec();
}


module.exports.model = Ingredient;
