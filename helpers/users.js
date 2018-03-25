var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var Spending = require('../models/spending');
var Vendor = require('../models/vendor');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');

// TODO for refactoring
module.exports.encryptUserData = function(req, res, next) {

}

module.exports.getVendorID = function(vendorName) {
  return new Promise(function(resolve, reject) {
    var id;
    var vendQuery = Vendor.findVendorByName(vendorName);
    vendQuery.then(function(vendor) {
      id = vendor._id;
      return id;
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      next(error);
    })
  })
}

module.exports.addToCart = function(id, ingId, quantity, vendor) {
  return new Promise(function(resolve,reject) {
    var user, vendorID;
    Vendor.findVendorByName(vendor).then(function(vend) {
      vendorID = vend._id;
      return User.getUserById(id)
    }).then(function(userResult) {
      user = userResult;
      if (userResult == null) {
        var error = new Error('Specified user doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      return Ingredient.getIngredientById(ingId);
    }).then(function(ingResult) {
      if (ingResult == null) {
        var error = new Error('The ingredient ${ingredient} does not exist!');
        error.status = 400;
        throw(error);
      }
      for (let ing of user.cart) {
        if (ingId.toString() === ing.ingredient.toString()) {
          var total = quantity + ing.quantity;
          console.log(quantity);
          console.log(ing.quantity);
          console.log("total = " + total);
          return User.updateCart(id, ingId, total, vendorID);
        }
      }
      return User.addToCart(id, ingId, quantity, vendorID);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.removeOrder = function(id, ingId) {
  var ingQuery = Ingredient.getIngredientById(ingId);
  return new Promise(function(resolve,reject){
    var result = User.removeOrder(id, ingId);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.updateCart = function(id) {
  var cart;
  var ingredients = [];
  var ids = [];
  return new Promise(function(resolve,reject) {
    var userQuery = User.getUserById(id);
    userQuery.then(function(user) {
      cart = user.cart;
      var promises = [];
      for (let order of cart) {
        promises.push(Ingredient.getIngredientById(order.ingredient));
      }
      return Promise.all(promises);
    }).then(function(ings) {
      var promises = [];
      for (let ing of ings) {
        if (ing != null) {
          ingredients.push(ing.name);
          ids.push(ing._id.toString());
        }
      }
      for (i = 0; i < cart.length; i++) {
        if (ids.indexOf(cart[i].ingredient.toString()) == -1) {
          promises.push(exports.removeOrder(id, cart[i].ingredient));
        }
      }
      return Promise.all(promises);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.updateIngredientOnCheckout = function(ingId, vendors) {
  return new Promise(function(resolve, reject) {
    var ing;
    var totalCost;
    var averageCost;
    var totalPackages;
    Ingredient.getIngredientById(ingId).then(function(result) {
      ing = result;
      return Promise.all(vendors.map(function(tuple) {
        return new Promise(function(resolve, reject) {
          Vendor.model.findById(tuple.vendor).then(function(vendor) {
            tuple['vendor'] = vendor;
            resolve(tuple);
          }).catch(function(error) {
            reject(error);
          })
        });
      }));
    }).then(function(results) {
      totalCost = 0;
      averageCost = 0;
      totalPackages = 0;
      for (let tuple of results) {
        let vendor = tuple['vendor'];
        for (j = 0; j < vendor['catalogue'].length; j++) {
          if (vendor['catalogue'][j]['ingredient'].toString() == ing['_id']) {
            let quantity = parseFloat(tuple.quantity);
            let cost = parseFloat(vendor['catalogue'][j]['cost']);
            totalCost += cost*quantity;
            averageCost = (averageCost*totalPackages+cost*quantity)/(totalPackages+quantity);
            totalPackages += quantity;
          }
        }
      }
      let ingUpdate = IngredientHelper.incrementAmount(ingId, totalPackages*parseFloat(ing.unitsPerPackage));
      return ingUpdate;
    }).then(function(result) {
      let ingCostUpdate = IngredientHelper.updateCost(ing.name, totalPackages, averageCost);
      let spendingUpdate = Spending.updateReport(ingId, ing.name, totalCost, 'spending');
      return Promise.all([ingCostUpdate, spendingUpdate]);
    }).then(function(results) {
      resolve(results);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getCartVendors = function(orderVendors) {
  return new Promise(function(resolve, reject) {
    var promises = [];
    var vendors = [];
    var quantities = [];
    for (j = 0; j < orderVendors.length; j++) {
      quantities.push(orderVendors[j].quantity);
      promises.push(Vendor.model.findById(orderVendors[j].vendID));
    }
    Promise.all(promises).then(function(vends) {
      console.log("maybe i am the dragon born and just don't know it!");
      console.log(vends);
      for (i = 0; i < vends.length; i++) {
        if (vends[i] != null) {
          var entry = {'name': vends[i].name, 'code': vends[i].code, 'quantity': quantities[i]};
          vendors.push(entry);
        }
      }
      return vendors;
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.deleteVendor = function(id, vendID) {
  return new Promise(function(resolve, reject) {
    var userQuery = User.getUserById(id);
    var cart;
    userQuery.then(async function(user) {
      cart = user.cart;
      for (i = 0; i < cart.length; i++) {
        var order = cart[i];
        for (j = 0; j < order.vendors.length; j++) {
          var vendor = order.vendors[j];
          if (vendor.vendID.toString() === vendID.toString()) {
            var index = order.vendors.indexOf(vendor);
            order.vendors.splice(index,1);
            j--;
            var newQuantity = order.quantity - vendor.quantity;
            await User.updateCart(id, order.ingredient, newQuantity, order.vendors);
          }
        }
        if (order.vendors.length == 0) {
          await User.removeOrder(id, order.ingredient);
        }
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.isVendorNull = function(vendID) {
  return new Promise(function(resolve, reject) {
    var promise = Vendor.model.findById(vendID);
    promise.then(function(vend) {
      return (vend == null);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}
