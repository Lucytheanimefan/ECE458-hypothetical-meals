var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var FinalProduct = require('../models/final_product');
var IngredientHelper = require('../helpers/ingredients');
var InventoryHelper = require('../helpers/inventory');
var Spending = require('../models/spending');
var Vendor = require('../models/vendor');
var OrderHelper = require('../helpers/orders');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

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

module.exports.addToSaleList = function(id, fpId, quantity, price) {
  return new Promise(function(resolve, reject) {
    var user;
    User.getUserById(id).then(function(userResult) {
      user = userResult;
      if (user == null) {
        var error = new Error('Specified user doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      for (let fp of user.saleList) {
        if (fpId.toString() === fp.finalProduct.toString()) {
          throw(new Error('That final product is already in the cart'));
        }
      }
      return User.addToSaleList(id, fpId, quantity, price);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.removeSale = function(id, fpId) {
  return new Promise(function(resolve,reject){
    var result = User.removeSale(id, fpId);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
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

module.exports.placeOrder = function(userId) {
  return new Promise(function(resolve, reject) {
    var cart;
    var orderPromises = [];
    var removeOrderPromises = [];
    User.getUserById(userId).then(function(user) {
      cart = user.cart;
      var promises = [];
      for (let order of cart) {
        var tuple = {};
        var orderInfo = {};
        tuple['vendor'] = order.vendor;
        tuple['quantity'] = order.quantity;
        orderInfo['vendor'] = order.vendor;
        orderInfo['ingID'] = order.ingredient;
        orderInfo['amount'] = order.quantity;
        orderPromises.push(orderInfo);
        promises.push(exports.updateIngredientOnCheckout(mongoose.Types.ObjectId(order.ingredient), [tuple]));
        removeOrderPromises.push(exports.removeOrder(userId, order.ingredient));
      }
      return Promise.all(promises);
    }).then(function(ings) {
      var checkoutIngredientLog = '';
      if (ings != null) {
        for (var i = 0; i < ings.length; i++) {
          checkoutIngredientLog += '<li><a href="/ingredients/' + ings[i].name + '">' + ings[i].name + '</a></li>'
        }
      }
      return "done";
    }).then(function(results) {
      return OrderHelper.addOrder(orderPromises);
    }).then(function(results){
      return Promise.all(removeOrderPromises);
    }).then(function(results){
      resolve(results);
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
      let invCheck = InventoryHelper.checkInventory(ing.name, ing.package, ing.temperature, ing.unitsPerPackage, parseFloat(ing.amount) + totalPackages*parseFloat(ing.unitsPerPackage));
      return invCheck;
    }).then(function(update) {
      if (update) {
        return true;
      } else {
        throw new Error('Not enough space in inventory for ingredient ' + ing.name);
      }
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

module.exports.checkVendor = function(id, vendID) {
  return new Promise(function(resolve, reject) {
    var userQuery = User.getUserById(id);
    var cart;
    var ingredients = [];
    userQuery.then(function(user) {
      cart = user.cart;
      if(cart.length<=0){
        resolve();
      }
      for (i = 0; i < cart.length; i++) {
        var order = cart[i];
        var vendor = order.vendor;
        var promises = [];
        if (vendor.toString() === vendID.toString()) {
          promises.push(Ingredient.getIngredientById(order.ingredient));
        }
      }
      return Promise.all(promises);
    }).then(function(ings) {
      var promises = [];
      for (let ing of ings) {
        ingredients.push(ing._id);
        promises.push(IngredientHelper.findCheapestVendor(ing.name));
      }
      return Promise.all(promises);
    }).then(async function(vends) {
      var promises = [];
      for (v = 0; v < vends.length; v++) {
        await exports.addToCart(id, ingredients[v], 0, vends[v].name);
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}
