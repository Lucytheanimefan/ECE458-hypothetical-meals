var express = require('express');
var router = express.Router();
var FinalProductHelper = require('../helpers/final_products');
var FinalProduct = require('../models/final_product');

router.get('/', function(req, res, next) {
  FinalProduct.getAllFinalProducts().then(function(results) {
    res.render('distributor', {finalProducts: results});
  })
})

module.exports = router;