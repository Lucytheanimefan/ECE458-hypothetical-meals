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
  native_unit: {
    type: String,
    required: true,
    trim: true
  },
  units_per_package: {
    type: Number,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  vendors: [{
    vendorId: {
      type: String,
      trim: true
    }
  }]
});

var Ingredient = mongoose.model('Ingredient', IngredientSchema);

module.exports.createIngredient = function(name, package, temp, nativeUnit, unitsPerPackage, amount) {
  return Ingredient.create({
    'name': name,
    'package': package.toLowerCase(),
    'temperature': temp.toLowerCase(),
    'native_unit': nativeUnit,
    'units_per_package': parseFloat(unitsPerPackage),
    'amount': parseFloat(amount)
  });
}

module.exports.getIngredient = function(name) {
  return Ingredient.findOne({ 'name': name }).exec();
}

module.exports.getAllIngredients = function() {
  return Ingredient.find().exec();
}

//this returns a query for searching
module.exports.searchIngredients = function() {
  return Ingredient.find();
}

module.exports.updateIngredient = function(name, newName, package, temp, nativeUnit, unitsPerPackage, amount) {
  return Ingredient.findOneAndUpdate({ 'name':  name }, {
    '$set': {
      'name': newName,
      'package': package.toLowerCase(),
      'temperature': temp.toLowerCase(),
      'native_unit': nativeUnit,
      'units_per_package': parseFloat(unitsPerPackage),
      'amount': parseFloat(amount)
    }
  }).exec();
}

module.exports.deleteIngredient = function(name) {
  return Ingredient.findOneAndRemove({ 'name': name }).exec();
}

module.exports.addVendor = function(name, vendorId) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$push': {'vendors': vendorId}
  }).exec();
}

module.exports.model = Ingredient;
