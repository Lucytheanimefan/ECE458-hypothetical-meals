var Log = require('../models/log');



module.exports.makeIngredientLog = function(title, ingredient, entities = ['ingredient'], initiating_user) {
  makeLog('Ingredient Action: ' + title, JSON.stringify(ingredient), entities, initiating_user);
}

module.exports.makeUserLog = function(title, user, entities = ['user'], initiating_user) {
  delete user['password'];
  makeLog('User Action: ' + title, JSON.stringify(user), entities, initiating_user);
}

module.exports.makeVendorLog = function(title, vendor, entities = ['vendor'], initiating_user){
  makeLog('Vendor Action: ' + title, JSON.stringify(vendor), entities, initiating_user);
}

module.exports.makeLog = function(title, description, entities = [], initiating_user){
  makeLog(title, description, entities, initiating_user);
}


makeLog = function(title, description, entities, initiating_user) {
  let log_data = {
    'title': title,
    'description': description,
    'entities': entities,
    'initiating_user': initiating_user
  }
  Log.create(log_data, function(error, log) {
    if (error) {
      console.log('Error logging user data: ');
      console.log(error);
      //return next();
    }
    console.log('Logged user: ' + log);
    //return next();
  })
}