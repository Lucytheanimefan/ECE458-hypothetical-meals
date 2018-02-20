var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory').model;
var Ingredient = require('../models/ingredient');
var VendorHelper = require('../helpers/vendor');
var uniqid = require('uniqid');
var mongoose = require('mongoose');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var uniqid = require('uniqid')
let packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
let temperatures = ['frozen', 'refrigerated', 'room temperature'];
let pageSize = 10;


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
  ingQuery.then(function(result){
    ingList = result;
    return query;
  }).then(function(vendQuery){
      var page = req.params.page || 1;
      page = (page < 1) ? 1 : page;
      let fullMenu = processMenu(vendQuery.catalogue,req.params.code);
      let name = vendQuery.name;
      let contact = vendQuery.contact;
      let location = vendQuery.location;
      let menu = fullMenu.splice((page - 1) * pageSize, page * pageSize);
      res.render('vendor', {
        vendor: vendQuery,
        catalogue: menu,
        page: page,
        code: req.params.code,
        ingredientList: ingList
      });
  })
})

//POST request to delete an existing ingredient
//refactored
router.post('/:code/delete', function(req, res, next) {
  VendorHelper.deleteVendor(req.params.code);
  logs.makeVendorLog('Delete', { 'Vendor code': req.params.code }, entities = ['vendor'], req.session.userId);
  return res.redirect(req.baseUrl);
});

//bare bones done, more implementation needed for adding other ingredients, currently hardcoded
router.post('/:code/add_ingredients', function(req, res, next) {
  var ingQuery = Ingredient.getIngredientById(mongoose.Types.ObjectId(req.body.ingredient));
  ingQuery.then(async function(result) {
    if (result == null) {
      let err = new Error('This ingredient does not exist');
      return next(err);
    }
    await VendorHelper.addIngredient(req.params.code, result._id, req.body.cost);
    logs.makeVendorLog('Add ingredients', { 'Vendor code': req.params.code, 'Ingredient ID': result._id, 'cost': req.body.cost }, entities = ['vendor', 'ingredient'], req.session.userId);
    return res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    next(error);
  })
});

//bare bones done
router.post('/:code/update_ingredients', function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.body.ingredient);
  VendorHelper.updateIngredient(req.params.code, ingId, req.body.cost);
  logs.makeVendorLog('Update ingredients', { 'Vendor code': req.params.code, 'Ingredient ID': ingId, 'cost': req.body.cost }, entities = ['vendor', 'ingredient'], req.session.userId);
  res.redirect(req.baseUrl + '/' + req.params.code);
});

//TODO This route is giving a 404 for some reason.  Fix this!!!!
router.post('/:code/:ingredient/remove_ingredients/', function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.params.ingredient);
  VendorHelper.deleteIngredient(req.params.code, ingId);
  //TODO link delete to logs
  //logs.makeVendorLog('Update ingredients', { 'Vendor code': req.params.code, 'Ingredient ID': ingId, 'cost': req.body.cost }, entities = ['vendor', 'ingredient'], req.session.userId);
  res.redirect(req.baseUrl + '/' + req.params.code);
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
    logs.makeVendorLog('Update', result, entities = ['vendor'], req.session.userId);
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
    logs.makeVendorLog('Creation', result, entities = ['vendor'], req.session.userId);
    return res.redirect(req.baseUrl + '/' + req.body.code);
  }).catch(function(error) {
    next(error);
  });
});

router.post('/:code/order', async function(req, res, next) {
  let ingId = mongoose.Types.ObjectId(req.body.ingredient);
  var vendQuery = Vendor.findVendorByCode(req.params.code);
  let amount = parseFloat(req.body.quantity);
  vendQuery.then(function(vend) {
    let oid = vend._id;
    let vendId = mongoose.Types.ObjectId(oid);
    return VendorHelper.makeOrder(ingId, vendId, amount);
  }).then(function(result) {
    logs.makeVendorLog('Order', { 'Vendor': result, 'Ingredient ID': ingId }, entities = ['vendor', 'ingredient'], req.session.userId);
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    next(error);
  })
});

processMenu = function(list,code){
  var newList = list.slice();
  for(var i = 0; i < newList.length; i++){
    if(newList[i]['ingredient'] == null){
      let id = newList[i]['_id'];
      VendorHelper.deleteIngredient(code,id);
      newList.splice(i,1);
      i--;
    }
  }
  return newList;
}


module.exports = router;
