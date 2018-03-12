var Log = require('../models/log');
var User = require('../models/user');
var express = require('express');
var router = express.Router();


router.get('/', (req, res, next) => {
  Log.all(function(err, logs) {
    if (err) {
      console.log('Error getting logs: ');
      console.log(err);
      return next(err);
    }
    res.render('logs', { logs: logs });
  });
});

router.get('/log/:userid', (req, res, next) => {
  console.log(req.query)
  let title = req.query.title
  User.findById(req.params.userid)
    .exec(function(error, user) {
      res.render('log', {
        title: req.query.title,
        time: req.query.time,
        description: req.query.description,
        entities: req.query.entities,
        user:user.username
      })
    });
})

router.post('/delete', (req, res, next) => {
  console.log('Delete logs!');
  Log.remove({}, function(err){
    if (err){
      console.log(err);
      next(err);
    }
    res.redirect(req.baseUrl);
  })
})

module.exports = router;

module.exports.makeIngredientLog = function(title, ingredient, initiating_user) {
  makeLog('Ingredient Action: ' + title, ingredient, initiating_user);
}

module.exports.makeUserLog = function(title, user, initiating_user) {
  delete user['password'];
  makeLog('User Action: ' + title, user, initiating_user);
}

module.exports.makeVendorLog = function(title, vendor, initiating_user) {
  makeLog('Vendor Action: ' + title, vendor, entities, initiating_user);
}

// General purpose
module.exports.makeLog = function(title, description, initiating_user) {
  makeLog(title, description, entities, initiating_user);
}


makeLog = function(title, description, initiating_user) {
  let log_data = {
    'title': title,
    'description': description,
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