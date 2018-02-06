var express = require('express');
var queryString = require('query-string');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');
var Vendor = require('../models/vendor');
var users = require('./users');


var packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
var temperatures = ['frozen', 'refrigerated', 'room temperature'];

let weightMapping = {
  sack:50,
  pail:50,
  drum:500,
  supersack:2000,
  truckload:50000,
  railcar:280000
}

//GET request to show available ingredients
router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/search_results/');
})

router.get('/search_results/:page?/:search?', function(req, res, next) {
  var query = Ingredient.find();
  var searchString = req.params.search;
  var searchQuery = (searchString == null) ? req.query : queryString.parse(searchString);
  if (searchQuery.name != null) {
    var name = searchQuery.name;
    var search = '.*' + name + '.*'
    query.where({name: new RegExp(search, 'i')});
  }
  if (searchQuery.package != null) {
    query.where('package').in(searchQuery.package);
  }
  if (searchQuery.temperature != null) {
    query.where('temperature').in(searchQuery.temperature);
  }
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  query.skip((perPage * page) - perPage).limit(perPage);
  
  searchString = queryString.stringify(searchQuery);
  query.then(function(ings) {
    if (ings.length == 0) {
      page = page - 1;
    }
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

router.get('/:name/:amt/:page?', function(req, res, next) {
  var ingQuery = Ingredient.findOne({ name: req.params.name });
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  var venderQuery = Vendor.find({ 'catalogue.ingredient': req.params.name }).skip((perPage * page) - perPage).limit(perPage);
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
    res.render('ingredient', { ingredient: ingredient, packages: packageTypes, temps: temperatures, vendors: catalogue, page: page, amount: req.params.amt});
  }).catch(function(error) {
    next(error)
  });
})

//POST request to delete an existing ingredient
router.post('/:name/delete', function(req, res, next) {
  var query = Ingredient.findOneAndRemove({ name: req.params.name })
  var inventoryUpdate = function(result) {
    var temperature = result['temperature'].toLowerCase().split(" ")[0];
    var decrementObject = {};
    var field = 'current.' + temperature;
    decrementObject[field] = -result['amount'];
    return Inventory.findOneAndUpdate({type: 'master'}, 
      { $inc: decrementObject }
    );
  }
  query.then(function(result) {
    if(result['package']!=="railcar" && result['package']!=="truckload"){
      return inventoryUpdate(result);
    } else {
      res.redirect(req.baseUrl);
    }
  }).then(function(result) {
    res.redirect(req.baseUrl);
  }).catch(function(error) {
    console.log(error);
    var err = new Error('Couldn\'t delete that ingredient.');
    err.status = 400;
    next(err);
  });
})


router.post('/:name/update', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();

  var invDb;
  var ingDb;
  var findInventory = Inventory.findOne({type: "master"});
  var findIngredient = Ingredient.findOne({name:req.params.name});

  var query = Ingredient.findOneAndUpdate({ name: req.params.name }, {
    $set: {
      name: ingName,
      package: req.body.package.toLowerCase(),
      temperature: req.body.temperature.toLowerCase(),
      amount: req.body.amount
    }
  });
  findInventory.then(function(inv) {
    invDb = inv;
    return findIngredient;
  }).then(function(ing) {
    ingDb = ing;
    let currIndTemp = ing['temperature'].toLowerCase().split(" ")[0];
    let currAmount = parseFloat(ing['amount']);
    if(ing['package']!=="railcar" && ing['package']!=="truckload"){
      invDb['current'][currIndTemp]-=currAmount;
    }
    return invDb;
  }).then(function(db) {
    let newIndTemp = req.body.temperature.toLowerCase().split(" ")[0];
    let newAmount = parseFloat(req.body.amount);
    if(req.body.package.toLowerCase()!=="railcar" && req.body.package.toLowerCase()!=="truckload"){
      invDb['current'][newIndTemp]+=newAmount;
    }
    if(invDb['current'][newIndTemp]>invDb['limits'][newIndTemp]){
      invDb['current'][currIndTemp]+=currAmount;
      invDb['current'][newIndTemp]-=newAmount;
    }
    return invDb.save();
  }).catch(function(error) {
    var error = new Error('Couldn\'t update the inventory.');
    error.status = 400;
    next(error);
  }).then(function(result) {
    return query.exec();
  }).then(function(result) {
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
  promise.then(async function(instance) {
    await Inventory.findOne({type:"master"},function(err,inv){
      if(err){return next(err);}
      if(req.body.package.toLowerCase()!== "truckload" && req.body.package.toLowerCase()!== "railcar"){
        inv['current'][req.body.temperature.toLowerCase().split(" ")[0]]+=parseFloat(req.body.amount);
      }
      if(inv['current'][req.body.temperature.toLowerCase().split(" ")[0]] > inv['limits'][req.body.temperature.toLowerCase().split(" ")[0]]){
        instance['amount']=0;
        inv['current'][req.body.temperature.toLowerCase().split(" ")[0]]-=parseFloat(req.body.amount);
      }
      inv.save();
      instance.save();
    })
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
