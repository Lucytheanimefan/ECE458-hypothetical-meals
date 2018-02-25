var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory');
var InventoryHelper = require('../helpers/inventory');
var Ingredient = require('../models/ingredient');
var uniqid = require('uniqid');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));

//GET request to show available ingredients
router.get('/', function(req, res) {
  Inventory.getInventory().then(function(inv) {
    if (inv == null) {
      res.render('inventory');
    } else {
      let limits = inv.limits;
      let roomTemp = limits.room;
      let fridge = limits.refrigerated;
      let frozen = limits.frozen;
      res.render('inventory', { inventory:inv, room: roomTemp, refrigerated: fridge, frozen: frozen });
    }
  }).catch(function(error) {
    res.render('inventory');
  })
});

router.post('/update_limits', function(req, res, next) {
  InventoryHelper.updateLimits(req.body.frozen, req.body.room, req.body.refrigerated).then(function(inv) {
    logs.makeLog('Update inventory limits', inv, ['inventory'], req.session.userId); 
    res.redirect(req.baseUrl + '/');
  }).catch(function(error) {
    next(error);
  });
});

module.exports = router;
