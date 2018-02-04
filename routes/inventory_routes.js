var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory');
var Ingredient = require('../models/ingredient');
var uniqid = require('uniqid')

//GET request to show available ingredients
router.get('/', function(req, res) {
  Inventory.findOne({ type: "master" }, function(err, inv) {
    if (err) {
      // var error = new Error('Couldn\'t find current inventory.');
      // error.status = 400;
      // return next(error);
      res.render('inventory');
      return
    }
    if (inv == null) {
      res.render('inventory');
      return
    }
    let limits = inv.limits;
    let roomTemp = limits.room;
    let fridge = limits.refrigerated;
    let frozen = limits.frozen;
    res.render('inventory', { inventory:inv, room: roomTemp, refrigerated: fridge, frozen: frozen });


  })
});

router.post('/update_limits', function(req, res, next) {
  Inventory.findOne({ type: "master" }, function(err, inv) {
    if (err) {
      var error = new Error('Couldn\'t find inventory.');
      error.status = 400;
      return next(error);
    }
    inv.limits.frozen = req.body.frozen >= inv.current.frozen ? req.body.frozen : inv.limits.frozen;
    inv.limits.room = req.body.room >= inv.current.room ? req.body.room : inv.limits.room;
    inv.limits.refrigerated = req.body.refrigerated >= inv.current.refrigerated ? req.body.refrigerated : inv.limits.refrigerated;
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
