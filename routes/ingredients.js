var express = require('express');
var queryString = require('query-string');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var VendorHelper = require('../helpers/vendor');
var Vendor = require('../models/vendor');
var users = require('./users');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
var temperatures = ['frozen', 'refrigerated', 'room temperature'];

//GET request to show available ingredients
router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/search_results/');
})

router.get('/search_results/:page?/:search?', function(req, res, next) {
  var query = Ingredient.model.find();
  var searchString = req.params.search;
  var searchQuery = (searchString == null) ? req.query : queryString.parse(searchString);
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  searchString = queryString.stringify(searchQuery);
  IngredientHelper.searchIngredients(searchQuery, page).then(function(ings) {
    res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures, searchQuery: searchString, page: page });
  }).catch(function(error) {
    console.log(error);
    var err = new Error('Error during search');
    err.status = 400;
    return next(err);
  });
})

router.get('/:name', function(req, res, next) {
  res.redirect(req.baseUrl + '/' + req.params.name + '/0');
})


router.get('/id/:ingredient_id', function(req, res, next) {
  console.log('Get ingredient for id: ' + req.params.ingredient_id);
  var findIngredient = Ingredient.model.findOne({ _id: req.params.ingredient_id }).exec();
  findIngredient.then(function(ingredient) {
    console.log(ingredient);
    res.send(ingredient);
  }).catch(function(error){
    res.send({'error': error});
  })

})

//TODO: Refactor once vendor is ready
router.get('/:name/:amt/:page?', function(req, res, next) {
  var ingQuery = Ingredient.getIngredient(req.params.name);
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;

  var vendorQuery = function(ing) {
    return Vendor.model.find({ 'catalogue.ingredient': ing }).skip((perPage * page) - perPage).limit(perPage);
  }
  var findAllVendors = Vendor.model.find().exec();
  var ingredient;
  var vendorObjects;
  findAllVendors.then(function(vendors) {
    vendorObjects = vendors;
    return ingQuery;
  }).then(function(ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      throw err;
    }
    ingredient = ing;
    return vendorQuery(ing);
  }).then(function(vendors) {
    console.log(vendors);
    return createCatalogue(vendors, ingredient['_id']);
  }).then(function(catalogue) {
    res.render('ingredient', { ingredient: ingredient, packages: packageTypes, temps: temperatures, vendors: catalogue, page: page, amount: req.params.amt, existingVendors: vendorObjects });
  }).catch(function(error) {
    next(error)
  });
})

//POST request to delete an existing ingredient
router.post('/:name/delete', function(req, res, next) {
  Ingredient.getIngredient(req.params.name).then(function(ing) {
    return IngredientHelper.deleteIngredient(
      ing['name'],
      ing['package'],
      ing['temperature'],
      parseFloat(ing['unitsPerPackage']),
      parseFloat(ing['amount'])
    );
  }).then(function() {
    res.redirect(req.baseUrl + '/');
  }).catch(function(error) {
    next(error);
  });
})


router.post('/:name/update', function(req, res, next) {
  let ingName = req.body.name;
  let initiating_user = req.session.userId;
  console.log(initiating_user)

  var updatePromise = IngredientHelper.updateIngredient(
    req.params.name,
    req.body.name,
    req.body.package,
    req.body.temperature,
    req.body.nativeUnit,
    parseFloat(req.body.unitsPerPackage),
    parseFloat(req.body.amount)
  );
  updatePromise.then(function(ingredient) {
    logs.makeIngredientLog('Update', {'ingredient_id': ingredient[0]._id}, ['ingredient'], initiating_user);
    res.redirect(req.baseUrl + '/' + ingName);
  }).catch(function(error) {
    next(error);
  });

});

router.post('/new', function(req, res, next) {
  let ingName = req.body.name;
  let initiating_user = req.session.userId;
  var promise = IngredientHelper.createIngredient(
    ingName,
    req.body.package,
    req.body.temperature,
    req.body.nativeUnit,
    parseFloat(req.body.unitsPerPackage),
    parseFloat(req.body.amount)
  );
  promise.then(function(ingredient) {
    logs.makeIngredientLog('Creation', {'ingredient_id': ingredient._id}, ['ingredient'], initiating_user);
    res.redirect(req.baseUrl + '/' + ingName);
  }).catch(function(error) {
    next(error);
  });

})


router.post('/:name/add-vendor', function(req, res, next) {
  let ingName = req.params.name;
  let initiating_user = req.session.userId;
  IngredientHelper.addVendor(ingName, req.body.vendor, req.body.cost).then(function(results) {
    logs.makeIngredientLog('Add vendor to ingredient', {'array_description':results}, ['ingredient','vendor'], initiating_user);
    res.redirect(req.baseUrl + '/' + ingName);
  }).catch(function(error) {
    next(error);
  })
})


router.post('/order/add/to/cart', function(req, res, next) {
  let userId = req.session.userId;
  let order = req.query;
  console.log(order);
  // let promise = Promise.all(order)
  let orderArray = [];
  for (let ingredient in order) {
    orderArray.push(IngredientHelper.addOrderToCart(userId, ingredient, order[ingredient]));
  }
  Promise.all(orderArray).then(function() {
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
})

createCatalogue = function(vendors, id) {
  var catalogue = [];
  for (i = 0; i < vendors.length; i++) {
    var vendor = vendors[i];
    for (j = 0; j < vendor['catalogue'].length; j++) {
      if (vendor['catalogue'][j]['ingredient'].toString() == id) {
        catalogue.push({ vendorName: vendor['name'], vendorCode: vendor['code'], record: vendor['catalogue'][j] });
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