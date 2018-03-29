var Log = require('../models/log');
var User = require('../models/user');
var express = require('express');
var router = express.Router();


router.get('/', (req, res, next) => {
  res.redirect(req.baseUrl + '/page/0');
});

router.get('/page/:page?', (req, res, next) => {
  console.log('LOGS BY PAGE');
  var page = parseInt(req.params.page);
  if (page == null || isNaN(page) || page < 0) {
    page = 0;
  }
  var perPage = 10;
  var startDate = req.query.start;
  var endDate = req.query.end;
  var query = {};
  // if (startDate != null && endDate != null && startDate.length > 0 && endDate.length > 0) {
  //   query = { 'time': { "$gte": startDate, "$lt": endDate } };
  // }
  Log.paginate(query, perPage, page, function(err, logs) {
    if (err) {
      console.log(err);
      next(err);
    }
    var maxPage = false;
    console.log('Num logs: ' + logs.length);
    if (logs.length < perPage) {
      maxPage = true;
    }
    res.render('logs', { logs: logs, page: page, maxPage: maxPage, startDate: startDate, endDate: endDate });
  })
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

router.get('/date/:page?', (req, res, next) => {
  console.log('GET DATE!');
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);
  console.log('Start date: ' + startDate);
  console.log('End date: ' + endDate);
  console.log(typeof(startDate));
  var page = parseInt(req.params.page);
  if (page == null || isNaN(page) || page < 0) {
    page = 0;
  }
  var perPage = 10;
  Log.paginate({ 'time': { "$gte": startDate, "$lte": endDate } }, perPage, page, function(err, logs) {
    if (err) {
      console.log(err);
      next(err);
    }
    if (logs == null){
      logs = [];
    }
    var maxPage = false;
    console.log('Num logs: ' + logs.length);
    if (logs.length < perPage) {
      maxPage = true;
    }
    res.render('logs', { logs: logs, page: page, maxPage: maxPage, startDate: req.query.start, endDate: req.query.end });
  })

  // Log.find({ 'time': { "$gte": startDate, "$lt": endDate } }).exec(function(err, logs) {
  //   if (err) {
  //     console.log(err);
  //     return next(err);
  //   }

  //   res.render('logs', { logs: logs, page: 0, maxPage: true, startDate: startDate, endDate: endDate });
  // })
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