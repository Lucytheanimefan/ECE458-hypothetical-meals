var mongoose = require('mongoose');
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));

var IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  package: {
    type: String,
    enum: ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'],
    required: true,
    trim: true
  },
  temperature: {
    type: String,
    enum: ['frozen', 'refrigerated', 'room temperature'],
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  }
});


IngredientSchema.pre('save', function(next, req, callback) {
  var ingredient = this;
  let log_data = {
    'title': 'Ingredient created',
    'description': ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount,
    'entities': 'ingredient'/*,
    'user': user.username + ', ' + user.role*/
  }
  Log.create(log_data, function(error, log) {
    if (error) {
      console.log('Error logging ingredient data: ');
      console.log(error);
      return next();
    }
    console.log(log);
    return next();
  })

  // User.current_user(req, function(error, user) {
  //   if (error) {
  //     console.log(error);
  //     return next(error);
  //   } else {
  //     let log_data = {
  //       'title': 'Ingredient Log',
  //       'description': ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount,
  //       'entities': 'ingredient',
  //       'user': user.username + ', ' + user.role
  //     }
  //     Log.create(log_data, function(error, user) {
  //       if (error) {
  //         console.log('Error logging ingredient data: ');
  //         console.log(error);
  //         return next();
  //       }
  //       return next();
  //     })
  //   }
  // })


});

IngredientSchema.pre('update', function(next) {
  console.log('Updating ingredient, need to log!');
  var ingredient = this;
  let log_data = {
    'title': 'Ingredient updated',
    'description': ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount,
    'entities': 'ingredient'/*,
    'user': user.username + ', ' + user.role*/
  }
  Log.create(log_data, function(error, user) {
    if (error) {
      console.log('Error logging ingredient data: ');
      console.log(error);
      return next();
    }
    return next();
  })
});


var Ingredient = mongoose.model('Ingredient', IngredientSchema);
module.exports = Ingredient;