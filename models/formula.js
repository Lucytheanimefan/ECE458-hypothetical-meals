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
    index: {
      type: Number,
      required: true
    },
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
  return Formula.findOne({'name':name}).exec();
}

module.exports.createFormula = function(name, description, units) {
  return Formula.create({
    'name': name,
    'description': description,
    'tuples': [],
    'units': units
  });
}

module.exports.deleteFormula = function(name) {
  return Formula.findOneAndRemove({ 'name': name }).exec();
}

module.exports.updateFormula = function(name, newName, description, units) {
  return Formula.findOneAndUpdate({ 'name': name }, {
    '$set': {
      'name': name,
      'description': description,
      'units': units
    }
  }).exec();
}

module.exports.addTuple = function(name, index, ingredient, quantity){
  let entry = {index:index, ingredient:ingredient, quantity:quantity};
  return Formula.findOneAndUpdate({'name':name},{'$push':{'tuples':entry}}).exec();
}

module.exports.removeTuple = function(name, ingredient){
  return Formula.findOneAndUpdate({'name':name},{'$pull':{'tuples':{'ingredient':ingredient}}}).exec();
}

module.exports.updateTuple = function(name, index, ingredient, quantity){
  var remove = removeTuple(name,ingredient);
  var append = addTuple(name,index,ingredient,quantity);
  remove.then(function(result){
    return append;
  });
}
