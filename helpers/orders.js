var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');
var FormulaHelper = require('./formula');
var InventoryHelper = require('./inventory');
var VendorHelper = require('./vendor');
var Vendor = require('../models/vendor');
var Formula = require('../models/formula');
var UserHelper = require('./users');
var Spending = require('../models/spending');
var Production = require('../models/production');
var Freshness = require('../models/freshness');
var Recall = require('../models/recall');
var RealRecall = require('../models/real_recall');
var mongoose = require('mongoose');
var Orders = require('../models/orders');

mongoose.Promise = global.Promise;

module.exports.addOrder = function(products){
  return new Promise(function(resolve, reject){
    var orderList = [];
    for(var i = 0; i < products.length; i++){
      var entry = {};
      entry['ingID'] = products[i]['ingID'];
      entry['vendID'] = products[i]['vendor'];
      entry['quantity'] = products[i]['amount'];
      entry['arrived'] = false;
      entry['assigned'] = false;
      orderList.push(entry);
    }
    Orders.addOrder(orderList).then(function(res){
      resolve(res);
    }).catch(function(err){
      reject(err);
    })
  })
}

module.exports.markIngredientArrived = function(orderNumber,ingID,vendID) {
  return new Promise(function(resolve, reject) {
    Orders.markIngredientArrived(orderNumber,ingID,vendID).then(function(res){
      return Orders.getOrder(orderNumber);
    }).then(function(order){
      var pendingCheck = true;
      for(var i = 0; i < order.products.length; i++){
        if(order.products[i].arrived == false){
          pendingCheck = false;
        }
      }
      order.completed = pendingCheck;
      order.arrivalTimeStamp = Date();
      return order.save();
    }).then(function(res){
      resolve(res);
    }).catch(function(err){
      reject(err);
    })
  });
}
