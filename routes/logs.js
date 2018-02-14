var Log = require('../models/log');



module.exports.makeIngredientLog = function(ingredient, entities = 'ingredient', initiating_user) {
  makeLog('Ingredient Action', ingredient.name + ', ' + ingredient.package + ', ' + ingredient.temperature + ', ' + ingredient.amount, entities, initiating_user);
}

module.exports.makeUserLog = function(ingredient, entities = 'user', initiating_user) {
  makeLog('User Action', user.username + ', ' + user.email + ', ' + user.role, entities, initiating_user);
}

makeLog = function(title, description, entities, initiating_user) {
  let log_data = {
    'title': title,
    'description': description,
    'entities': entities,
    'initiating_user': initiating_user
    /*,
        'user': user.username + ', ' + user.role*/
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