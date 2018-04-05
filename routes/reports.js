var express = require('express');
var router = express.Router();

var Spending = require('../models/spending');
var Production = require('../models/production');
var Formula = require('../models/formula');
var Freshness = require('../models/freshness');
var Ingredient = require('../models/ingredient');
var Recall = require('../models/recall');

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
  var overallFreshness;

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
    ingredientPromise = Promise.all(ingredientReport.freshness.map(function(tuple) {
      return getIngredientFreshnessName(tuple);
    }));
    overallFreshness = getOverallFreshness(ingredientReport);
    return Promise.all([spendingPromise, productionPromise, formulaPromise, ingredientPromise]);
  }).then(function(results) {
    res.render('report', {spending: results[0], production: results[1], formula: results[2], ingredient: results[3], freshness: overallFreshness});
  }).catch(function(error) {
    next(error);
  })
})

router.post('/recall', function(req, res, next) {
  let vendorCode = req.body.code;
  let lotNumber = req.body.lotNumber;
  let ingName = req.body.name;

  Recall.getRecallProducts(ingName, vendorCode, lotNumber).then(function(products) {
    return Promise.all(products.map(function(tuple) {
      return addFormulaNameRecall(tuple);
    }));
  }).then(function(results) {
    res.render('recall', {ingName: ingName, vendorCode: vendorCode, lotNumber: lotNumber, products: results});
  }).catch(function(error) {
    next(error);
  })

})

addFormulaNameRecall = function(tuple) {
  return new Promise(function(resolve, reject) {
    Formula.model.findById(tuple.formulaID).then(function(formula) {
      if (formula == null) {
        tuple['current'] = false;
      } else {
        tuple['current'] = true;
      }
      tuple['timestamp'] = mongoose.Types.ObjectId(tuple['_id']).getTimestamp().toString();
      return tuple;
    }).then(function(tuple) {
      resolve(tuple);
    }).catch(function(error) {
      reject(error);
    })
  })
}

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

getOverallFreshness = function(report) {
  console.log(report);
  var entry = {};
  var avgTime = convertTime(report.avgTime);
  var worstTime = convertTime(report.worstTime);
  entry['numIngs'] = report.numIngs;
  entry['avgTime'] = avgTime;
  entry['worstTime'] = worstTime;
  return entry;
}

getIngredientFreshnessName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    var avgTime = convertTime(tuple.avgTime);
    var worstTime = convertTime(tuple.worstTime);
    entry['numIngs'] = tuple.numIngs;
    entry['avgTime'] = avgTime;
    entry['worstTime'] = worstTime;
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

convertTime = function(milliseconds) {
  var days = Math.floor(milliseconds/(1000*60*60*24));
  milliseconds = milliseconds % (1000*60*60*24);
  var hours = Math.floor(milliseconds/(1000*60*60));
  milliseconds = milliseconds % (1000*60*60);
  var minutes = Math.floor(milliseconds/(1000*60));
  milliseconds = milliseconds % (1000*60);
  var seconds = Math.floor(milliseconds/1000);
  milliseconds = milliseconds % (1000);

  var time = days + " days, " + hours + " hrs, " + minutes + " min, " + seconds + " sec";
  return time;
}

module.exports = router;
