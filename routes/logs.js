var Log = require('../models/log');
var User = require('../models/user');
var express = require('express');
var router = express.Router();


router.get('/:page?', (req, res, next) => {
  var page = parseInt(req.params.page);
  if (page == null || isNaN(page) || page < 0) {
    page = 0;
  }
  Log.paginate( /*perPage*/ 10, page, function(err, logs) {
    if (err) {
      next(err);
    }
    res.render('logs', { logs: logs, page: page });
  })

  // Log.all(function(err, logs) {
  //   if (err) {
  //     console.log('Error getting logs: ');
  //     console.log(err);
  //     return next(err);
  //   }
  //   res.render('logs', { logs: logs });
  // });
});

router.get('/log/:id', (req, res, next) => {
  console.log(req.query)
  let title = req.query.title
  // User.findById(req.params.userid)
  //   .exec(function(error, user) {
  Log.findOne({ '_id': req.params.id }).exec(function(err, log) {
    if (err) {
      callback(err);
    }
    res.render('log', {
      title: log.title,
      time: log.time,
      description: log.description,
      user: log.initiating_user
    })
  })
  // });
})

router.get('/date', (req, res, next) => {
  let startDate = req.query.start;
  let endDate = req.query.end;
  //new Date(2012, 7, 14)
  Log.find({ 'time': { "$gte": startDate, "$lt": endDate } }).exec(function(err, logs) {
    if (err) {
      return next(err);
    }
    res.render('logs', { logs: logs });
  })
})

router.post('/delete', (req, res, next) => {
  console.log('Delete logs!');
  Log.remove({}, function(err) {
    if (err) {
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
  makeLog('Vendor Action: ' + title, vendor, initiating_user);
}

// General purpose
module.exports.makeLog = function(title, description, initiating_user) {
  makeLog(title, description, initiating_user);
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