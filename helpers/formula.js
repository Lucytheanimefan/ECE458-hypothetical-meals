var Formula = require('../models/formula');
var Ingredient = require('../models/ingredient');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports.createFormula = function(name, description, units) {
  return new Promise(function(resolve, reject) {
    var result = Formula.createFormula(name, description, units);
    resolve(result);
  });
}

module.exports.deleteFormula = function(name){
  return new Promise(function(resolve,reject){
    var formQuery = Formula.findFormulaByName(name);
    formQuery.then(function(form){
      if(form == null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        var result = Formula.deleteFormula(name);
      }
    }).then(function(result){
      resolve(result.exec());
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.updateFormula = function(name, newName, description, units) {
  return new Promise(function(resolve, reject) {
    var formQuery = Formula.findFormulaByName(name);
    formQuery.then(function(form){
      if(form == null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        var result = Formula.updateFormula(name, newName, description, units);
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error){
      reject(error);
    })
  });
}

module.exports.addTuple = function(name, index, ingredientID, quantity){
  return new Promise(function(resolve,reject){
    var formQuery = Formula.findFormulaByName(name);
    formQuery.then(function(form){
      if(form==null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      if(parseFloat(quantity) < 0){
        var error = new Error('Invalid quantity: ${quantity}. Please enter a valid quantity.');
        error.status = 400;
        throw(error);
      } else {
        var ingQuery = Ingredient.getIngredientById(ingredientID);
        return ingQuery;
      }
    }).then(function(ingResult) {
      if (ingResult == null) {
        var error = new Error('The ingredient ${ingredient} does not exist!');
        error.status = 400;
        throw(error);
      }
      return Formula.addTuple(name,index,ingResult.name,ingredientID,quantity);
    }).then(function(result) {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.updateTuple = function(name, index, ingredient, quantity){
  return new Promise(function(resolve,reject){
    var formQuery = Formula.findFormulaByName(name);
    var formula;
    formQuery.then(function(form){
      formula = form;
      if(form==null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      if(parseFloat(quantity) < 0){
        var error = new Error('Invalid quantity: ${quantity}. Please enter a valid quantity.');
        error.status = 400;
        throw(error);
      }
      var ingQuery = Ingredient.getIngredient(ingredient);
      return ingQuery;
    }).then(function(ingResult) {
      if (ingResult == null) {
        var error = new Error('The ingredient ${ingredient} does not exist!');
        error.status = 400;
        throw(error);
      }
      var tuples = formula.tuples;
      for (tuple in tuples) {
        if (ingredient === tuple[ingredient]) {
          //return Formula.updateTuple(name, index, ingredient, quantity);
        }
      }
      return Formula.addTuple(name, index, ingredient, quantity);
    }).then(function() {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
}
