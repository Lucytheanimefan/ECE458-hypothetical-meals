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
var Orders = require('../models/orders');
var OrderHelper = require('../helpers/orders')


//no need for now
router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/1');
})

//no need for refactoring
router.get('/home/:page?', function(req, res, next) {
  var page = parseInt(req.params.page);
  if (page == null || isNaN(page) || page < 0) {
    page = 0;
  }
  var perPage = 10;
  Orders.getAllIncompleteOrders().then(function(orders){
    res.render('orders',{orders:orders});
  }).catch(function(err){
    next(err);
  })
})

router.get('/:code', function(req, res, next) {
  let code = req.params.code;
  Orders.getOrder(code).then(function(order){
    let products = order.products;
    res.render('order',{order:order,products:products})
  }).catch(function(err){
    next(err);
  })
})

router.post('/:code/arrived/:ingID/:vendID', function(req, res, next) {
  let code = req.params.code;
  Orders.getOrder(code).then(function(order){
    let ingID = req.params.ingID;
    let vendID = req.params.vendID;
    return OrderHelper.markIngredientArrived(code,ingID,vendID);
  }).then(function(){
    res.redirect('/orders/' + code);
  })
  .catch(function(err){
    next(err);
  })
})

module.exports = router;
