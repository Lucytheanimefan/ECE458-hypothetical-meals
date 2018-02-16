var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');
var InventoryHelper = require('./inventory');
var Vendor = require('../models/vendor');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports.createIngredient = function(name, package, temp, nativeUnit, unitsPerPackage, amount=0) {
  return new Promise(function(resolve, reject) {
    if (amount < 0) {
      var error = new Error('Storage amount must be a non-negative number');
      error.status = 400;
      reject(error);
    } else if (unitsPerPackage <= 0) {
      var error = new Error('Units per package must be a positive number');
      error.status = 400;
      reject(error);
    } else {
      InventoryHelper.checkInventory(name, package, temp, unitsPerPackage, amount).then(function(update) {
        if (update) {
          return Promise.all([InventoryHelper.updateInventory(name, package, temp, unitsPerPackage, amount), 
            Ingredient.createIngredient(name, package, temp, nativeUnit, unitsPerPackage, amount)])
        } else {
          var error = new Error('Not enough room in inventory!');
          error.status = 400;
          throw error;
        }
      }).then(function(results) {
        resolve("created ingredient!");
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

module.exports.updateIngredient = function(name, newName, package, temp, nativeUnit, unitsPerPackage, amount) {
  return new Promise(function(resolve, reject) {
    if (amount < 0) {
      var error = new Error('Storage amount must be a non-negative number');
      error.status = 400;
      reject(error);
    } else if (unitsPerPackage <= 0) {
      var error = new Error('Units per package must be a positive number');
      error.status = 400;
      reject(error);
    } else {
      InventoryHelper.checkInventory(name, package, temp, unitsPerPackage, amount).then(function(update) {
        if (update) {
          return Promise.all([InventoryHelper.updateInventory(name, package, temp, unitsPerPackage, amount), 
            Ingredient.updateIngredient(name, newName, package, temp, nativeUnit, unitsPerPackage, amount)])
        } else {
          var error = new Error('Not enough room in inventory!');
          error.status = 400;
          throw error;
        }
      }).then(function(results) {
        resolve("updated ingredient!");
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

module.exports.deleteIngredient = function(name, package, temp, unitsPerPackage, amount) {
  return new Promise(function(resolve, reject) {
    resolve(Promise.all([InventoryHelper.updateInventory(name, package, temp, unitsPerPackage, 0), Ingredient.deleteIngredient(name)]));
  })
}

module.exports.searchIngredients = function(searchQuery, currentPage) {
  var query = Ingredient.searchIngredients();
  return new Promise(function(resolve, reject) {
    if (searchQuery.name != null) {
      var search = '.*' + searchQuery.name + '.*'
      query.where({ name: new RegExp(search, 'i') });
    }
    if (searchQuery.package != null) {
      query.where('package').in(searchQuery.package);
    }
    if (searchQuery.temperature != null) {
      query.where('temperature').in(searchQuery.temperature);
    }
    var perPage = 10;
    query.skip((perPage * currentPage) - perPage).limit(perPage);
    resolve(query.exec());
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
