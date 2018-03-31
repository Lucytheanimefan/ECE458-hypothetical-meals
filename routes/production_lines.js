var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var ProductionLine = require('../models/production_line');
var express = require('express');
var router = express.Router();

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
  var query = ProductionLine.paginate({}, perPage, page);
  query.then(function(productionLines) {
  	var maxPage = false;
  	if (productionLines.length < perPage){
  		maxPage = true;
  	}
    console.log(productionLines);
    res.render("production_lines", { productionLines: productionLines, page: page, maxPage: maxPage });
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

// Get a single production line
router.get('/production_line/:name', function(req, res, next) {
  var query = ProductionLine.getProductionLine(req.params.name);
  query.then(function(productionLine) {
    console.log(productionLine);
    res.render("production_line", { productionLine: productionLine });
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