var mongoose = require('mongoose');
var Ingredient = require('./ingredient');
var Vendor = require('./vendor');
var Formula = require('./formula');
mongoose.Promise = global.Promise;

var AnotherRecallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  vendorLots: [
    {
      vendorID: String,
      vendorName: String,
      vendorCode: String,
      lotNumber: String,
      products: [
        {
          intermediate: Boolean,
          productName: String,
          lotNumber: String,
          formulaID: String
        }
      ]
    }
  ]
})

var RealRecall = mongoose.model('Realrecall', AnotherRecallSchema);

module.exports.model = RealRecall;

module.exports.checkNewLot = function(vendorID, lotNumber, report) {
  for (let record of report['vendorLots']) {
    if (record['vendorID'] == vendorID && record['lotNumber'] == lotNumber) {
      return false;
    }
  }
  return true;
}

createReport = function() {
  return new Promise(function(resolve, reject) {
    exports.getRecall().then(function(report) {
      if (report == null) {
        resolve(RealRecall.create({
          'name': 'recall',
          'vendorLots': []
        }));
      } else {
        resolve(report);
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.createLotEntry = function(ingLot, vendorID) {
  return new Promise(function(resolve, reject) {
    var newEntry;
    var promise;
    if (vendorID == 'admin') {
      promise = new Promise(function(resolve, reject) {
        newEntry = {
          'vendorID': vendorID,
          'vendorName': vendorID,
          'vendorCode': vendorID,
          'lotNumber': ingLot,
          'products': []
        };
        resolve(newEntry);
      });
    } else {
      promise = new Promise(function(resolve, reject) {
        Vendor.findVendorById(vendorID).then(function(vendor) {
          newEntry = {
            'vendorID': vendorID,
            'vendorName': vendor.name,
            'vendorCode': vendor.code,
            'lotNumber': ingLot,
            'products': []
          }
          resolve(newEntry);
        }).catch(function(error) {
          reject(error);
        });
      });
    }
    promise.then(function(entry) {
      return RealRecall.findOne({'$and': [{'name': 'recall'}, {'vendorLots': {'$elemMatch': {'vendorID': vendorID, 'lotNumber': ingLot}}}]});
    }).then(function(recall) {
      if (recall == null) {
        resolve(RealRecall.findOneAndUpdate({'name': 'recall'}, {'$push': {'vendorLots': newEntry}}).exec());
      } else {
        resolve(recall);
      }
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.updateReport = function(formulaID, formulaLot, intermediate, ingID, ingLot, vendorID) {
  return new Promise(function(resolve, reject) {
    var globalReport;
    createReport().then(function(result) {
      return RealRecall.findOne( {'name': 'recall'} ).exec();
    }).then(function(report) {
      globalReport = report;
      if (vendorID == 'admin') {
        return Promise.all([Ingredient.getIngredientById(ingID), {'name': 'admin'}, Formula.model.findById(formulaID).exec()]);
      } else {
        return Promise.all([Ingredient.getIngredientById(ingID), Vendor.findVendorById(vendorID), Formula.model.findById(formulaID).exec()]);
      }
    }).then(function(result) {
      var ing = result[0];
      var vendor = result[1];
      var formula = result[2];
      let newProduct = {'intermediate': intermediate, 'productName': formula.name, 'lotNumber': formulaLot, 'formulaID': formula._id};
      return RealRecall.update({'$and': [{'name': 'recall'}, {'vendorLots': {'$elemMatch': {'vendorID': vendorID, 'lotNumber': ingLot}}}]},
        {'$push': {'vendorLots.$.products': newProduct}}).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getRecallProducts = function(vendorCode, lotNumber) {
  return new Promise(function(resolve, reject) {
    let finalProducts = [];
    exports.getRecall().then(function(report) {
      let products = [];
      for (let record of report['vendorLots']) {
        if (record['vendorCode'] == vendorCode && record['lotNumber'] == lotNumber) {
          products = record.products;
          break;
        }
      }
      let intermediates = [];
      for (let product of products) {
        if (product.intermediate) {
          intermediates.push({'vendorCode': 'admin', 'lotNumber': product.lotNumber});
        } else {
          finalProducts.push(product);
        }
      }
      if (intermediates.length == 0) {
        return [];
      } else {
        console.log(intermediates);
        return Promise.all(intermediates.map(function(tuple) {
          return exports.getRecallProducts(tuple.vendorCode, tuple.lotNumber);
        }));
      }
    }).then(function(results) {
      console.log('reeeeeeeeee');
      console.log(results);
      results.forEach(function(arr) {
        Array.prototype.push.apply(finalProducts, arr);
      });
      resolve(finalProducts);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getRecall = function() {
  return new Promise(function(resolve, reject) {
    RealRecall.findOne({'name': 'recall'}).then(function(recall) {
      resolve(recall);
    }).catch(function(error) {
      reject(error);
    });
  });
}
