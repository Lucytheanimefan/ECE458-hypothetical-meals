var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory');
var Ingredient = require('../models/ingredient');
var uniqid = require('uniqid')

//GET request to show available ingredients
router.get('/', function(req, res) {
  res.render('inventory');
});

router.post('/update_limits',function(req,res,next){
  Inventory.findOne({type:"master"},function(err, inv){
  if (err) {
    var error = new Error('Couldn\'t find inventory.');
    error.status = 400;
    return next(error);
  }
    inv.limits.frozen = req.body.frozen;
    inv.limits.room = req.body.room;
    inv.limits.refrigerated = req.body.refrigerated;
    inv.save(function(err) {
    if (err) {
      var error = new Error('Couldn\'t update the inventory limits.');
      error.status = 400;
      return next(error);
      }
    });
  return res.redirect(req.baseUrl + '/');
  });
});

module.exports = router;
