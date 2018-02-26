var User = require('../models/user');
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var underscore = require('underscore');

// TODO for refactoring
module.exports.encryptUserData = function(req, res, next) {

}

module.exports.addToCart = function(id, ingId, quantity, vendor) {
  console.log("add");
  return new Promise(function(resolve,reject) {
    var userQuery = User.getUserById(id);
    var user, vendors, code;
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
      var entry = {'name': vendor, 'code': code, 'quantity': quantity};
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
