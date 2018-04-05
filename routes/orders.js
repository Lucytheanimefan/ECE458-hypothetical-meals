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
let Orders = require('../models/orders');
let OrderHelper = require('../helpers/orders')


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
  var startDate = req.query.start;
  var endDate = req.query.end;
  var query = {};
  // if (startDate != null && endDate != null && startDate.length > 0 && endDate.length > 0) {
  //   query = { 'time': { "$gte": startDate, "$lt": endDate } };
  // }
  Orders.paginate(query, perPage, page, function(err, orders) {
    if (err) {
      console.log(err);
      next(err);
    }
    var maxPage = false;
    console.log('Num logs: ' + logs.length);
    if (logs.length < perPage) {
      maxPage = true;
    }
    res.render('orders', { logs: logs, page: page, maxPage: maxPage, startDate: startDate, endDate: endDate });
  })
})

module.exports = router;
