var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var uniqid = require('uniqid')

//GET request to show available ingredients
router.get('/', function(req, res) {
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
  Vendor.findOne({code: req.params.code}, function(err, vendor){
  if (err) {
    var error = new Error('Couldn\'t find that vendor.');
    error.status = 400;
    return next(error);
  }
    vendor.name = req.body.name;
    vendor.contact = req.body.contact;
    location = genLocation(req.body);
    catalogue = genCatalogue(req.body,vendor.catalogue);
    history = [];
  vendor.save(function(err) {
    if (err) {
      var error = new Error('Couldn\'t update that vendor.');
      error.status = 400;
      return next(error);
      }
    });
  return res.redirect(req.baseUrl + '/' + req.params.code);
  });

});

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  let newid = uniqid();
  Vendor.create({
    name: req.body.name,
    code: newid,
    contact: req.body.contact,
    location: genLocation(req.body),
    catalogue: []
  }, function (error, newInstance) {
    if (error) {
      return next(error);
    } else {
      return res.redirect(req.baseUrl + '/' + newid);
      //alert user the ingredient has been successfully added.
    }
  });
});

router.post('/:code/order', function(req,res,next){
  let quantity = req.body.quantity;
  let size = req.body.size;
  let ingredient = req.body.ingredient;
  if(checkFridge(quantity,'cold')){
    Vendor.findOne({code: req.params.code}, function(err, vendor){
    if (err) { return next(err); }
      if(vendor['catalogue'][0]['units'][size]['available'] >= quantity){
        vendor['catalogue'][0]['units'][size]['available'] -= quantity;
      }
      vendor.save(function(err) {
        if (err) { return next(err); }
      });
    });
  }
});

router.get('/search', function(req, res, next){
  let ingredient = req.body.ingredient;
  let name = req.body.name;
  let location = genLocation(req.body);
  let code = req.body.code;
  let contact = req.body.contact;
  Vendor.find({code:code, name:name, contact:contact, location:location},
    function(error, vendors) {
    if (error) {
      var err = new Error('Error loading vendors ');
      err.status = 400;
      return next(err);
    } else {
    }
  })
})

genLocation = function(data){
  var loc = {};
  loc['city']=data['city'];
  loc['state']=data['state'];
  return loc;
}

genCatalogue = function(data,catalogue){
  console.log(catalogue);
  var entry = {};
  entry.ingredient = data.ingredient;
  entry.units = {};
  entry.units[data['container']]={};
  entry.units[data['container']]['cost']=parseFloat(data.cost);
  entry.units[data['container']]['available']=parseFloat(data.available);
  catalogue.push(entry);
  return catalogue;
}

checkFridge = function(size,temp){
  return true;
}

module.exports = router;
