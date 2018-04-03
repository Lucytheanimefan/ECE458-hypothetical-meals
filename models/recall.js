var mongoose = require('mongoose');
var Ingredient = require('./ingredient');
var Vendor = require('./vendor');
var Formula = require('./formula');
mongoose.Promise = global.Promise;

var RecallSchema = new mongoose.Schema({
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
      ingredientName: String,
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

var Recall = mongoose.model('Recall', RecallSchema);

module.exports.model = Recall;

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
        resolve(Recall.create({
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

module.exports.createLotEntry = function(ingID, ingName, ingLot, vendorID) {
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
          'ingredientName': ingName,
          'products': []
        };
        resolve(newEntry);
      });
    } else {
      promise = new Promise(function(resolve, reject) {
        Vendor.findVendorById(vendorID).then(function(vendor) {
          newEntry = {
            'vendorID': vendorID,
            'vendorName': (vendor == null) ? vendorID : vendor.name,
            'vendorCode': (vendor == null) ? vendorID : vendor.code,
            'lotNumber': ingLot,
            'ingredientName': ingName,
            'products': []
          };
          resolve(newEntry);
        }).catch(function(error) {
          reject(error);
        });
      });
    }
    promise.then(function(entry) {
      return Recall.findOne({'$and': [{'name': 'recall'}, {'vendorLots': {'$elemMatch': {'vendorID': vendorID, 'lotNumber': ingLot, 'ingredientName': ingName}}}]});
    }).then(function(recall) {
      if (recall == null) {
        resolve(Recall.findOneAndUpdate({'name': 'recall'}, {'$push': {'vendorLots': newEntry}}).exec());
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
      return Recall.findOne( {'name': 'recall'} ).exec();
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
      return Recall.update({'$and': [{'name': 'recall'}, {'vendorLots': {'$elemMatch': {'vendorID': vendorID, 'lotNumber': ingLot, 'ingredientName': ing.name}}}]}, {'$push': {'vendorLots.$.products': newProduct}}).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

checkIfProductInArray = function(finalProducts, product) {
  for (let record in finalProducts) {
    if (record['productName'] == product['name'] && record['lotNumber'] == product['lotNumber']) {
      return true;
    }
  }
  return false;
}

module.exports.getRecallProducts = function(ingName, vendorCode, lotNumber) {
  return new Promise(function(resolve, reject) {
    let finalProducts = [];
    exports.getRecall().then(function(report) {
      let products = [];
      for (let record of report['vendorLots']) {
        if (record['vendorCode'] == vendorCode && record['lotNumber'] == lotNumber && record['ingredientName'] == ingName) {
          products = record.products;
          break;
        }
      }
      let intermediates = [];
      for (let product of products) {
        if (product.intermediate) {
          intermediates.push({'name': product.productName, 'vendorCode': 'admin', 'lotNumber': product.lotNumber});
        } else {
          // if (!checkIfProductInArray(finalProducts, product)) {
          finalProducts.push(product);
          // }
        }
      }
      if (intermediates.length == 0) {
        return [];
      } else {
        console.log(intermediates);
        return Promise.all(intermediates.map(function(tuple) {
          return exports.getRecallProducts(tuple.name, tuple.vendorCode, tuple.lotNumber);
        }));
      }
    }).then(function(results) {
      console.log('reeeeeeeeee');
      console.log(finalProducts);
      results.forEach(function(arr) {
        for (let product of arr) {
          if (!checkIfProductInArray(finalProducts, product)) {
            finalProducts.push(product);
          }
        }
      });
      resolve(finalProducts);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getRecall = function() {
  return new Promise(function(resolve, reject) {
    Recall.findOne({'name': 'recall'}).then(function(recall) {
      resolve(recall);
    }).catch(function(error) {
      reject(error);
    });
  });
}
