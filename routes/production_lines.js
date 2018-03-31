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
router.post('/update/:id', function(req, res, next) {
  console.log('UPDATE!');
  let id = req.params.id
  let name = req.body.name;
  let description = req.body.description;
  var formulas = req.body.formulas;
  console.log(formulas);
  if (Array.isArray(formulas)) {
    formulas = formulas.map(function(element) {
      return mongoose.Types.ObjectId(element);
    })
  } else if ((typeof formulas === 'string' || formulas instanceof String)) {
    formulas = [mongoose.Types.ObjectId(formulas)];
  }
  console.log('----Formulas to update with!: ' + formulas);
  //console.log(formulas);
  let info = { 'name': name, 'description': description, 'formulas': formulas };
  console.log('Time to update production line');
  var update = ProductionLine.updateProductionLine(id, info);
  update.then(function(productionLine) {
  	console.log("Updated production line: ");
  	console.log(productionLine);
    logs.makeLog('Update production line', 'Updated production line <a href="/production_lines/' + productionLine.name + '">' + productionLine.name + '</a>', req.session.username);
    return res.redirect(req.baseUrl + '/production_line/' + productionLine.name);
  }).catch(function(error) {
    console.log(error);
    next(error);
  });
})


// Create
router.post('/new', function(req, res, next) {
  let name = req.body.name;
  let description = req.body.description;
  var formulas = req.body.formulas;
  formulas = formulas.map(function(element) {
    return mongoose.Types.ObjectId(element);
  })
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

module.exports = router;