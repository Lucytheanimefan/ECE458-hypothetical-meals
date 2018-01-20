var express = require('express');
var router = express.Router();
var Ingredient = require('../models/ingredient');

//GET request to show available ingredients
router.get('/', function(req, res) {
  res.render('ingredients');
})

router.get('/:name', function(req, res, next) {
  Ingredient.findOne({name: req.params.name}, function(error, ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredient', { ingredient: ing })
    }
  })
})

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  Ingredient.create({
    name: req.body.name,
    package: req.body.package,
    temperature: req.body.temperature,
    amount: req.body.amount
  }, function (error, newInstance) {
    if (error) {
      return next(error);
    } else {
      return res.redirect(req.baseUrl + '/' + req.body.name)
      //alert user the ingredient has been successfully added.
    }
  });
});

//PUT request to update an existing ingredient
router.put('/update', function(req, res) {
  Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
});

//DELETE request to delete an existing ingredient
router.delete('/delete', function(req, res, next) {
  Ingredient.findOneAndDelete({name: req.body.name}, function(error, result) {
    if (error) {
      return next(error);
    } else {
      //alert user the ingredient has been deleted.
    }
  });
});

module.exports = router;