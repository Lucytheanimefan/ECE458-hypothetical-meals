var express = require('express');
var router = express.Router();
var User = require('../models/user');

router.get('/report', function(req, res, next) {
  User.count({ _id: req.session.userId }, function(err, count) {
    if (err) return next(err);

    if (count > 0) {
      User.findById(req.session.userId, function(err, user) {
        if (err) return next(err);

        let report = user.report[0]; //["cart"][0];
        var ingredients = [];

        for (ingredient in report) {
          ingredients.push({ "ingredient": ingredient, "report": report[ingredient] });
        }

        ingredients = underscore.sortBy(ingredients, "ingredient");
        return res.render('report', { ingredients });
      });
    }
  });
});
