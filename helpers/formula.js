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

module.exports.addTuple = function(name, ingredient, quantity){
  return new Promise(function(resolve,reject){
    var formQuery = Formula.findFormulaByName(name);
    formQuery.then(function(form){
      if(form==null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      if(parseFloat(quantity) < 0){
        var error = new Error('Invalid quantity: ${quantity}. Please enter a valid quantity');
        error.status = 400;
        throw(error);
      } else {
        var ingQuery = Ingredient.getIngredient(ingredient);
        ingQuery.then(function(result) {
          if (result == null) {
            var error = new Error('The ingredient ${ingredient} does not exist!');
            error.status = 400;
            throw(error);
          }
          return Formula.addTuple(name,ingredient,quantity);
        }).catch(function(error) {
          reject(error);
        })
      }
    }).then(function(result) {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
}
