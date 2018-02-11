var Ingredient = require('../models/ingredient');
var InventoryHelper = require('./inventory');
var Vendor = require('../models/vendor');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var checkAndUpdate = function(promise, package, temp, amount) {
  return new Promise(function(resolve, reject) {
    InventoryHelper.checkInventory(package, temp, amount).then(function(update) {
      if (update) {
        resolve(Promise.all([InventoryHelper.updateInventory(package, temp, amount), promise]));
      } else {
        var error = new Error('Not enough space in inventory!');
        error.status = 400;
        reject(error);
      }
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports.createIngredient = function(name, package, temp, amount=0) {
  return new Promise(function(resolve, reject) {
    if (amount < 0) {
      var error = new Error('Storage amount must be a non-negative number');
      error.status = 400;
      reject(error);
    } else {
      var create = Ingredient.createIngredient(name, package, temp, amount)
      resolve(checkAndUpdate(create, package, temp, amount));
    }
  });
}

module.exports.updateIngredient = function(name, newName, package, temp, amount) {
  return new Promise(function(resolve, reject) {
    if (amount < 0) {
      var error = new Error('Storage amount must be a non-negative number');
      error.status = 400;
      reject(error);
    } else {
      Ingredient.getIngredient(name).then(function(ing) {
        let incAmount = amount - parseFloat(ing['amount']);
        var update = Ingredient.updateIngredient(name, newName, package, temp, amount);
        resolve(checkAndUpdate(update, package, temp, incAmount));
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

module.exports.deleteIngredient = function(name, package, temp, amount) {
  return new Promise(function(resolve, reject) {
    resolve(Promise.all([InventoryHelper.updateInventory(package, temp, -amount), Ingredient.deleteIngredient(name)]));
  })
}

module.exports.addVendor = function(name, vendorId) {
  let vendorObjectId = mongoose.Types.ObjectId(vendorId);
  return new Promise(function(resolve, reject) {
    var vendorQuery = Vendor.findById(vendorObjectId);
    vendorQuery.exec().then(function(vendor) {
      if (vendor == null) {
        var error = new Error('The specified vendor doesn\'t exist!');
        error.status = 400;
        throw error;
      } else {
        return Ingredient.addVendor(name, vendorObjectId);
      }
    }).then(function(result) {
      resolve();
    }).catch(function(error) {
      reject(error);
    })
  })
}