var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

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
  tuples:[{
    ingredient: {
      type: String,
      required: true
    },
    quantity:{
      type: Number,
      required: true
    }
  }],
  units: {
    type: Number,
    required: true
  }
});

var Formula = mongoose.model('Formula', FormulaSchema);
module.exports.model = Formula;

module.exports.findFormulaByName = function(name){
  return Vendor.findOne({'name':name}).exec();
}

module.exports.createFormula = function(name, description, ingredient, quantity, units) {
  return Formula.create({
    'name': name,
    'description': description,
    'tuples': [],
    'units': units
  });
}

module.exports.deleteFormula = function(name) {
  return Vendor.findOneAndRemove({ 'name': name }).exec();
}

module.exports.updateFormula = function(name, newName, description, units) {
  return Vendor.findOneAndUpdate({ 'name': name }, {
    '$set': {
      'name': name,
      'description': description,
      'units': units
    }
  }).exec();
}

module.exports.addTuple = function(name, ingredient, quantity){
  let entry = {ingredient:ingredient, quantity:quantity};
  return Vendor.findOneAndUpdate({'name':name},{'$push':{'catalogue':entry}}).exec();
}

module.exports.removeTuple = function(name, ingredient){
  return Vendor.findOneAndUpdate({'name':name},{'$pull':{'catalogue':{'ingredient':ingredient}}}).exec();
}

module.exports.updateTuple = function(name, ingredient, quantity){
  var remove = removeIngredient(code,ingredient,quantity);
  var append = addIngredient(code,ingredient,quantity);
  remove.then(function(result){
    return append;
  });
}
