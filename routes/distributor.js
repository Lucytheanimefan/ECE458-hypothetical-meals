var express = require('express');
var router = express.Router();
var User = require('../models/user');
var UserHelper = require('../helpers/users');
var FinalProductHelper = require('../helpers/final_products');
var FinalProduct = require('../models/final_product');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

router.get('/', function(req, res, next) {
  var user;
  User.getUserById(req.session.userId).then(function(result) {
    user = result;
    return FinalProduct.getAllFinalProducts();
  }).then(function(results) {
    var saleList = user.saleList;
    // saleList.map(function(sale) {
    //   sale.
    // })
    res.render('distributor', {finalProducts: results, sales: user.saleList});
  }).catch(function(error) {
    next(error);
  })
})

addFinalProductName = function(sale) {
  return new Promise(function(resolve, reject) {
    var fpEntry = {'finalProduct': sale.finalProduct};
    FinalProduct.getFinalProductById(sale.finalProduct).then(function(fp) {
      fpEntry['finalProductName'] = fp.name;
      resolve(fpEntry);
    }).catch(function(error) {
      reject(error);
    })
  });
}

router.post('/add', function(req, res, next) {
  var formulaId = mongoose.Types.ObjectId(req.body.id);
  var userId = req.session.userId;
  UserHelper.addToSaleList(userId, formulaId).then(function(success) {
    res.redirect(req.baseUrl);
  }).catch(function(error) {
    next(error);
  })
})

router.post('/remove', function(req, res, next) {
  var formulaId = mongoose.Types.ObjectId(req.body.id);
  var userId = req.session.userId;
  UserHelper.removeSale(userId, formulaId).then(function(success) {
    res.redirect(req.baseUrl);
  }).catch(function(error) {
    next(error);
  })
})

module.exports = router;