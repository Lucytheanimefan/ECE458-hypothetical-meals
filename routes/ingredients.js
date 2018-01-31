var express = require('express');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var users = require('./users');


var packageTypes = ['Sack', 'Pail', 'Drum', 'Supersack', 'Truckload', 'Railcar'];
var temperatures = ['frozen', 'refrigerated', 'room temperature'];

//GET request to show available ingredients
router.get('/', function(req, res, next) {
  Ingredient.find({}, function(error, ings) {
    if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
    }
  })
})

router.get('/search_results', function(req, res, next) {
  var query = Ingredient.find();
  if (req.query.name != null) {
    var name = req.query.name;
    var search = '.*' + name + '.*'
    query.where({name: new RegExp(search)});
  }
  if (req.query.package != null) {
    query.where('package').in(req.query.package);
  }
  if (req.query.temperature != null) {
    query.where('temperature').in(req.query.temperature);
  }
  query.exec(function(error, ings) {
    if (error) {
      var err = new Error('Error during search');
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
    }
  })
})

router.get('/:name', function(req, res, next) {
  Ingredient.findOne({ name: req.params.name }, function(error, ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredient', { ingredient: ing, packages: packageTypes, temps: temperatures });
    }
  })
})

router.all('/admin/*', users.requireRole('admin'), function(req, res, next) {
  next();
})

//POST request to delete an existing ingredient
router.post('/admin/:name/delete', function(req, res, next) {
  Ingredient.findOneAndRemove({ name: req.params.name }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that ingredient.');
      err.status = 400;
      return next(err);
    } else {
      //alert user the ingredient has been deleted.
      return res.redirect(req.baseUrl);
    }
  });
});


router.post('/admin/:name/update', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  Ingredient.findOneAndUpdate({ name: req.params.name }, {
    $set: {
      name: ingName,
      package: req.body.package,
      temperature: req.body.temperature,
      amount: req.body.amount
    }
  }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t update that ingredient.');
      err.status = 400;
      return next(err);
    } else {
      return res.redirect(req.baseUrl + '/' + ingName);
    }
  });
});

//POST request to create a new ingredient
router.post('/admin/new', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  Ingredient.create({
    name: ingName,
    package: req.body.package,
    temperature: req.body.temperature,
    amount: req.body.amount
  }, function(error, newInstance) {
    if (error) {
      return next(error);
    } else {
      return res.redirect(req.baseUrl + '/' + ingName);
      //alert user the ingredient has been successfully added.
    }
  });
});

//PUT request to update an existing ingredient
// router.post('/update/', function(req, res) {
//   Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
// });

module.exports = router;