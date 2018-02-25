var express = require('express');
var router = express.Router();

var Spending = require('../models/spending');
var Production = require('../models/production');
var Formula = require('../models/formula');
var Ingredient = require('../models/ingredient');

var mongoose = require('mongoose')
mongoose.Promise = global.Promise;

router.get('/', function(req, res, next) {
  res.redirect('/1');
})

router.get('/:page', function(req, res, next) {
  var spendingReport;
  var productionReport;
  var formulaReport;
  var spending;
  var production;
  var formula;
  Promise.all([Spending.getSpending(), Spending.getProduction(), Production.getProduction()]).then(function(results) {
    spendingReport = results[0];
    productionReport = results[1];
    formulaReport = results[2];
    return Promise.all(spendingReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
  }).then(function(tuples) {
    spending = tuples;
    return Promise.all(productionReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
  }).then(function(tuples) {
    production = tuples;
  })
})

getIngredientName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['totalSpent'] = tuple.totalSpent;
    Ingredient.getIngredientById(mongoose.Types.ObjectId(tuple.ingredient)).then(function(ing) {
      entry['ingredient'] = ing.name;
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports = router;