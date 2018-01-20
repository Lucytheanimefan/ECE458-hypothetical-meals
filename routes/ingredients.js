var express = require('express');
var router = express.Router();
var Ingredient = require('../models/ingredient');

//GET request to show available ingredients
router.get('/', function(req, res) {
	res.render('ingredient');
})

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
	Ingredient.create({
		name: req.body.name,
		package: req.body.package,
		temperature: req.body.temperature
	}, function (error, newInstance) {
		if (error) {
			return next(error);
		} else {
			//alert user the ingredient has been successfully added.
		}
	});
});

//PUT request to update an existing ingredient
// router.put('/update', function(req, res) {
// 	Ingredient.findOneAndUpdate({name: req.body.name}, function());
// })

module.exports = router;