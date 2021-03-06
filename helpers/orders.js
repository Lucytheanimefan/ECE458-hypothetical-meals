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
      entry['assigned'] = "none";
      entry['arrivalTimeStamp'] = "n/a";
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
        if(order.products[i].ingID._id == ingID && order.products[i].vendID._id == vendID){
          order.products[i].arrived = true;
          order.products[i].arrivalTimeStamp = Date();
        }
        if(order.products[i].arrived == false){
          pendingCheck = false;
        }
      }
      order.completed = pendingCheck;
      if(pendingCheck){
        order.arrivalTimeStamp = Date();
      }
      return order.save();
    }).then(function(res){
      resolve(res);
    }).catch(function(err){
      reject(err);
    })
  });
}

module.exports.markIngredientAssigned = function(orderNumber,ingID,vendID,lotNumber) {
  return new Promise(function(resolve, reject) {
    Orders.markIngredientArrived(orderNumber,ingID,vendID,lotNumber).then(function(res){
      return Orders.getOrder(orderNumber);
    }).then(function(order){
      var assignCheck = true;
      for(var i = 0; i < order.products.length; i++){
        if(order.products[i].ingID._id == ingID && order.products[i].vendID._id == vendID){
          order.products[i].assigned = lotNumber;
        }
        if(order.products[i].assigned == "none"){
          assignCheck = false;
        }
      }
      order.assigned = assignCheck;
      order.save();
    }).then(function(res){
      resolve(res);
    }).catch(function(err){
      reject(err);
    })
  });
}
