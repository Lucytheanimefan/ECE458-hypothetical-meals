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
var Completed = require('../models/completed_production');
var Recall = require('../models/recall');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports.createIngredient = function(name, package, temp, nativeUnit, unitsPerPackage) {
  return new Promise(function(resolve, reject) {
    if (unitsPerPackage <= 0) {
      var error = new Error('Units per package must be a positive number');
      error.status = 400;
      reject(error);
    } else {
      Ingredient.createIngredient(name, package, temp, nativeUnit, unitsPerPackage).then(function(result) {
        resolve(result);
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

module.exports.updateIngredient = function(name, newName, package, temp, nativeUnit, unitsPerPackage) {
  var returnIng;
  var currentIng;
  return new Promise(function(resolve, reject) {
    if (unitsPerPackage <= 0) {
      var error = new Error('Units per package must be a positive number');
      error.status = 400;
      reject(error);
    } else {
      Ingredient.getIngredient(name).then(function(ing) {
        currentIng = ing;
        return InventoryHelper.checkInventory(name, package, temp, unitsPerPackage, parseFloat(currentIng.amount))
      }).then(function(update) {
        if (update) {
          return InventoryHelper.updateInventory(name, package, temp, unitsPerPackage, parseFloat(currentIng.amount));
        } else {
          var error = new Error('Not enough room in inventory!');
          error.status = 400;
          throw error;
        }
      }).then(function(result) {
        return Ingredient.updateIngredient(name, newName, package, temp, nativeUnit, unitsPerPackage);
      }).then(function(result) {
        return FormulaHelper.updateTuples(newName, result._id);
      }).then(function(result) {
        resolve(returnIng);
      }).catch(function(error) {
        reject(error);
      });
    }
  });
}

module.exports.checkAndUpdateInventory = function(name, package, temperature, unitsPerPackage, newAmount) {
  return new Promise(function(resolve, reject) {
    InventoryHelper.checkInventory(name, package, temperature, parseFloat(unitsPerPackage), newAmount).then(function(update) {
      if (update) {
        return InventoryHelper.updateInventory(name, package, temperature, parseFloat(unitsPerPackage), newAmount);
      } else {
        var error = new Error('Not enough room in inventory!');
        error.status = 400;
        throw error;
      }
    }).then(function(inv) {
      resolve(inv);
    }).catch(function(error) {
      reject(error);
    })
  })
}

//TODO: remove inventory check/update
module.exports.incrementAmount = function(id, amount, vendorID='admin', lotNumber=0) {
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
        return exports.checkAndUpdateInventory(ing.name, ing.package, ing.temperature, parseFloat(ing.unitsPerPackage), newAmount);
      }
    }).then(function(result) {
      if (amount > 0) {
        return Ingredient.incrementAmount(ing.name, amount, vendorID, lotNumber);
      } else if (amount < 0) {
        return Ingredient.decrementAmount(ing.name, -amount);
      } else {
        return result;
      }
    }).then(function(result) {
      return Ingredient.updateSpace(ing.name);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.decrementAmountForProduction = function(id, amount, formula, lotNumber) {
  return new Promise(function(resolve, reject) {
    var newAmount;
    var ing;
    var lotsConsumed;
    Ingredient.getIngredientById(id).then(function(result) {
      ing = result;
      newAmount = parseFloat(ing.amount) + parseFloat(amount);
      if (newAmount < 0) {
        var error = new Error('Storage amount must be a non-negative number');
        error.status = 400;
        throw error;
      } else {
        return exports.checkAndUpdateInventory(ing.name, ing.package, ing.temperature, parseFloat(ing.unitsPerPackage), newAmount);
      }
    }).then(function(result) {
      return Ingredient.decrementAmount(ing.name, amount);
    }).then(async function(results) {
      lotsConsumed = results[1];
      for (let lot of lotsConsumed) {
        var time = Date.now() - lot.timestamp;
        await Freshness.updateFreshnessReport(lot.ingID, lot.ingName, lot.amount, time);
        await Completed.updateReport(formula.name, lotNumber, lot.ingID, lot.lotNumber, lot.vendorID);
        delete lot['timestamp'];
        delete lot['amount'];
      }
      return "done";
    }).then(function(result) {
      return Ingredient.updateSpace(ing.name);
    }).then(function(result) {
      resolve(lotsConsumed);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.sendIngredientsToProduction = function(formulaId, ingId, amount, lotNumber) {
  return new Promise(function(resolve, reject) {
    var ing;
    Promise.all([Ingredient.getIngredientById(ingId), Formula.model.findById(formulaId)]).then(function(results) {
      ing = results[0];
      let formula = results[1];
      let spent = parseFloat(ing.averageCost) * parseFloat(amount);
      return Promise.all([exports.decrementAmountForProduction(ingId, amount, formula, lotNumber), Spending.updateReport(ingId, ing.name, spent, 'production'), Production.updateReport(formulaId, formula, 0, spent)]);
    }).then(function(results) {
      let productionObject = {}
      productionObject['ingredient'] = ing;
      productionObject['unitsProduced'] = amount;
      resolve(results[0]);
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports.updateIngredientByLot = function(name, oldAmount, newAmount, lotID) {
  var ing;
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredient(name).then(function(result) {
      ing = result;
      var newIngAmount = parseFloat(ing.amount) + parseFloat(newAmount - oldAmount);
      if (newAmount < 0) {
        var error = new Error('Storage amount must be a non-negative number');
        error.status = 400;
        throw error;
      } else {
        return exports.checkAndUpdateInventory(ing.name, ing.package, ing.temperature, parseFloat(ing.unitsPerPackage), newIngAmount);
      }
    }).then(function(result) {
      return Promise.all([Ingredient.justIncrementAmount(name, parseFloat(newAmount - oldAmount)), Ingredient.editLot(name, newAmount, lotID)]);
    }).then(function(result) {
      return Ingredient.updateSpace(name);
    }).then(function(result) {
      resolve(ing);
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

module.exports.deleteLot = function(name, lotID, amount) {
  return new Promise(function(resolve, reject) {
    var returnIng;
    Ingredient.getIngredient(name).then(function(ing) {
      returnIng = ing;
      return InventoryHelper.updateInventory(name, ing.package, ing.temperature, ing.unitsPerPackage, parseFloat(ing.amount - amount));
    }).then(function(result) {
      return Ingredient.justIncrementAmount(name, -amount);
    }).then(function(result) {
      return Promise.all([Ingredient.updateSpace(name), Ingredient.removeLot(name, mongoose.Types.ObjectId(lotID))]);
    }).then(function(result) {
      resolve(result[0]);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.updateCost = function(name, newPackages, price) {
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredient(name).then(function(ing) {
      let unitsPerPackage = parseFloat(ing.unitsPerPackage);
      let currentTotal = parseFloat(ing.amount) * parseFloat(ing.averageCost);
      let newTotal = parseFloat(newPackages) * parseFloat(price);
      let newAverage = (currentTotal + newTotal) / (parseFloat(newPackages) * unitsPerPackage + parseFloat(ing.amount));
      ing.averageCost = newAverage;
      return ing.save();
    }).then(function(ing) {
      resolve(ing.averageCost);
    }).catch(function(error) {
      reject(error);
    })
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

module.exports.checkIfVendorSells = function(ingName) {
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredient(ingName).then(function(result) {
      return vendorQuery(result);
    }).then(function(vendors) {
      if (vendors.length == 0) {
        reject(new Error('No vendor(s) sell ' + ingName + '!'));
      } else {
        resolve(vendors);
      }
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports.findCheapestVendor = function(ingName) {
  return new Promise(function(resolve, reject) {
    Promise.all([exports.checkIfVendorSells(ingName), Ingredient.getIngredient(ingName)]).then(function(results) {
      let vendors = results[0];
      let ing = results[1];
      let min = Number.MAX_SAFE_INTEGER;
      let minVendor;
      minVendor = vendors[0];
      for (let vendor of vendors) {
        for (j = 0; j < vendor['catalogue'].length; j++) {
          if (vendor['catalogue'][j]['ingredient'].toString() == ing['_id']) {
            minVendor = (parseFloat(vendor['catalogue'][j]['cost']) < min) ? vendor : minVendor;
            min = Math.min(parseFloat(vendor['catalogue'][j]['cost']), min)
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
    var vendor;
    Ingredient.getIngredient(ingredient).then(function(result) {
      ing = result;
      return exports.findCheapestVendor(ingredient)
    }).then(function(result) {
      console.log('reeeeeeeeeeeeeeee');
      console.log(result);
      vendor = result;
      let packages = Math.ceil(parseFloat(amount) / parseFloat(ing['unitsPerPackage']));
      console.log("CHEAPEST VENDOR " + vendor.name);
      return UserHelper.addToCart(userId, mongoose.Types.ObjectId(ing['_id']), packages, vendor.name);
    }).then(function(result) {
      resolve([vendor, ing]);
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
      object['intermediate'] = ing.isIntermediate;
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
        return Promise.all([Ingredient.addVendor(name, vendorObjectId), VendorHelper.addIngredient(vendor['code'], mongoose.Types.ObjectId(ing['_id']), cost)]);
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}
