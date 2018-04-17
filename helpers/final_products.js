var FinalProduct = require('../models/final_product');
var Profit = require('../models/profitability');

module.exports.createFinalProduct = function(name) {
  return FinalProduct.createFinalProduct(name);
}

module.exports.deleteFinalProduct = function(name) {
  return FinalProduct.deleteFinalProduct(name);
}

module.exports.addFinalProduct = function(name, units) {
  return new Promise(function(resolve, reject) {
    FinalProduct.getFinalProduct(name).then(function(fp) {
      if (fp == null) {
        return exports.createFinalProduct(name);
      } else {
        return fp;
      }
    }).then(function(fp) {
      return Promise.all([FinalProduct.addLot(name, units), FinalProduct.incrementAmount(name, units)]);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.sellFinalProduct = function(name, units, pricePerUnit) {
  return Promise.all([Profit.updateReport(name, parseFloat(units), parseFloat(units) * parseFloat(pricePerUnit), 0), FinalProduct.consumeLots(name, units), FinalProduct.incrementAmount(name, -units)]);
}
