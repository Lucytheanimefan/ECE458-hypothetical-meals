var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));

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
  nativeUnit: {
    type: String,
    required: true,
    trim: true
  },
  unitsPerPackage: {
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
    'nativeUnit': nativeUnit,
    'unitsPerPackage': parseFloat(unitsPerPackage),
    'amount': parseFloat(amount)
  });
}

module.exports.getIngredient = function(name) {
  return Ingredient.findOne({ 'name': name }).exec();
}

module.exports.getIngredientById = function(id){
  return Ingredient.findById(id).exec();
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
      'nativeUnit': nativeUnit,
      'unitsPerPackage': parseFloat(unitsPerPackage),
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

// IngredientSchema.pre('save', function(next, req, callback) {
//   var ingredient = this;
//   let log_data = {
//     'title': 'Ingredient created',
//     'description': ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount,
//     'entities': 'ingredient'/*,
//     'user': user.username + ', ' + user.role*/
//   }
//   Log.create(log_data, function(error, log) {
//     if (error) {
//       console.log('Error logging ingredient data: ');
//       console.log(error);
//       return next();
//     }
//     console.log(log);
//     return next();
//   })

// });

// IngredientSchema.pre('update', function(next) {
//   console.log('Updating ingredient, need to log!');
//   var ingredient = this;
//   let log_data = {
//     'title': 'Ingredient updated',
//     'description': ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount,
//     'entities': 'ingredient'/*,
//     'user': user.username + ', ' + user.role*/
//   }
//   Log.create(log_data, function(error, user) {
//     if (error) {
//       console.log('Error logging ingredient data: ');
//       console.log(error);
//       return next();
//     }
//     return next();
//   })
// });
