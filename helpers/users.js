var User = require('../models/user');
var Token = require('../models/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');


// TODO for refactoring
module.exports.encryptUserData = function(req, res, next) {

}

module.exports.addToCart = function(id, ingredient, quantity, vendor) {
  return new Promise(function(resolve,reject) {
    var userQuery = User.getUserById(id);
    userQuery.then(function(user) {
      if (user == null) {
        var error = new Error('Specified user doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      if(parseFloat(quantity) < 0){
        var error = new Error('Invalid quantity: ${quantity}. Please enter a valid quantity.');
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
      return User.addToCart(id, ingredient, quantity, vendor);
    }.then(function(result) {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
});
