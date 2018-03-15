var express = require('express');
var router = express.Router();
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var IngredientHelper = require('../helpers/ingredients');
var Ingredient = require('../models/ingredient');
var Production = require('../models/production');
var underscore = require('underscore');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));

router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/');
})

router.get('/home/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  Formula.model.find({}, null, { skip: (perPage * page) - perPage, limit: perPage }, function(error, formulas) {
    if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      var ingredients = [];
      var ingQuery = Ingredient.getAllIngredients();
      ingQuery.then(function(result) {
        for (let ing of result) {
          ingredients.push({ _id: ing._id, name: ing.name });
        }
        for (let formula of formulas) {
          formula.tuples = underscore.sortBy(formula.tuples, "index");
        }
        res.render('formulas', { formulas: formulas, ingredients: ingredients, page: page });
      }).catch(function(error) {
        reject(error);
      })
    }
  })
});

router.get('/:name', function(req, res, next) {
  var formQuery = Formula.findFormulaByName(req.params.name);
  var formula;
  formQuery.then(function(form) {
    formula = form;
    var ingQuery = Ingredient.getAllIngredients();
    return ingQuery;
  }).then(function(result) {
    var ingredients = [];
    for (let ing of result) {
      ingredients.push({ _id: ing._id, name: ing.name });
    }
    formula.tuples = underscore.sortBy(formula.tuples, "index");
    res.render('formula', { formula: formula, ingredients: ingredients });
  }).catch(function(error) {
    next(error)
  });
})

router.post('/:name/delete', function(req, res, next) {
  let name = req.params.name;
  var promise = FormulaHelper.deleteFormula(name);
  promise.then(function(result) {
    logs.makeLog('Delete formula', JSON.stringify({formula:{name: name}}), ['formula'], req.session.userId);
    res.redirect(req.baseUrl + '/');
  }).catch(function(error) {
    next(error);
  });
})

router.post('/:name/update', function(req, res, next) {
  let name = req.params.name;
  let newName = req.body.name;
  let description = req.body.description;
  let units = req.body.units;
  var promise = Formula.findFormulaByName(name);
  var body = req.body;
  delete body['name'];
  delete body['description'];
  delete body['units'];
  var length = Object.keys(body).length;
  console.log(body);
  promise.then(function(formula) {
    return FormulaHelper.updateFormula(name, newName, description, units);
  }).then(async function(result) {
    var index = 1;
    var count = 1;
    var ingredient, quantity;
    while (req.body["ingredient" + index] != undefined || count <= length/2) {
      if (req.body["ingredient" + index] != undefined) {
        ingredient = req.body["ingredient" + index];
        quantity = req.body["quantity" + index];
        await FormulaHelper.updateTuple(newName, count, ingredient, quantity);
        count = count + 1;
      }
      index = index + 1;
    }
    //return Promise.all(tuplePromises);
  }).then(function(result) {
    logs.makeLog('Update formula', JSON.stringify({formula_name:newName}), ['formula'], req.session.userId);
    res.redirect(req.baseUrl + '/' + newName);
  }).catch(function(error) {
    next(error);
  });
})

router.post('/:name/order', function(req, res, next) {
  let formulaName = req.params.name;
  let amount = parseFloat(req.body.quantity);
  FormulaHelper.createListOfTuples(formulaName, amount).then(function(total) {
    return Promise.all(total.map(function(ingTuple) {
      return IngredientHelper.compareAmount(mongoose.Types.ObjectId(ingTuple['id']), ingTuple['amount']);
    }));
  }).then(function(results) {
    var tuples = [];
    for (let object of results) {
      let orderAmount = parseFloat(object.neededAmount) - parseFloat(object.currentAmount);
      if (orderAmount > 0) {
        let tuple = {};
        tuple['ingredient'] = object.ingredient;
        tuple['orderAmount'] = orderAmount;
        tuples.push(tuple);
      }
    }
    res.render('formula-confirmation', { formula: formulaName, formulaObjects: results, orderAmounts: tuples, amount: amount });
  }).catch(function(error) {
    next(error);
  });
})

//TODO: production logging
router.post('/:name/order/:amount', function(req, res, next) {
  let formulaName = req.params.name;
  let amount = parseFloat(req.params.amount);
  var formulaId;
  Formula.findFormulaByName(formulaName).then(function(formula) {
    formulaId = mongoose.Types.ObjectId(formula['_id']);
    return Promise.all([FormulaHelper.createListOfTuples(formulaName, amount), Production.updateReport(formulaId, formulaName, amount, 0)]);
  }).then(function(results) {
    let total = results[0];
    return Promise.all(total.map(function(ingTuple) {
      return IngredientHelper.sendIngredientsToProduction(formulaId, mongoose.Types.ObjectId(ingTuple['id']), parseFloat(ingTuple['amount']));
    }));
  }).then(function(results) {
    logs.makeLog('Log formula for production log', JSON.stringify(results), ['formula'], req.session.userId);
    res.redirect('/formulas');
  }).catch(function(error) {
    next(error);
  });
})

router.post('/:name/delete_tuple', function(req, res, next) {
  let name = req.body.name;
  let id = req.body.id;
  console.log("name = " + name);
  var promise = FormulaHelper.removeTupleById(name, id);
  promise.then(function(results) {
    res.send({'success':true});
  }).catch(function(error) {
    console.log(error);
    res.send({'success':false, 'error': error});
  })
})

router.post('/new', async function(req, res, next) {
  let name = req.body.name;
  let description = req.body.description;
  let units = req.body.units;
  var body = req.body;
  delete body['name'];
  delete body['description'];
  delete body['units'];
  var length = Object.keys(body).length;
  var promise = FormulaHelper.createFormula(name, description, units);
  console.log(body);
  promise.then(async function(result) {
    var index = 1;
    var count = 1;
    var ingredient, quantity;
    while (req.body["ingredient" + index] != undefined || count <= length/2) {
      if (req.body["ingredient" + index] != undefined) {
        ingredient = req.body["ingredient" + index];
        quantity = req.body["quantity" + index];
        await FormulaHelper.updateTuple(name, count, ingredient, quantity);
        count = count + 1;
      }
      index = index + 1;
    }
  }).then(function(formula) {
    logs.makeLog('Create formula', JSON.stringify({formula_name:name}), ['formula'], req.session.userId);
    res.redirect(req.baseUrl + '/' + name);
  }).catch(function(error) {
    next(error);
  });
})

module.exports = router;
