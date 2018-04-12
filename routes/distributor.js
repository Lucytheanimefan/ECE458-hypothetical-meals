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
  var finalProducts;
  User.getUserById(req.session.userId).then(function(result) {
    user = result;
    return FinalProduct.getAllFinalProducts();
  }).then(function(results) {
    return Promise.all(results.map(function(fp) {
      if (fp.amount == 0) {
        return FinalProductHelper.deleteFinalProduct(fp.name);
      }
    }));
  }).then(function(result) {
    return FinalProduct.getAllFinalProducts();
  }).then(function(results) {
    finalProducts = results;
    var saleList = user.saleList;
    return Promise.all(saleList.map(function(sale) {
      return addFinalProductName(sale);
    }));
  }).then(function(results) {
    res.render('distributor', {finalProducts: finalProducts, sales: results});
  }).catch(function(error) {
    console.log(error);
    next(error);
  })
})

addFinalProductName = function(sale) {
  return new Promise(function(resolve, reject) {
    var fpEntry = {'finalProduct': sale.finalProduct, 'price': sale.price, 'quantity': sale.quantity, 'total': sale.total};
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
  var quantity = parseFloat(req.body.quantity);
  var price = parseFloat(req.body.price);
  console.log(req.body);
  var userId = req.session.userId;
  UserHelper.addToSaleList(userId, formulaId, quantity, price).then(function(success) {
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

router.post('/submit', function(req, res, next) {
  var userId = req.session.userId;
  var grandTotal = 0;
  User.getUserById(userId).then(function(user) {
    let saleList = user.saleList;
    for (let sale of saleList) {
      sale['total'] = parseFloat(sale['price']) * parseFloat(sale['quantity']);
      grandTotal += sale['total'];
    }
    return Promise.all(saleList.map(function(sale) {
      return addFinalProductName(sale);
    }));
  }).then(function(results) {
    res.render('sale-confirmation', {sales: results, total: grandTotal});
  }).catch(function(error) {
    next(error);
  })
})

router.post('/confirmed', function(req, res, next) {
  var userId = req.session.userId;
  User.getUserById(userId).then(function(user) {
    let saleList = user.saleList;
    return Promise.all(saleList.map(function(sale) {
      return addFinalProductName(sale);
    }));
  }).then(function(results) {
    return Promise.all(results.map(function(sale) {
      return Promise.all([FinalProductHelper.sellFinalProduct(sale.finalProductName, parseFloat(sale.quantity), parseFloat(sale.price)), UserHelper.removeSale(userId, sale.finalProduct)]);
    }));
  }).then(function(results) {
    res.redirect(req.baseUrl);
  }).catch(function(error) {
    next(error);
  })
})


module.exports = router;