var express = require('express');
var router = express.Router();
var Formula = require('../models/formula');
var Ingredient = require('../models/ingredient');
var FormulaHelper = require('../helpers/formula');
var mongoose = require('mongoose');

router.get('/:page?', function(req, res, next) {
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

router.post('/new', function(req, res, next) {

});

module.exports = router;
