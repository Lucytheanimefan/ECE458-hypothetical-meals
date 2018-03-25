var express = require('express');
var queryString = require('query-string');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var UserHelper = require('../helpers/users');
var VendorHelper = require('../helpers/vendor');
var Vendor = require('../models/vendor');
var Formula = require('../models/formula');
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
  var catalogue;
  var vendorLots;
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
    catalogue = createCatalogue(vendors, ingredient['_id']);
    vendorLots = ingredient['vendorLots'];
    return Promise.all([joinEntriesTogether(vendorLots), fillEntries(vendorLots)]);
  }).then(function(result) {
    let combinedLots = result[0];
    let lots = result[1];
    combinedLots.sort(function(a,b) {
      if (a.vendor.name < b.vendor.name) {
        return -1;
      } else if (a.vendor.name > b.vendor.name) {
        return 1;
      } else {
        return 0;
      }
    });
    res.render('ingredient', { ingredient: ingredient, packages: packageTypes, temps: temperatures, vendors: catalogue, page: page, amount: req.params.amt, existingVendors: vendorObjects, sets: combinedLots, lots: displayTimestamps(lots) });
  }).catch(function(error) {
    next(error)
  });
})

joinEntriesTogether = function(lots) {
  return new Promise(function(resolve, reject) {
    let results = [];
    for (let lot of lots) {
      let updated = false;
      for (let result of results) {
        if (result['vendorID'] == lot['vendorID'] && result['lotNumber'] == lot['lotNumber']) {
          result['units'] = parseFloat(result['units']) + parseFloat(lot['units']);
          updated = true;
        }
      }
      if (!updated) {
        results.push(lot);
      }
    }
    fillEntries(results).then(function(lots) {
      resolve(lots);
    }).catch(function(error) {
      reject(error);
    })
  })
}

fillEntries = function(lots) {
  return Promise.all(lots.map(function(lot) {
    return getVendor(lot);
  }));
}

getVendor = function(lot) {
  return new Promise(function(resolve, reject) {
    if (lot['vendorID'] == 'admin') {
      lot['vendor'] = {'name': 'admin'};
      resolve(lot);
    } else {
      Vendor.findVendorById(lot['vendorID']).then(function(vendor) {
        lot['vendor'] = vendor;
        return lot;
      }).then(function(lot) {
        resolve(lot);
      }).catch(function(error) {
        reject(error);
      })
    }
  })
}

displayTimestamps = function(sets) {
  let newSets = [];
  for (let set of sets) {
    set['stringTimestamp'] = Date(set['timestamp']).toString();
    newSets.push(set);
  }
  return newSets;
}

//POST request to delete an existing ingredient
router.post('/:name/delete', function(req, res, next) {
  var formulaQuery = function(ingId) {
    return Formula.model.find({ 'tuples.ingredientID': ingId });
  }
  var ing;
  Ingredient.getIngredient(req.params.name).then(function(result) {
    ing = result;
    return formulaQuery(ing['_id']);
  }).then(function(formulas) {
    if (formulas.length != 0) {
      var error = new Error('Can\'t delete because ' + ing.name + ' is being used in a formula!');
      error.status = 400;
      throw error;
    } else {
      return IngredientHelper.deleteIngredient(
        ing['name'],
        ing['package'],
        ing['temperature'],
        parseFloat(ing['unitsPerPackage']),
        parseFloat(ing['amount'])
      );
    }
  }).then(function(ing) {
    logs.makeIngredientLog('Delete ingredient', 'Deleted <a href="/ingredients/' + req.params.name + '">' + req.params.name + '</a>'/*{ingredient:req.params.name}*/, req.session.username);
    var promise = UserHelper.updateCart(req.session.userId);
    return promise;
  }).then(function(result) {
    res.redirect(req.baseUrl + '/');
  }).catch(function(error) {
    next(error);
  });
})


router.post('/:name/update', function(req, res, next) {
  let ingName = req.body.name;
  let initiating_user = req.session.username;
  console.log(initiating_user)

  var updatePromise = IngredientHelper.updateIngredient(
    req.params.name,
    req.body.name,
    req.body.package,
    req.body.temperature,
    req.body.nativeUnit,
    parseFloat(req.body.unitsPerPackage)
  );
  updatePromise.then(function(ingredient) {
    logs.makeIngredientLog('Update ingredient', 'Updated <a href="/ingredients/' + req.params.name + '">' + req.params.name + '</a>', initiating_user);
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
  }).catch(function(error) {
    next(error);
  });
});

router.post('/:name/updateamount', function(req, res, next) {
  let ingName = req.params.name;
  let initiating_user = req.session.username;
  console.log(initiating_user)

  Ingredient.getIngredient(ingName).then(function(ingredient) {
    let updateAmount = parseFloat(req.body.amount)-parseFloat(ingredient.amount);
    var updatePromise = IngredientHelper.incrementAmount(
      ingredient._id,
      updateAmount
    );
    return updatePromise;
  }).then(function(ing) {
    logs.makeIngredientLog('Update ingredient', 'Updated <a href="/ingredients/' + req.params.name + '">' + req.params.name + '</a>', initiating_user);
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
  }).catch(function(error) {
    next(error);
  });
});

router.post('/:name/updatelot', function(req, res, next) {
  let ingName = req.params.name;
  let initiating_user = req.session.username;
  console.log(initiating_user)

  Ingredient.getIngredient(ingName).then(function(ingredient) {
    let updateAmount = parseFloat(req.body.amount);
    var updatePromise = IngredientHelper.incrementAmount(
      ingredient._id,
      updateAmount,
      req.body.vendor,
      req.body.lotNumber
    );
    return updatePromise;
  }).then(function(ing) {
    logs.makeIngredientLog('Update ingredient', 'Updated <a href="/ingredients/' + req.params.name + '">' + req.params.name + '</a>', initiating_user);
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
  }).catch(function(error) {
    next(error);
  });
});

router.post('/new', function(req, res, next) {
  var ingName = req.body.name;
  var initiating_user = req.session.username;
  var promise = IngredientHelper.createIngredient(
    ingName,
    req.body.package,
    req.body.temperature,
    req.body.nativeUnit,
    parseFloat(req.body.unitsPerPackage),
  );
  promise.then(function(ingredient) {
    logs.makeIngredientLog('Create ingredient','Created <a href="/ingredients/' + ingName + '">' + ingName + '</a>'/*{'ingredient_id': ingredient._id}*/, initiating_user);
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
  }).catch(function(error) {
    next(error);
  });

})


router.post('/:name/add-vendor', function(req, res, next) {
  let ingName = req.params.name;
  let initiating_user = req.session.username;
  //addVendor = function(name, vendorId, cost)
  IngredientHelper.addVendor(ingName, req.body.vendor, req.body.cost).then(function(results) {
    logs.makeIngredientLog('Add vendor to ingredient',
      'Associated <a href="/vendors/' + encodeURIComponent(req.body.vendor)+'">vendor</a> with' +
      ' ingredient <a href="/ingredients/' + ingName + '">' + ingName + '</a>' /*{'ingredient_name':ingName, 'vendor_id': req.body.vendor}*/, initiating_user);
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
  }).catch(function(error) {
    next(error);
  })
})

router.post('/order/add/to/cart', function(req, res, next) {
  let userId = req.session.userId;
  let order = req.body;//.query;
  let ingredient = req.body.ingredient;
  let quantity = req.body.quantity;
  let orderArray = [];
  let checkVendorArray = [];
  var promise;
  if (ingredient != null) {
    promise = Ingredient.getIngredient(ingredient);
  } else {
    promise = Ingredient.getIngredient(order[0]);
  }
  promise.then(function(ingResult) {
    if (ingredient != null) {
      order = {};
      quantity = quantity*ingResult.unitsPerPackage;
      order[ingredient] = quantity;
    }
    for (let ingredient in order) {
      checkVendorArray.push(IngredientHelper.checkIfVendorSells(ingredient));
    }
    return Promise.all(checkVendorArray);
  }).then(function(vendors){
    for (let ingredient in order) {
      orderArray.push(IngredientHelper.addOrderToCart(userId, ingredient, order[ingredient]));
    }
    return Promise.all(orderArray);
  }).then(function(results) {
    var logResults = "";
    for (let result of results) {
      let vendor = result[0];
      let ing = result[1];
      logResults += '<li>Vendor <a href="/vendors/' + encodeURIComponent(vendor.code)+'">'+vendor.code+')</a> with '+
      'ingredient <a href="/ingredients/' + ing['name'] + '">' + ing['name'] + '</a></li>'
    }
    logs.makeLog('Add to cart',
      'Added the following to cart: <ul>' + logResults + '</ul>'/*{ 'vendor_code': vendor.code, 'Ingredient_ID': mongoose.Types.ObjectId(ing['_id']) }*/, req.session.username);
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
})

router.post('/:name/edit-lot/:oldAmount', function(req, res, next) {
  let ingName = req.params.name;
  let lotID = req.body.lotID;
  let oldAmount = parseFloat(req.params.oldAmount);
  let newAmount = parseFloat(req.body.amount);
  IngredientHelper.updateIngredientByLot(ingName, oldAmount, newAmount, lotID).then(function(ing) {
    res.redirect(req.baseUrl + '/' + encodeURIComponent(ingName));
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
