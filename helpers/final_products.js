var FinalProduct = require('../models/final_product');

module.exports.createFinalProduct = function(name) {
  return FinalProduct.createFinalProduct(name);
}

module.exports.deleteFinalProduct = function(name) {
  return FinalProduct.deleteFinalProduct(name);
}

module.exports.addFinalProduct = function(name, units) {
  return Promise.all([FinalProduct.addLot(name, units), FinalProduct.incrementAmount(name, units)]);
}

module.exports.sellFinalProduct = function(name, units, pricePerUnit) {
  return Promise.all([FinalProduct.consumeLots(name, units), FinalProduct.incrementAmount(name, -units)]);
}