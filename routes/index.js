var express = require('express');
var router = express.Router();

var User = require('../models/user');

/* GET home page. */
router.get('/', function(req, res, next) {
  // User.findById(req.session.userId)
  //        .exec(function(error, user) {
  //            if (error) 
  //            {
  //                return next(error);
  //            } 
  //            else if (user === null)
  //            {
  //            	res.redirect('/users');
  //            }
  //            else {
  //            	let isAdmin = (user.role.toUpperCase() !== "ADMIN");

  //                return res.render('index', { title: 'Hypothetical Meals', admin: isAdmin });

  //            }
  //        });
  res.render('index', { title: 'Hypothetical Meals' });
});

module.exports = router;