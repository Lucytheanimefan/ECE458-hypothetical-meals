var express = require('express');
var router = express.Router();
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var FinalProductHelper = require('../helpers/final_products');
var IngredientHelper = require('../helpers/ingredients');
var Ingredient = require('../models/ingredient');
var InventoryHelper = require('../helpers/inventory');
var Production = require('../models/production');
var Completed = require('../models/completed_production');
var ProductionLine = require('../models/production_line');
var Recall = require('../models/recall');
var Profit = require('../models/profitability');
var underscore = require('underscore');
var mongoose = require('mongoose');
var uniqid = require('uniqid');
mongoose.Promise = global.Promise;

var min = 10000000
var max = 1000000000

var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));

router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/');
})


router.get('/id/:id', function(req, res, next) {
  console.log("Find formula by id: " + req.params.id);
  var formQuery = Formula.findFormulaById(req.params.id);
  formQuery.then(function(formula) {
    console.log(formula);
    return res.send(formula);
  }).catch(function(error) {
    console.log(error);
    next(error)
  });
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
      var report;
      Completed.getProducts({}).then(function(result) {
        report = result;
        return ingQuery;
      }).then(function(result) {
        for (let ing of result) {
          ingredients.push({ _id: ing._id, name: ing.name });
        }
        for (let formula of formulas) {
          formula.tuples = underscore.sortBy(formula.tuples, "index");
        }

        var maxPage = false;
        if (formulas.length < perPage) {
          maxPage = true;
        }
        res.render('formulas', { formulas: formulas, ingredients: ingredients, page: page, report: report, maxPage: maxPage });
      }).catch(function(error) {
        console.log(error);
        next(error);
      })
    }
  })
});

router.get('/:name', function(req, res, next) {
  var formQuery = Formula.findFormulaByName(req.params.name);
  var formIngQuery = Ingredient.getIngredient(req.params.name);
  var formula;
  var ing;
  var productionLines = [];
  var ingredients = [];
  Promise.all([formQuery, formIngQuery]).then(function(result) {
    formula = result[0];
    ing = result[1];

    // Get the production lines associated with this formula
    var productionLineQuery = ProductionLine.productionLinesForFormula(formula._id);
    return productionLineQuery;
  }).then(function(prodLines) {
    console.log('ProdLines:');
    console.log(prodLines);
    productionLines = prodLines;
    var ingQuery = Ingredient.getAllIngredients();
    return ingQuery;
  }).then(function(result) {
    for (let ing of result) {
      ingredients.push({ _id: ing._id, name: ing.name });
    }
    var allProductionLines = ProductionLine.getAllProductionLines();
    return allProductionLines;
  }).then(function(allProdLines) {
    console.log('All production lines:');
    console.log(allProdLines);
    formula.tuples = underscore.sortBy(formula.tuples, "index");
    res.render('formula', { formula: formula, ingredients: ingredients, ing: ing, productionLines: productionLines, allProductionLines: allProdLines });
  }).catch(function(error) {
    console.log(error);
    next(error)
  });
})

router.post('/:name/delete', function(req, res, next) {
  let name = req.params.name;
  var promise = FormulaHelper.deleteFormula(name);
  promise.then(function(result) {
    logs.makeLog('Delete formula', 'Deleted <a href="/formulas/' + encodeURIComponent(name) + '">' + name + '</a>', req.session.username);
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
  let package = req.body.package;
  let temperature = req.body.temperature;
  let nativeUnit = req.body.nativeUnit;
  let unitsPerPackage = req.body.unitsPerPackage;
  var body = req.body;
  delete body['name'];
  delete body['description'];
  delete body['units'];
  delete body['package'];
  delete body['temperature'];
  delete body['nativeUnits'];
  delete body['unitsPerPackage'];
  var promise = Formula.findFormulaByName(name);
  var length = Object.keys(body).length;
  console.log(body);
  promise.then(function(formula) {
    return Promise.all([FormulaHelper.updateFormula(name, newName, description, units),
      IngredientHelper.updateIngredient(name, newName, package, temperature, nativeUnit, unitsPerPackage)]);
  }).then(async function(result) {
    var index = 1;
    var count = 1;
    var ingredient, quantity;
    while (req.body["ingredient" + index] != undefined || count <= length / 2) {
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
    logs.makeLog('Update formula', 'Updated ' + '<a href="/formulas/' + encodeURIComponent(newName) + '">' + newName + '</a>' /*JSON.stringify({formula_name:newName})*/ , req.session.username);
    res.redirect(req.baseUrl + '/' + newName);
  }).catch(function(error) {
    next(error);
  });
})

router.post('/:name/order', function(req, res, next) {
  let formulaName = req.params.name;
  let amount = parseFloat(req.body.quantity);

  var alertMessage;
  var formulaObject;
  var formulaObjects;
  var tuples = [];
  FormulaHelper.createListOfTuples(formulaName, amount).then(function(result) {
    var total = result['total'];
    formulaObject = result['formula'];
    console.log('Formula object:');
    console.log(formulaObject);
    return Promise.all(total.map(function(ingTuple) {
      return IngredientHelper.compareAmount(mongoose.Types.ObjectId(ingTuple['id']), ingTuple['amount']);
    }));
  }).then(function(results) {
    for (let object of results) {
      if (object.intermediate && !object.enough) {
        throw new Error('Need to produce ' + (parseFloat(object.neededAmount) - parseFloat(object.currentAmount))+ ' more units of intermediate product ' + object.ingredient);
      }
      let orderAmount = parseFloat(object.neededAmount) - parseFloat(object.currentAmount);
      if (orderAmount > 0) {
        let tuple = {};
        tuple['ingredient'] = object.ingredient;
        tuple['orderAmount'] = orderAmount;
        tuples.push(tuple);
      }
    }
    formulaObjects = results;
    var productionLineQuery = ProductionLine.productionLinesForFormula(formulaObject._id);
    return productionLineQuery;
  }).then(function(productionLines) {
    for (let i=0; i<productionLines.length; i++){
      if (!productionLines[i].busy){
        break
      }
      if (i==productionLines.length-1){
        alertMessage = "No available production lines";
      }
    }
    res.render('formula-confirmation', { formulaName: formulaName, formula: formulaObject, formulaObjects: formulaObjects, orderAmounts: tuples, amount: amount, productionLines: productionLines, alert:alertMessage });
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})

//TODO: production logging
router.post('/:name/order/:amount', function(req, res, next) {
  var productionLineId = req.body.productionLine;
  var formulaName = req.params.name;
  let amount = parseFloat(req.params.amount);
  var formulaId;
  var globalFormula;
  var formulaLot;
  var lotsConsumed;
  var lotNumber = uniqid();


  Formula.findFormulaByName(formulaName).then(function(formula) {
    globalFormula = formula;
    return Ingredient.getIngredient(formulaName);
  }).then(function(ing) {
    if (!globalFormula.intermediate) {
      return Profit.createEntry(formulaName);
    } else {
      return InventoryHelper.checkInventory(ing.name, ing.package, ing.temperature, ing.unitsPerPackage, parseFloat(ing.amount) + amount);
    }
  }).then(function(update) {
    if (update) {
      return globalFormula;
    } else {
      throw new Error('Not enough room in inventory to produce ' + formulaName);
    }
  }).then(function(formula) {
    formulaId = mongoose.Types.ObjectId(formula['_id']);
    return Promise.all([FormulaHelper.createListOfTuples(formulaName, amount), Production.updateReport(formulaId, formulaName, amount, 0), Completed.createLotEntry(formula.name, lotNumber, formula.intermediate)]);
  }).then(function(result) {
    var results = result[0];
    console.log('Results:');
    console.log(results);
    var totals = results['total'];
    console.log('TOTALS');
    console.log(totals);
    return Promise.all(totals.map(function(ingTuple) {
      return IngredientHelper.sendIngredientsToProduction(formulaId, mongoose.Types.ObjectId(ingTuple['id']), parseFloat(ingTuple['amount']), lotNumber);
    }));
  }).then(function(results) {
    lotsConsumed = [].concat.apply([], results);
    logs.makeLog('Production', 'Send ingredients to production', req.session.username);
    var prodLineQuery = ProductionLine.getProductionLineById(productionLineId);
    return prodLineQuery;
  }).then(function(productionLine) {
    console.log(productionLine);
    if (productionLine == null) {
      let err = new Error('No production line found');
      return next(err);
    }
    //let productionLine = productionLines[0];
    console.log(productionLine);
    console.log('Busy?');
    console.log(productionLine.busy);
    console.log(typeof(productionLine.busy));
    if (!productionLine.busy) {
      console.log('Not busy, add product to production line');
      console.log(lotsConsumed);
      var addProductQuery = ProductionLine.addProductToProductionLine(productionLineId, formulaId, formulaName, amount, lotNumber, lotsConsumed);
      return addProductQuery;
    } else {
      let err = new Error('That production line is busy. You cannot add a product.');
      throw err;
    }
  }).then(function(productionLine) {
    logs.makeLog('Production', 'Send formula to production line', req.session.username);// TODO: link
    var historyQuery = ProductionLine.updateHistory(productionLineId, 'busy', formulaId);
    return historyQuery;
  }).then(function() {
    res.redirect('/formulas');
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})

router.post('/:name/delete_tuple', function(req, res, next) {
  let name = req.body.name;
  let id = req.body.id;
  console.log("name = " + name);
  console.log(id);
  var promise = FormulaHelper.removeTupleById(name, id);
  promise.then(function(results) {
    res.send({ 'success': true });
  }).catch(function(error) {
    console.log(error);
    res.send({ 'success': false, 'error': error });
  })
})

router.post('/new', async function(req, res, next) {
  let ingInfo = {}
  let name = req.body.name;
  let description = req.body.description;
  let units = req.body.units;
  ingInfo['package'] = req.body.package;
  ingInfo['temperature'] = req.body.temperature;
  ingInfo['nativeUnit'] = req.body.nativeUnit;
  ingInfo['unitsPerPackage'] = req.body.unitsPerPackage;
  let intermediate = (req.body.type == "intermediate");
  var body = req.body;
  delete body['name'];
  delete body['description'];
  delete body['units'];
  delete body['package'];
  delete body['temperature'];
  delete body['nativeUnits'];
  delete body['unitsPerPackage'];
  delete body['type']
  var length = Object.keys(body).length;
  var promise = FormulaHelper.createFormula(name, description, units, intermediate, ingInfo);
  console.log(body);
  promise.then(async function(result) {
    var index = 1;
    var count = 1;
    var ingredient, quantity;
    while (req.body["ingredient" + index] != undefined || count <= length / 2) {
      if (req.body["ingredient" + index] != undefined) {
        ingredient = req.body["ingredient" + index];
        quantity = req.body["quantity" + index];
        await FormulaHelper.updateTuple(name, count, ingredient, quantity);
        count = count + 1;
      }
      index = index + 1;
    }
  }).then(function(formula) {
    logs.makeLog('Create formula', 'Created <a href="/formulas/' + encodeURIComponent(name) + '">' + name + '</a>' /*JSON.stringify({formula_name:name})*/ , req.session.username);
    res.redirect(req.baseUrl + '/' + name);
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})


// Production line
router.post('/add_product/:formulaId/:formulaName/to_production_line', function(req, res, next) {
  console.log('Add production to production line!');
  var productionLineId = req.body.productionLine;
  var formulaId = req.params.formulaId;
  var formulaName = req.params.formulaName;

  var productionLineQuery = ProductionLine.getProductionLineById(productionLineId);
  productionLineQuery.then(function(productionLine) {
    console.log(productionLine);
    if (productionLine.busy == false) {
      var addProductQuery = ProductionLine.addProductToProductionLine(productionLineId, formulaId, formulaName);
      return addProductQuery;
    } else {
      let err = new Error('That production line is busy. You cannot add a product.')
      return next(err);
    }
  }).then(function(productionLine) {
    console.log(productionLine);
    var updateHistoryQuery = ProductionLine.updateHistory(productionLineId, 'busy', formulaId);
    return updateHistoryQuery;
  }).then(function(productionLine) {
    console.log('-------UPDATE PRODUCTION LINE HISTORY:');
    console.log(productionLine);
    res.redirect('/formulas');
  }).catch(function(error) {
    console.log(error);
    next(error);
  })
})

router.post('/completed_productions/view', function(req, res, next) {
  var startDate = req.body.start;
  var endDate = req.body.end;
  var product = req.body.product;
  var status = req.body.status;
  var query = {};
  console.log(startDate);
  console.log(endDate);
  if (startDate != '' && endDate != '') {
    query['_id'] = { "$gte": getObjectIdForTime(startDate), "$lte": getObjectIdForTime(endDate) };
  } else if (startDate != '') {
    query['_id'] = { "$gte": getObjectIdForTime(startDate) };
  } else if (endDate != '') {
    query['_id'] = { "$lte": getObjectIdForTime(endDate) };
  }
  if (product != null) {
    var search = '.*' + product + '.*'
    var expression = new RegExp(product, 'i')
    query['name'] = expression;
  }
  if (status != 'all') {
    query['inProgress'] = (status == 'inProgress');
  }
  Completed.getProducts(query).then(function(products) {
    res.render('completed_products', {report: products});
  }).catch(function(error) {
    next(error);
  })
})

getObjectIdForTime = function(dateString) {
  var date = new Date(dateString);
  var seconds = Math.floor(date/1000).toString(16)
  console.log(date.getTime());
  return mongoose.Types.ObjectId(seconds + "0000000000000000");
}





module.exports = router;