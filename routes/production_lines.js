var path = require('path');
var logs = require(path.resolve(__dirname, './logs.js'));
var ProductionLine = require('../models/production_line');
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var FinalProductHelper = require('../helpers/final_products');
var Formula = require('../models/formula');
var Completed = require('../models/completed_production');
var Recall = require('../models/recall');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var min = 10000000
var max = 1000000000

// Managers will be able to update the mapping between formulas and production
// lines; this should be possible either from a view of the formula 
// (by indicating which production lines) or from a view of the production line 
// (by indicating which formulas).

router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/page/0');
})

router.get('/page/:page?', function(req, res, next) {
  var page = req.params.page;
  if (page == null) {
    page = 0;
  }
  var perPage = 10;
  var prodLineQuery = ProductionLine.paginate({}, perPage, page);
  var findAllFormulasQuery = Formula.model.find().exec();
  var allFormulas = [];
  findAllFormulasQuery.then(function(formulas) {
    if (formulas != null) {
      allFormulas = formulas;
    }
    return prodLineQuery;
  }).then(function(productionLines) {
    var maxPage = false;
    if (productionLines.length < perPage) {
      maxPage = true;
    }
    //console.log(productionLines);
    res.render('production_lines', { productionLines: productionLines, page: page, maxPage: maxPage, formulas: allFormulas });
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

router.get('/formulas/:formulaId', function(req, res, next) {
  var query = ProductionLine.productionLinesForFormula(req.params.formulaId);
  query.then(function(productionLines) {
    console.log(productionLines);
    res.send(productionLines);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

// Get a single production line
router.get('/production_line/:name', function(req, res, next) {
  var prodLineQuery = ProductionLine.getProductionLine(req.params.name);
  var findAllFormulasQuery = Formula.model.find().exec();
  var allFormulas = [];
  findAllFormulasQuery.then(function(formulas) {
    if (formulas != null) {
      allFormulas = formulas;
    }
    return prodLineQuery;
  }).then(function(productionLine) {
    console.log(productionLine);
    res.render('production_line', { productionLine: productionLine, formulas: allFormulas });
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

// Get a single production line
router.get('/production_line/id/:id', function(req, res, next) {
  var prodLineQuery = ProductionLine.getProductionLineById(req.params.id);
  var findAllFormulasQuery = Formula.model.find().exec();
  var allFormulas = [];
  findAllFormulasQuery.then(function(formulas) {
    if (formulas != null) {
      allFormulas = formulas;
    }
    return prodLineQuery;
  }).then(function(productionLine) {
    console.log(productionLine);
    res.render('production_line', { productionLine: productionLine, formulas: allFormulas });
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})


router.post('/add_lines_with_formula/:formulaName', function(req, res, next) {
  console.log('Call add_lines_with_formula');
  let productionLineId = req.body.productionLines;
  let formulaId = req.body.formulaId;
  var prodLineQuery = ProductionLine.addFormulaFromProductionLines(productionLineId, formulaId);
  prodLineQuery.then(function(productionLines) {
    console.log('Add lines to formula');
    console.log(productionLines);
    logs.makeLog('Add production line to formula', 'Add <a href="/production_lines/production_line/id/' + productionLineId + '">production line</a> to <a href="/formulas/' + req.params.formulaName + '">' + req.params.formulaName + '</a>', req.session.username);
    res.redirect('/formulas/' + req.params.formulaName);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

router.post('/delete_lines/:productionLineId/with_formula/:formulaName', function(req, res, next) {
  console.log('Call delete_lines_with_formula');
  let productionLineId = req.params.productionLineId;
  let formulaId = req.body.formulaId;
  var prodLineQuery = ProductionLine.deleteFormulaFromProductionLines(productionLineId, formulaId);
  prodLineQuery.then(function(productionLines) {
    console.log('Delete lines from formula');
    console.log(productionLines);
    logs.makeLog('Remove production line from formula', 'Delete <a href="/production_lines/production_line/id/' + productionLineId + '">production line</a> from <a href="/formulas/' + req.params.formulaName + '">' + req.params.formulaName + '</a>', req.session.username);
    res.redirect('/formulas/' + req.params.formulaName);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

// Update a single production line
router.post('/update/:id', function(req, res, next) {
  console.log('UPDATE!');
  let id = req.params.id
  let name = req.body.name;
  let description = req.body.description;
  //let busy = req.body.busy;
  var formulas = req.body.formulas;
  console.log(formulas);
  if (Array.isArray(formulas)) {
    formulas = formulas.map(function(element) {
      return { "formulaId": mongoose.Types.ObjectId(element) };
    })
  } else if ((typeof formulas === 'string' || formulas instanceof String)) {
    formulas = [{ "formulaId": mongoose.Types.ObjectId(formulas) }];
  }
  console.log('----Formulas to update with!: ' + formulas);
  //console.log(formulas);
  var info = { 'name': name, 'description': description /*, 'busy': busy*/ };
  console.log('Time to update production line');

  var prodLineQuery = ProductionLine.getProductionLineById(id);

  // var existingFormulas = [];
  // var formulasToAdd = formulas;
  prodLineQuery.then(function(productionLine) {
    info['formulas'] = formulas;
    return ProductionLine.updateProductionLine(id, info);
  }).then(function(updatedProductionLine) {
    logs.makeLog('Update production line', 'Updated production line <a href="/production_lines/production_line/' + updatedProductionLine.name + '">' + updatedProductionLine.name + '</a>', req.session.username);
    res.redirect(req.baseUrl + '/production_line/' + updatedProductionLine.name);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })

})


// Create
router.post('/new', function(req, res, next) {
  let name = req.body.name;
  let description = req.body.description;
  var formulas = req.body.formulas;
  if (Array.isArray(formulas)) {
    formulas = formulas.map(function(element) {
      return { "formulaId": mongoose.Types.ObjectId(element) };
    })
  } else if ((typeof formulas === 'string' || formulas instanceof String)) {
    formulas = [{ "formulaId": mongoose.Types.ObjectId(formulas) }];
  }
  //console.log(formulas);
  let info = { 'name': name, 'description': description, 'formulas': formulas };
  var create = ProductionLine.createProductionLine(info);
  create.then(function(productionLine) {
    logs.makeLog('Create production line', 'Created production line <a href="/production_lines/production_line/' + productionLine.name + '">' + productionLine.name + '</a>', req.session.username);
    return res.redirect(req.baseUrl + '/production_line/' + productionLine.name);
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})

router.post('/delete/:id', function(req, res, next) {
  var deleteQuery = ProductionLine.deleteProductionLine(req.params.id);
  deleteQuery.then(function(productionLine) {
    logs.makeLog('Delete production line', 'Deleted production line ' + productionLine.name, req.session.username);
    return res.redirect(req.baseUrl);
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})

/**
 * TODO
 * Req 7.3.3
 * Managers should be able to select a production and mark it completed, viewing the resulting lot number (req 7.2.7) and causing the product to enter the appropriate inventory (req 7.2.8 for intermediates and 7.2.9 for final products).
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) {             } [description]
 * @return {[type]}       [description]
 */
router.post('/mark_completed/:id', function(req, res, next) {
  // TODO inventory stuff, etc.

  let productionLineId = req.params.id;
  var updateInfo = { 'busy': false, 'currentProduct': {} };
  var finishedFormula;
  var currentProdLine;
  var lotsConsumed;
  var productionLineName;
  var formulaLot;
  var totalCost = 0;
  ProductionLine.getProductionLineById(productionLineId).then(function(prodLine) {
    console.log("my prod line is");
    console.log(prodLine);
    productionLineName = prodLine.name;
    currentProdLine = prodLine;
    formulaLot = prodLine.currentProduct.lotNumber;
    lotsConsumed = prodLine.currentProduct.ingredientLots;
    return Formula.findFormulaById(prodLine.currentProduct.formulaId)
  }).then(function(formula) {
    finishedFormula = formula;
    console.log("my formula is");
    console.log(formula);
    return Completed.completeProduct(formulaLot);
  }).then(async function(result) {
    for (let lot of lotsConsumed) {
      await Recall.createLotEntry(lot.ingID, lot.ingName, lot.lotNumber, lot.vendorID);
    }
    console.log('---Finished creating lot entry for recall report');
    for (let lot of lotsConsumed) {
      console.log('--Lot consumed: ');
      console.log(lot)
      await Recall.updateReport(finishedFormula._id, formulaLot, finishedFormula.intermediate, lot.ingID, lot.lotNumber, lot.vendorID);
      console.log('Finished updating report');
      let price = lot.price ? lot.price : 0;
      totalCost += parseFloat(lot.amount) * parseFloat(price);
    }
    return Ingredient.getIngredient(finishedFormula.name);
  }).then(function(ing) {
    if (finishedFormula.intermediate) {
      console.log('Finished formula is an intermediate, increment amount');
      console.log('Calculate price:')
      console.log(totalCost + '/' + parseFloat(currentProdLine.currentProduct.amount));
      return IngredientHelper.incrementAmount(ing._id, parseFloat(currentProdLine.currentProduct.amount), 'admin', formulaLot, totalCost / parseFloat(currentProdLine.currentProduct.amount));
    } else {
      console.log('Add final product');
      return FinalProductHelper.addFinalProduct(finishedFormula.name, parseFloat(currentProdLine.currentProduct.amount));
    }
  }).then(function(result) {
    console.log('ProductionLine.updateProductionLine(productionLineId, updateInfo)');
    return ProductionLine.updateProductionLine(productionLineId, updateInfo);
  }).then(function(prodLine) {
    var prodLineUpdatHistoryQuery = ProductionLine.updateHistory(productionLineId, 'idle');
    return prodLineUpdatHistoryQuery;
  }).then(function(prodLine) {
    logs.makeLog('Mark production line completed', 'Mark <a href="/production_lines/production_line/id/' + productionLineId + '">' + productionLineName + '</a> as completed', req.session.username);

    var findAllFormulasQuery = Formula.model.find().exec();
    return findAllFormulasQuery;
  }).then(function(allFormulas) {
    return res.render('production_line', { productionLine: currentProdLine, formulas: allFormulas, alert: 'The lot number for this product is ' + formulaLot });
    //res.redirect(req.baseUrl + '/production_line/id/' + productionLineId);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})




module.exports = router;