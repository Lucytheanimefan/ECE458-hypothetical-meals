var express = require('express');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var users = require('./users');


var packageTypes = ['Sack', 'Pail', 'Drum', 'Supersack', 'Truckload', 'Railcar'];
var temperatures = ['Frozen', 'Refrigerated', 'Room temperature'];

//GET request to show available ingredients
router.get('/', function(req, res, next) {
  var query = Ingredient.find();
  query.then(function(ings) {
    res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
  }).catch(function(error) {
    var err = new Error('Error searching for ' + req.params.name);
    err.status = 400;
    next(err);
  });
})

router.get('/search_results', function(req, res, next) {
  var query = Ingredient.find();
  if (req.query.name != null) {
    var name = req.query.name;
    var search = '.*' + name + '.*'
    query.where({name: new RegExp(search, "i")});
  }
  if (req.query.package != null) {
    query.where('package').in(req.query.package.toLowerCase());
  }
  if (req.query.temperature != null) {
    query.where('temperature').in(req.query.temperature.toLowerCase());
  }
  query.then(function(ings) {
    res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
  }).catch(function(error) {
    var err = new Error('Error during search');
    err.status = 400;
    return next(err);
  });
})

router.get('/:name', function(req, res, next) {
  res.redirect(req.baseUrl + '/' + req.params.name + '/0');
})

router.get('/:name/:amt', function(req, res, next) {
  var ingQuery = Ingredient.findOne({ name: req.params.name });
  var venderQuery = Vendor.find({ 'catalogue.ingredient': req.params.name });
  var promise = ingQuery.exec();
  var ingredient;
  ingQuery.then(function(ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      throw err;
    }
    ingredient = ing;
    return venderQuery;
  }).then(function(vendors) {
    return createCatalogue(vendors, req.params.name);
  }).then(function(catalogue) {
    res.render('ingredient', { ingredient: ingredient, packages: packageTypes, temps: temperatures, vendors: catalogue , amount: req.params.amt});
  }).catch(function(error) {
    next(error)
  });
})

//POST request to delete an existing ingredient
router.post('/:name/delete', function(req, res, next) {
  var query = Ingredient.findOneAndRemove({ name: req.params.name })
  query.then(function(result) {
    res.redirect(req.baseUrl);
  }).catch(function(error) {
    var err = new Error('Couldn\'t delete that ingredient.');
    err.status = 400;
    next(err);
  });
})


router.post('/:name/update', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  var query = Ingredient.findOneAndUpdate({ name: req.params.name }, {
    $set: {
      name: ingName,
      package: req.body.package.toLowerCase(),
      temperature: req.body.temperature.toLowerCase(),
      amount: req.body.amount
    }
  });
  query.then(function(result) {
    res.redirect(req.baseUrl + '/' + ingName);
  }).catch(function(error) {
    var err = new Error('Couldn\'t update that ingredient.');
    err.status = 400;
    next(err);
  });
});

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  var promise = Ingredient.create({
    name: ingName,
    package: req.body.package.toLowerCase(),
    temperature: req.body.temperature.toLowerCase(),
    amount: req.body.amount
  });
  promise.then(function(instance) {
    res.redirect(req.baseUrl + '/' + ingName);
  }).catch(function(error) {
    next(error);
  });
})

createCatalogue = function(vendors, name) {
  var catalogue = [];
  for (i = 0; i < vendors.length; i++) {
    var vendor = vendors[i];
    for (j = 0; j < vendor['catalogue'].length; j++) {
      if (vendor['catalogue'][j]['ingredient'] == name) {
        console.log(vendor['catalogue'][j]);
        catalogue.push({vendorName: vendor['name'], vendorCode: vendor['code'], record: vendor['catalogue'][j]});
      }
    }
  }
  return catalogue
}


//PUT request to update an existing ingredient
// router.post('/update/', function(req, res) {
//   Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
// });

module.exports = router;