var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var uniqid = require('uniqid')

//GET request to show available ingredients
router.get('/', function(req, res) {
  /*
  Vendor.find({}, function(error, vendors) {
    if (error) {
      var err = new Error('Error loading vendors ');
      err.status = 400;
      return next(err);
    } else {
      //res.render('ingredients', { ingredients: ings });
      res.render('vendor');
    }
  })*/
  res.render('vendors');
})

router.get('/:code', function(req, res, next) {
  Vendor.findOne({code: req.params.code}, function(error, ing) {
    if (ing == null) {
      var err = new Error('That vendor doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {
      res.render('vendor', { vendor: ing });
    }
  })
})

//POST request to delete an existing ingredient
router.post('/:code/delete', function(req, res, next) {
  Vendor.findOneAndRemove({code: req.params.code}, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that Vendor.');
      err.status = 400;
      return next(err);
    } else {
      //alert user the ingredient has been deleted.
      return res.redirect(req.baseUrl);
    }
  });
});


router.post('/:code/update', async function(req, res, next) {
  var uicode;
  await Vendor.findOne({code: req.params.code}, function(error, ing) {
    if (ing == null) {
      var err = new Error('That vendor doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {
      uicode = ing.code;
    }
  })
  await Vendor.findOneAndUpdate({code: req.params.code}, {$set: {
    name: req.body.name,
    contact: req.body.contact,
    location: req.body.location,
    code: uicode
  }}, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t update that vendor.');
      err.status = 400;
      return next(err);
    } else {
      return res.redirect(req.baseUrl + '/' + uicode);
    }
  });
});

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  let newid = uniqid();
  Vendor.create({
    name: req.body.name,
    code: newid,
    contact: req.body.contact,
    location: req.body.location
  }, function (error, newInstance) {
    if (error) {
      return next(error);
    } else {
      return res.redirect(req.baseUrl + '/' + newid);
      //alert user the ingredient has been successfully added.
    }
  });
});

router.get('/search', function(req, res, next){
  let ingredient = req.body.ingredient;
  let name = req.body.name;
  let location = req.body.location;
  let code = req.body.code;
  let contact = req.body.contact;
  Vendor.find({code:code, name:name, contact:contact, location:location},
    function(error, vendors) {
    if (error) {
      var err = new Error('Error loading vendors ');
      err.status = 400;
      return next(err);
    } else {
      //res.render('ingredients', { ingredients: ings });
      //res.render('vendor');
    }
  })
})

//PUT request to update an existing ingredient
// router.post('/update/', function(req, res) {
//   Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
// });

module.exports = router;
