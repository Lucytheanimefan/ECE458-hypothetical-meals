var path = require('path');
var logs = require(path.resolve(__dirname, './logs.js'));
var ProductionLine = require('../models/production_line');
var Formula = require('../models/formula');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

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
  let busy = req.body.busy;
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
  var info = { 'name': name, 'description': description, 'busy': busy };
  console.log('Time to update production line');

  var prodLineQuery = ProductionLine.getProductionLineById(id);

  // var existingFormulas = [];
  // var formulasToAdd = formulas;
  prodLineQuery.then(function(productionLine) {
    info['formulas'] = formulas;
    return ProductionLine.updateProductionLine(id, info);
  }).then(function(updatedProductionLine) {
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
    logs.makeLog('Create production line', 'Created production line <a href="/production_lines/' + productionLine.name + '">' + productionLine.name + '</a>', req.session.username);
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
  var productionLineUpdateQuery = ProductionLine.updateProductionLine(productionLineId, updateInfo);

  productionLineUpdateQuery.then(function(prodLine) {
    var prodLineUpdatHistoryQuery = ProductionLine.updateHistory(productionLineId, 'idle');
    return prodLineUpdatHistoryQuery;
  }).then(function(prodLine) {
    res.redirect(req.baseUrl + '/production_line/id/' + productionLineId);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

module.exports = router;