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
  res.redirect(req.baseUrl + '/home/1/1');
})

//no need for refactoring
router.get('/home/:page1?/:page2?', function(req, res, next) {
  var completedOrders = [];
  var pendingOrders = [];
  var page1 = parseInt(req.params.page1);
  var page2 = parseInt(req.params.page2)
  if (page1 == null || isNaN(page1) || page1 < 1) {
    page1 = 1;
  }
  if (page2 == null || isNaN(page2) || page2 < 1) {
    page2 = 1;
  }
  var pageCapCompleted = page2;
  var pageCapPending = page1;
  var perPage = 10;
  Orders.getAllIncompleteOrders().then(function(orders){
    allPendingOrders = orders;
    pageCapPending = Math.ceil(orders.length/perPage)>0 ? Math.ceil(orders.length/perPage) : 1;
    //console.log(orders);
    //console.log(pageCapPending);
    if(page1 >= pageCapPending){
      page1 = pageCapPending;
    }
    pendingOrders = allPendingOrders.slice((page1-1)*perPage,(page1-1)*perPage+perPage);
    //console.log(pendingOrders);
    return Orders.getAllCompleteOrders();
  }).then(function(orders){
    allCompletedOrders = orders;
    pageCapCompleted = Math.ceil(orders.length/perPage)>0 ? Math.ceil(orders.length/perPage) : 1;
    if(page2 > pageCapCompleted){
      page2 = pageCapCompleted;
    }
    let completedOrders = allCompletedOrders.slice((page2-1)*perPage,(page2-1)*perPage+perPage);
    res.render('orders',{pendingOrders:pendingOrders,completedOrders:completedOrders,pageOne:page1,pageTwo:page2});
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
    res.redirect('/users/lot_assignment');
  })
  .catch(function(err){
    next(err);
  })
})

module.exports = router;
