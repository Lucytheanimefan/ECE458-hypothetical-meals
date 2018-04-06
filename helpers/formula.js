var Formula = require('../models/formula');
var Ingredient = require('../models/ingredient');
var FinalProduct = require('../models/final_product');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports.createFormula = function(name, description, units, intermediate, ingInfo=null) {
  return new Promise(function(resolve, reject) {
    var formula;
    Formula.createFormula(name, description, units, intermediate).then(function(form) {
      formula = form;
      if (intermediate) {
        return Ingredient.createIngredientIntermediate(name, ingInfo.package, ingInfo.temperature, ingInfo.nativeUnit, ingInfo.unitsPerPackage)
      } else {
        return FinalProduct.createFinalProduct(name);
      }
    }).then(function(result) {
      resolve(formula);
    }).catch(function(error) {
      reject(error);
    })
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
      resolve(result);
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

/*module.exports.deleteTuples = function(ingredient) {
  return new Promise(function(resolve, reject) {
    var formQuery = Formula.getAllFormulas();
    formQuery.then(function(formulas) {
      var promises = [];
      for (let formula of formulas) {
        var tuples = formula.tuples;
        for (let tuple of tuples) {
          if (tuple.ingredient === ingredient) {
            promises.push(exports.removeTuple(formula.name, tuple.ingredient));
          }
        }
      }
      return Promise.all(promises);
    }).then(function(results) {
      resolve(results);
    }).catch(function(error){
      reject(error);
    })
  });
}*/

module.exports.updateTuples = function(ingredient, ingredientID) {
  return new Promise(function(resolve, reject) {
    var formQuery = Formula.getAllFormulas();
    formQuery.then(function(formulas) {
      var promises = [];
      for (let formula of formulas) {
        var tuples = formula.tuples;
        for (let tuple of tuples) {
          if (tuple.ingredientID.toString() === ingredientID.toString() && tuple.ingredient !== ingredient) {
            promises.push(exports.updateTuple(formula.name, tuple.index, tuple.ingredientID, tuple.quantity));
          }
        }
      }
      return Promise.all(promises);
    }).then(function(results) {
      resolve(results);
    }).catch(function(error){
      reject(error);
    })
  });
}

module.exports.addTuple = function(name, index, ingredientID, quantity) {
  return new Promise(function(resolve,reject){
    var formula;
    var formQuery = Formula.findFormulaByName(name);
    formQuery.then(function(form){
      if(form==null){
        var error = new Error('Specified formula doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      formula = form;
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
      /*for (let tuple of formula.tuples) {
        if (tuple.ingredientID.toString() === ingredientID) {
          var newQuantity = tuple.quantity + Number(quantity);
          return Formula.updateTuple(name, tuple.index, tuple.ingredientID, newQuantity);
        }
      }*/
      return Formula.addTuple(name,index,ingResult.name,ingredientID,quantity);
    }).then(function(formula) {
      resolve(formula);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.removeTuple = function(name, ingredient){
  return new Promise(function(resolve,reject){
    var result = Formula.removeIngredient(name,ingredient);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.removeTupleById = function(name, id){
  return new Promise(function(resolve,reject){
    var formula = Formula.findFormulaByName(name);
    formula.then(function(form) {
      if(form.tuples.length == 1){
        var error = new Error('A formula must contain at least one {ingredient, quantity} tuple.');
        error.status = 400;
        throw(error);
      }
      var promises = [];
      var index;
      for (let tuple of form.tuples) {
        if (tuple.ingredientID.toString() === id.toString()) {
          index = tuple.index;
          break;
        }
      }
      console.log("INDEX = " + index);
      for (let tuple of form.tuples) {
        if (tuple.index > index) {
          var newIndex = tuple.index - 1;
          console.log("new index = " + newIndex);
          promises.push(exports.updateTuple(name, newIndex, tuple.ingredientID, tuple.quantity));
        }
      }
      return Promise.all(promises);
    }).then(function(results) {
      return Formula.removeTupleById(name,id);
    }).then(function(success) {
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.updateTuple = function(name, index, ingredientID, quantity){
  console.log("ingredient = " + ingredientID);
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
      var ingQuery = Ingredient.getIngredientById(ingredientID);
      return ingQuery;
    }).then(async function(ingResult) {
      if (ingResult == null) {
        var error = new Error('The ingredient does not exist!');
        error.status = 400;
        throw(error);
      }
      var tuples = formula.tuples;
      for (i = 0; i < tuples.length; i++) {
        let tuple = tuples[i];
        if (ingResult['_id'].toString() === tuple['ingredientID'].toString()) {
          if (quantity != tuple.quantity) {
            quantity = Number(quantity) + tuple.quantity;
            index = tuple.index;
          }
          console.log("new index = " + index);
          return Formula.updateTuple(name, index, tuple.ingredient, ingResult['name'], ingredientID, quantity);
        } else {
          if (index == tuple.index) {
            console.log(tuple.ingredient);
            await Formula.removeTuple(name, tuple.ingredient);
          }
        }
      }
      console.log("add");
      return Formula.addTuple(name, index, ingResult['name'], ingredientID, quantity);
    }).then(function(tuple) {
      resolve(tuple);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.createListOfTuples = function(formulaName, amount) {
  return new Promise(function(resolve, reject) {
    Formula.findFormulaByName(formulaName).then(function(formula) {
      let units = parseFloat(amount) / parseFloat(formula.units);
      let tuples = formula.tuples;
      let total = [];
      for (let tuple of tuples) {
        let newTuple = {};
        newTuple['id'] = tuple['ingredientID']
        newTuple['amount'] = units*parseFloat(tuple['quantity']);
        total.push(newTuple);
      }
      resolve(total);
    }).catch(function(error) {
      reject(error);
    })
  })
}
