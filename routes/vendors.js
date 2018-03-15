var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory').model;
var Ingredient = require('../models/ingredient');
var UserHelper = require('../helpers/users');
var VendorHelper = require('../helpers/vendor');
var uniqid = require('uniqid');
var underscore = require('underscore');
var mongoose = require('mongoose');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var uniqid = require('uniqid')
let packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
let temperatures = ['frozen', 'refrigerated', 'room temperature'];
let pageSize = 5;


//no need for now
router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/');
})

//no need for refactoring
router.get('/home/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  Vendor.model.find({}, null, { skip: (perPage * page) - perPage, limit: perPage }, function(error, vendors) {
    if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('vendors', { vendors: vendors, packages: packageTypes, temps: temperatures, page: page });
    }
  })
})

//refactored
router.get('/:code/:page?', async function(req, res, next) {
  var ingList;
  var ingQuery = Ingredient.getAllIngredients();
  var query = Vendor.findVendorByCode(req.params.code);
  var pageCount;
  ingQuery.then(function(result) {
    ingList = result;
    return query;
  }).then(function(vendQuery) {
    var page = req.params.page || 1;
    let fullMenu = processMenu(vendQuery.catalogue, req.params.code);
    pageCount = Math.ceil(fullMenu.length/pageSize);
    pageCount = (pageCount < 1) ? 1 : pageCount;
    page = (page < 1) ? 1 : page;
    page = (page > pageCount) ? pageCount : page;
    let name = vendQuery.name;
    let contact = vendQuery.contact;
    let location = vendQuery.location;
    let menu = fullMenu.splice((page - 1) * pageSize, page * pageSize);
    res.render('vendor', {
      vendor: vendQuery,
      catalogue: menu,
      page: page,
      code: req.params.code,
      ingredientList: ingList,
      pageCount: pageCount
    });
  })
})


router.get('/vendor/id/:vendor_id', function(req, res, next) {
  var findVendor = Vendor.model.findOne({ _id: req.params.vendor_id }).exec();
  findVendor.then(function(vendor) {
    res.send(vendor);
  }).catch(function(error){
    res.send({'error': error});
  })
})


//POST request to delete an existing ingredient
//refactored
router.post('/:code/delete', function(req, res, next) {
  var vendID;
  var vendQuery = Vendor.findVendorByCode(req.params.code);
  vendQuery.then(function(vend) {
    vendID = vend._id;
    return VendorHelper.deleteVendor(req.params.code);
  }).then(function(result) {
    return UserHelper.deleteVendor(req.session.userId, vendID);
  }).then(function(result) {
    let vendor_code = req.params.code;
    logs.makeVendorLog('Delete', 'Deleted vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>', req.session.username);
    return res.redirect(req.baseUrl);
  }).catch(function(error) {
    next(error);
  })
});

//bare bones done, more implementation needed for adding other ingredients, currently hardcoded
router.post('/:code/add_ingredients', function(req, res, next) {
  var ingQuery = Ingredient.getIngredientById(mongoose.Types.ObjectId(req.body.ingredient));
  ingQuery.then(function(result) {
    if (result == null) {
      let err = new Error('This ingredient does not exist');
      return next(err);
    }
    let ingId = mongoose.Types.ObjectId(result._id);
    let vendor_code = req.params.code;
    let ingredient_name = result.name;
    logs.makeVendorLog('Add ingredients to vendor', 'Added ingredient '+'<a href="/ingredients/' + ingredient_name + '">' + ingredient_name + '</a> '+
      'to vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>'/*{ 'Vendor code': req.params.code, 'Ingredient_ID': ingId, 'Cost': req.body.cost }*/, req.session.username);

    return vend = VendorHelper.addIngredient(req.params.code, result._id, req.body.cost);

  }).then(function(outcome) {
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    next(error);
  })
});

//bare bones done
router.post('/:code/update_ingredients', function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.body.ingredient);
  console.log('Ingredient id: ' + ingId);
  let vendor_code = req.params.code;
  VendorHelper.updateIngredient(req.params.code, ingId, req.body.cost).then(function(result) {
    logs.makeVendorLog('Update vendor ingredients',
      'Updated ingredients for vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>'/*{ 'Vendor code': req.params.code, 'Ingredient_ID': ingId, 'Cost': req.body.cost }*/, req.session.username);
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(err) {
    next(err);
  });
});

//TODO This route is giving a 404 for some reason.  Fix this!!!!
router.get('/:code/remove_ingredient/:ingredient', function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.params.ingredient);
  VendorHelper.deleteIngredient(req.params.code, ingId).then(function(result) {
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    next(error);
  });
  let vendor_code = req.params.code;
  logs.makeVendorLog('Remove ingredient from vendor', 'Removed ingredient from vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>'/*{ 'vendor_code': req.params.code, 'ingredient_id': ingId}*/, req.session.username);
});

//refactored
router.post('/:code/update', async function(req, res, next) {
  let currCode = req.params.code;
  let code = req.body.code;
  let name = req.body.name;
  let location = req.body.location;
  let contact = req.body.contact;
  var update = VendorHelper.updateVendor(currCode, name, code, contact, location);
  update.then(function(result) {
    logs.makeVendorLog('Update vendor', 'Updated vendor <a href="/vendors/' + code + '">' + code + '</a>' /*{'vendor_code': code}*/, req.session.username);
    return res.redirect(req.baseUrl + '/' + req.body.code);
  }).catch(function(error) {
    next(error);
  });

});

//POST request to create a new vendor
//refactored
router.post('/new', function(req, res, next) {
  let name = req.body.name;
  let code = req.body.code;
  let contact = req.body.contact;
  let location = req.body.location;
  var create = VendorHelper.createVendor(name, code, contact, location);
  create.then(function(result) {
    let vendor_code = result.code;
    logs.makeVendorLog('Create vendor', 'Created vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>' /*{'vendor_code':result.code}*/, req.session.username);
    return res.redirect(req.baseUrl + '/' + req.body.code);
  }).catch(function(error) {
    next(error);
  });
});

router.post('/:code/order', async function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.body.ingredient);
  var vendQuery = Vendor.findVendorByCode(req.params.code);
  let amount = parseFloat(req.body.quantity);
  var vendor, ingredient;
  let date = new Date();
  vendQuery.then(function(vend) {
    vendor = vend.name;
    return Ingredient.getIngredientById(ingId);
  }).then(function(ingResult) {
    ingredient = ingResult.name;
    let vendor_code = req.params.code
    logs.makeVendorLog('Make order from vendor', 'Ordered ingredient <a href="/ingredients/' + ingredient +'">' +ingredient + '</a> from vendor <a href="/vendors/' + vendor_code + '">' + vendor_code + '</a>'/*{ 'vendor_code': req.params.code, 'Ingredient_ID': ingId }*/, req.session.username);
    return UserHelper.addToCart(req.session.userId, ingId, amount, vendor);
  }).then(function(cartResult) {
    res.redirect('/users/cart');
  }).catch(function(error) {
    next(error);
  })
});

processMenu = function(list, code) {
  var newList = list.slice();
  for (var i = 0; i < newList.length; i++) {
    if (newList[i]['ingredient'] == null) {
      let id = newList[i]['_id'];
      VendorHelper.deleteRemovedIngredient(code, id).catch(function(err) {
        reject(err);
      });
      newList.splice(i, 1);
      i--;
    }
  }
  return newList;
}


module.exports = router;
