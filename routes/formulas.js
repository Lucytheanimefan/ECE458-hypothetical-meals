var express = require('express');
var router = express.Router();
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var mongoose = require('mongoose');

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
      res.render('formulas', { formulas: formulas, page: page });
    }
  })
});

router.get('/:name', function(req, res, next) {
  var formQuery = Formula.findFormulaByName(req.params.name);
  formQuery.then(function(formula) {
    res.render('formula', { formula: formula });
  }).catch(function(error) {
    next(error)
  });
})

router.post('/:name/update', function(req, res, next) {
  let name = req.params.name;
  let newName = req.body.name;
  let description = req.body.description;
  let units = req.body.units;
  var promise = FormulaHelper.updateFormula(name, newName, description, units);
  promise.then(function() {
    var index = 1;
    var ingredient, quantity;
    let tuplePromises = [];
    while (req.body["ingredient"+index] != undefined) {
      ingredient = req.body["ingredient"+index];
      quantity = req.body["quantity"+index];
      tuplePromises.push(FormulaHelper.updateTuple(name, index, ingredient, quantity));
      index = index + 1;
    }
    return Promise.all(tuplePromises);
    res.redirect(req.baseUrl + '/' + name);
  }).catch(function(error) {
    next(error);
  });
})

router.post('/new', async function(req, res, next) {
  let name = req.body.name;
  let description = req.body.description;
  let units = req.body.units;
  var promise = FormulaHelper.createFormula(name, description, units);
  promise.then(function() {
    var index = 1;
    var ingredient, quantity;
    let tuplePromises = [];
    while (req.body["ingredient"+index] != undefined) {
      ingredient = req.body["ingredient"+index];
      quantity = req.body["quantity"+index];
      tuplePromises.push(FormulaHelper.addTuple(name, index, ingredient, quantity));
      index = index + 1;
    }
    return Promise.all(tuplePromises);
  }).then(function(results) {
    res.redirect(req.baseUrl + '/' + name);
  }).catch(function(error) {
    next(error);
  });
})

module.exports = router;
