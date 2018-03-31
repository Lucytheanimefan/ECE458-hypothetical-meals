var Log = require('../models/log');
var ProductionLine = require('../models/production_line');
var express = require('express');
var router = express.Router();

// Managers will be able to update the mapping between formulas and production
// lines; this should be possible either from a view of the formula 
// (by indicating which production lines) or from a view of the production line 
// (by indicating which formulas).


// Get a single production line
router.get('/production_line/:name', function(req, res, next) {
  var query = ProductionLine.getProductionLine();
  console.log(prodLine);
  query.then(function(productionLine) {
    console.log(productionLine);
    res.render("production_line", productionLine: productionLine);
  }).catch(function(error) {
  	console.log(error);
    return next(error);
  })
})


// Create
router.post('/new', function(req, res, next) {
  let name = req.body.name;
  let description = req.body.description;
  let formulas = req.body.formulas;
  let info = { "name": name, "description": description, "formulas": formulas };
  var create = ProductionLine.create(info)
  create.then(function(productionLine) {
    logs.makeLog('Create production line', 'Created production line <a href="/production_lines/' + productionLine.name + '">' + productionLine.name + '</a>', req.session.username);
    return res.redirect(req.baseUrl + '/production_line/' + productionLine.name);
  }).catch(function(error) {
  	console.log(error);
    next(error);
  });
})