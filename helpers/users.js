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

module.exports.addToCart = function(id, ingredient, quantity, vendor) {
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
      var ingQuery = Ingredient.getIngredient(ingredient);
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
        if (ingredient === ing.ingredient) {
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
          vendors = underscore.sortBy(vendors, "ingredient");
          return User.updateCart(id, ingredient, total, vendors);
        }
      }
      vendors = [];
      vendors.push(entry);
      vendors = underscore.sortBy(vendors, "ingredient");
      return User.addToCart(id, ingredient, quantity, vendors);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.removeOrder = function(id, ingredient) {
  var ingQuery = Ingredient.getIngredient(ingredient);
  return new Promise(function(resolve,reject){
    var result = User.removeOrder(id, ingredient);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}
