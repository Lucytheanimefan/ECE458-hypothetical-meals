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

module.exports.markIngredientArrived = function(orderNumber,ingID,vendID) {
  return new Promise(function(resolve, reject) {
    Orders.markIngredientArrived(orderNumber,ingID,vendID).then(function(res){
      return Orders.getOrder(orderNumber);
    }).then(function(order){
      var pendingCheck = false;
      for(var i = 0; i < order.products.length; i++){
        if(order.products[i].pending == true){
          pendingCheck = true;
        }
      }
      order.completed = !pendingCheck;
      return order.save();
    }).then(function(res){
      resolve(res);
    }).catch(function(err){
      reject(err);
    })
  });
}
