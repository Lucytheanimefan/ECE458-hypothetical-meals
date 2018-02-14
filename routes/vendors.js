var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory');
var Ingredient = require('../models/ingredient');
var VendorHelper = require('../helpers/vendor');
var uniqid = require('uniqid');
var mongoose = require('mongoose');
let packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
let temperatures = ['frozen', 'refrigerated', 'room temperature'];
let pageSize = 10;

let weightMapping = {
  sack:50,
  pail:50,
  drum:500,
  supersack:2000,
  truckload:50000,
  railcar:280000
}

//no need for now
router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/');
})

//no need for refactoring
router.get('/home/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  Vendor.model.find({}, null, {skip: (perPage * page) - perPage, limit: perPage}, function(error, vendors) {
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
  var query = Vendor.findVendorByCode(req.params.code);
  query.then(function(vendQuery){
    var page = req.params.page || 1;
    page = (page < 1) ? 1 : page;
    let fullMenu = vendQuery.catalogue;
    let name = vendQuery.name;
    let contact = vendQuery.contact;
    let menu = fullMenu.splice((page-1)*pageSize,page*pageSize)
    res.render('vendor', { vendor: vendQuery, packages: packageTypes, temps: temperatures, catalogue:menu, name:name,
    contact:contact, page:page, code:req.params.code});
  });
})

//POST request to delete an existing ingredient
//refactored
router.post('/:code/delete', function(req, res, next) {
  VendorHelper.deleteVendor(req.params.code);
  return res.redirect(req.baseUrl);
});

//bare bones done, more implementation needed
router.post('/:code/add_ingredients', function(req,res,next){
  VendorHelper.addIngredient(req.params.code,"5a80bfb29ba8aa7f814a363e",req.body.cost);
  res.redirect(req.baseUrl + '/' + req.params.code);
});

//bare bones done, more implementation needed
router.post('/:code/update_ingredients', function(req,res,next){
  VendorHelper.updateIngredient(req.params.code,"5a80bfb29ba8aa7f814a363e",req.body.cost);
  res.redirect(req.baseUrl + '/' + req.params.code);
});

//refactored
router.post('/:code/update', async function(req, res, next) {
  let currCode = req.params.code;
  let code = req.body.code;
  let name = req.body.name;
  let location = req.body.location;
  let contact = req.body.contact;
  console.log(currCode);
  console.log(req.body);
  var update = VendorHelper.updateVendor(currCode, name, code, contact, location);
  update.then(function(result){
    return res.redirect(req.baseUrl + '/' + req.body.code);
  }).catch(function(error) {
    next(error);
  });

});

//POST request to create a new ingredient
//refactored
router.post('/new', function(req, res, next) {
  let name = req.body.name;
  let code = req.body.code;
  let contact = req.body.contact;
  let location = req.body.location;
  var create = VendorHelper.createVendor(name,code,contact,location);
  create.then(function(result){
    return res.redirect(req.baseUrl + '/' + req.body.code);
  }).catch(function(error) {
    next(error);
  });
});

router.post('/:code/order', async function(req,res,next){
  let ingredientId = "5a80bfb29ba8aa7f814a363e";
  let ingId = mongoose.Types.ObjectId(ingredientId);
  var vendQuery = Vendor.findVendorByCode(req.params.code);
  let amount = parseFloat(req.body.quantity);
  vendQuery.then(function(vend){
    let oid = vend._id;
    let vendId = mongoose.Types.ObjectId(oid);
    return VendorHelper.makeOrder(ingId,vendId,amount);
  }).then(function(result){
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error){
    next(error);
  })
});


module.exports = router;
module.exports.addIngredient = addIngredient;
