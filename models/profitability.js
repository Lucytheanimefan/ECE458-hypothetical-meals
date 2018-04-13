var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ProfitSchema = new mongoose.Schema({
  productName: String,
  unitsSold: Number,
  unitCost: Number,
  ingCost: Number
})

var Profit = mongoose.model('Profit', ProfitSchema);

module.exports.model = Profit;

module.exports.createEntry = function(productName) {
  return new Promise(function(resolve, reject) {
    Profit.find({ 'productName': productName }).then(function(product) {
      if (product != null) {
        return product;
      } else {
        return Profit.create({
          'productName': productName,
          'unitsSold': 0,
          'unitCost': 0,
          'ingCost': 0
        })
      }
    }).then(function(product) {
      resolve(true);
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.updateReport = function(productName, newUnits, totalCost, ingCost) {
  return new Promise(function(resolve, reject) {
    Profit.findOne({'productName': productName}).then(function(product) {
      var units = parseFloat(product.unitsSold);
      var avgCost = parseFloat(product.unitCost);
      var newAvg = (units*avgCost + totalCost)/(units + newUnits);
      return Profit.findOneAndUpdate({'productName': productName}, {
        '$set': {
          'unitsSold': units+newUnits,
          'unitCost': newAvg,
          'ingCost': parseFloat(product.ingCost) + ingCost
        }
      }).exec();
    }).then(function(product) {
      resolve(product);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getProducts = function() {
  return Profit.find().exec();
}