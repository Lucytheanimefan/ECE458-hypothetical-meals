var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');
var InventoryHelper = require('./inventory');
var VendorHelper = require('./vendor');
var Vendor = require('../models/vendor');
var UserHelper = require('./users');
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
        resolve(results[1]);
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
        resolve(results);
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

//TODO: remove inventory check/update
module.exports.incrementAmount = function(id, amount) {
  return new Promise(function(resolve, reject) {
    var newAmount;
    var ing;
    Ingredient.getIngredientById(id).then(function(result) {
      ing = result;
      newAmount = parseFloat(ing.amount) + parseFloat(amount);
      if (newAmount < 0) {
        var error = new Error('Storage amount must be a non-negative number');
        error.status = 400;
        throw error;
      } else {
        return InventoryHelper.checkInventory(ing.name, ing.package, ing.temperature, ing.unitsPerPackage, newAmount);
      }
    }).then(function(update) {
      if (update) {
        return Promise.all([InventoryHelper.updateInventory(ing.name, ing.package, ing.temperature, ing.unitsPerPackage, newAmount),
          Ingredient.incrementAmount(ing.name, amount)])
      } else {
        var error = new Error('Not enough room in inventory!');
        error.status = 400;
        throw error;
      }
    }).then(function(results) {
      resolve("updated ingredient!");
    }).catch(function(error) {
      reject(error);
    })
  })
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

vendorQuery = function(ing) {
  return Vendor.model.find({ 'catalogue.ingredient': ing });
}

findCheapestVendor = function(ing) {
  return new Promise(function(resolve, reject) {
    vendorQuery(ing).then(function(vendors) {
      let min = Number.MAX_SAFE_INTEGER;
      let minVendor;
      if (vendors.length == 0) {
        reject(new Error('No vendors sell ' + ing.name + '!'));
        return;
      }
      for (let vendor of vendors) {
        for (j = 0; j < vendor['catalogue'].length; j++) {
          if (vendor['catalogue'][j]['ingredient'].toString() == ing['_id']) {
            min = Math.min(parseFloat(vendor['catalogue'][j]['cost']), min)
            minVendor = vendor;
            break;
          }
        }
      }
      resolve(minVendor);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.addOrderToCart = function(userId, ingredient, amount) {
  console.log(amount);
  return new Promise(function(resolve, reject) {
    var ing;
    Ingredient.getIngredient(ingredient).then(function(result) {
      ing = result;
      return findCheapestVendor(ing)
    }).then(function(vendor) {
      let packages = Math.ceil(parseFloat(amount) / parseFloat(ing['unitsPerPackage']));
      return UserHelper.addToCart(userId, ingredient, packages, vendor.name);
    }).then(function(result) {
      resolve();
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.compareAmount = function(id, amount) {
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredientById(id).then(function(ing) {
      let object = {};
      object['ingredient'] = ing.name;
      object['currentAmount'] = ing.amount;
      object['neededAmount'] = amount;
      if (parseFloat(ing.amount) < parseFloat(amount)) {
        object['enough'] = false;
        resolve(object);
      } else {
        object['enough'] = true;
        resolve(object);
      }
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.addVendor = function(name, vendorId, cost) {
  let vendorObjectId = mongoose.Types.ObjectId(vendorId);
  return new Promise(function(resolve, reject) {
    var vendorQuery = Vendor.model.findById(vendorObjectId);
    Promise.all([vendorQuery.exec(), Ingredient.getIngredient(name)]).then(function(results) {
      let vendor = results[0];
      let ing = results[1];
      if (vendor == null) {
        var error = new Error('The specified vendor doesn\'t exist!');
        error.status = 400;
        throw error;
      } else {
        return Promise.all([Ingredient.addVendor(name, vendorObjectId), Vendor.addIngredient(vendor['code'], mongoose.Types.ObjectId(ing['_id']), cost)]);
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}
