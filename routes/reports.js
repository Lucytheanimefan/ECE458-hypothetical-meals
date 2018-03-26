var express = require('express');
var router = express.Router();

var Spending = require('../models/spending');
var Production = require('../models/production');
var Formula = require('../models/formula');
var Freshness = require('../models/freshness');
var Ingredient = require('../models/ingredient');

var mongoose = require('mongoose')
mongoose.Promise = global.Promise;

router.get('/', function(req, res, next) {
  res.redirect('/reports/1');
})

router.get('/:page', function(req, res, next) {
  var spendingReport;
  var productionReport;
  var formulaReport;
  var ingredientReport;

  var spending;
  var production;
  var formula;
  var ingredient;

  Promise.all([Spending.getSpending(), Spending.getProduction(), Production.getProduction(), Freshness.getIngredients()]).then(function(results) {
    spendingReport = results[0];
    productionReport = results[1];
    formulaReport = results[2];
    ingredientReport = results[3];

    spendingPromise = Promise.all(spendingReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
    productionPromise = Promise.all(productionReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
    formulaPromise = Promise.all(formulaReport.product.map(function(tuple) {
      return getFormulaName(tuple);
    }));
    ingredientPromise = Promise.all(ingredientReport.ingredients.map(function(tuple) {
      return getIngredientFreshnessName(tuple);
    }));
    return Promise.all([spendingPromise, productionPromise, formulaPromise, ingredientPromise]);
  }).then(function(results) {
    res.render('report', {spending: results[0], production: results[1], formula: results[2], ingredient: results[3]});
  }).catch(function(error) {
    next(error);
  })
})

getFormulaName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['totalCost'] = tuple.totalCost;
    entry['unitsProduced'] = tuple.unitsProduced;
    Formula.model.findById(mongoose.Types.ObjectId(tuple.formulaId)).then(function(formula) {
      if (formula == null) {
        entry['formula'] = tuple.formulaName;
      } else {
        entry['formula'] = formula.name;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getIngredientName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['totalSpent'] = tuple.totalSpent;
    Ingredient.getIngredientById(mongoose.Types.ObjectId(tuple.ingredientId)).then(function(ing) {
      if (ing == null) {
        entry['ingredient'] = tuple.ingredientName;
      } else {
        entry['ingredient'] = ing.name;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getIngredientFreshnessName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['numIngs'] = tuple.numIngs;
    entry['avgTime'] = tuple.avgTime;
    entry['worstTime'] = tuple.worstTime;
    Ingredient.getIngredientById(mongoose.Types.ObjectId(tuple.ingredientId)).then(function(ing) {
      if (ing == null) {
        entry['ingredients'] = tuple.ingredientName;
      } else {
        entry['ingredients'] = ing.name;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports = router;
