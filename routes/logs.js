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

    // logs = logs.map(function(log) {
    //   let id = log.initiating_user;
    //   User.findById(id)
    //     .exec(function(error, user) {
    //       log['initiating_user'] = user.username;
    //       return log;
    //     });
    // });
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

module.exports = router;

module.exports.makeIngredientLog = function(title, ingredient, entities = ['ingredient'], initiating_user) {
  makeLog('Ingredient Action: ' + title, JSON.stringify(ingredient), entities, initiating_user);
}

module.exports.makeUserLog = function(title, user, entities = ['user'], initiating_user) {
  delete user['password'];
  makeLog('User Action: ' + title, JSON.stringify(user), entities, initiating_user);
}

module.exports.makeVendorLog = function(title, vendor, entities = ['vendor'], initiating_user) {
  makeLog('Vendor Action: ' + title, JSON.stringify(vendor), entities, initiating_user);
}

// General purpose
module.exports.makeLog = function(title, description, entities = [], initiating_user) {
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