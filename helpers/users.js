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
    var userQuery = User.getUserById(id);
    var user, vendors;
    userQuery.then(function(userResult) {
      user = userResult;
      if (userResult == null) {
        var error = new Error('Specified user doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      var ingQuery = Ingredient.getIngredientById(ingId);
      return ingQuery;
    }).then(function(ingResult) {
      if (ingResult == null) {
        var error = new Error('The ingredient ${ingredient} does not exist!');
        error.status = 400;
        throw(error);
      }
      var vendQuery = Vendor.findVendorByName(vendor);
      return vendQuery;
    }).then(function(vendResult) {
      code = vendResult.code;
      var entry = {'vendID': vendResult._id, 'quantity': quantity};
      for (let ing of user.cart) {
        if (ingId.toString() === ing.ingredient.toString()) {
          var total = quantity + ing.quantity;
          vendors = ing.vendors;
          var addVend = true;
          for (let vend of vendors) {
            if (vendor === vend.name) {
              var vendTotal = quantity + vend.quantity;
              vend['quantity'] = vendTotal;
              addVend = false;
              break;
            }
          }
          if (addVend) {
            vendors.push(entry);
          }
          console.log("VENDORS");
          console.log(vendors);
          //vendors = underscore.sortBy(vendors, "ingredient");
          return User.updateCart(id, ingId, total, vendors);
        }
      }
      vendors = [];
      vendors.push(entry);
      //vendors = underscore.sortBy(vendors, "ingredient");
      return User.addToCart(id, ingId, quantity, vendors);
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
    Ingredient.getIngredientById(ingId).then(function(result){
      ing = result;
      return Promise.all(vendors.map(function(tuple) {
        return new Promise(function(resolve, reject) {
          Vendor.findVendorByName(tuple.name).then(function(vendor) {
            tuple['vendor'] = vendor;
            resolve(tuple);
          }).catch(function(error) {
            reject(error);
          })
        });
      }));
    }).then(function(results) {
      let totalCost = 0;
      let averageCost = 0;
      let totalPackages = 0;
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
      let ingCostUpdate = IngredientHelper.updateCost(ing.name, totalPackages, averageCost);
      let spendingUpdate = Spending.updateReport(ingId, ing.name, totalCost, 'spending');
      return Promise.all([ingUpdate, ingCostUpdate, spendingUpdate]);
    }).then(function(results) {
      resolve();
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
    for (i = 0; i < orderVendors.length; i++) {
      quantities.push(orderVendors[i].quantity);
      promises.push(Vendor.model.findById(orderVendors[i].vendID));
    }
    Promise.all(promises).then(function(vends) {
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

module.exports.deleteVendor = function(id) {
  return new Promise(function(resolve, reject) {
    var userQuery = User.getUserById(id);
    var cart;
    userQuery.then(function(user) {
      cart = user.cart;
      //var promises = [];
      for (i = 0; i < cart.length; i++) {
        var order = cart[i];
        for (j = 0; j < order.length; j++) {
          var vendor = order[j];
          var promise = Vendor.model.findById(vendor);
          promise.then(function(result) {
            if (result == null) {
              console.log("deleting order");
              delete order[j];
              j--;
            }
          }).catch(function(error) {
            next(error);
          })
        }
        if (order.length == 0) {
          delete cart[i];
        }
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}
