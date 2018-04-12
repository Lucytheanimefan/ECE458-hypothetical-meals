var mongoose = require('mongoose');
var Ingredient = require('./ingredient');
var Vendor = require('./vendor');
var ProductionLine = require('./production_line');
mongoose.Promise = global.Promise;

var CompletedSchema = new mongoose.Schema({
  lotNumber: {
    type: String,
    unique: true
  },
  name: {
    type: String
  },
  intermediate: Boolean,
  inProgress: Boolean,
  constituents: [
    {
      ingredientID: String,
      ingredientName: String,
      lotNumber: String,
      vendorID: String,
      vendorName: String
    }
  ]
})

var Completed = mongoose.model('Completed production', CompletedSchema);

module.exports.model = Completed;

// checkNewLot = function(formulaName, formulaLot, report) {
//   for (let record of report['products']) {
//     if (record['name'] == formulaName && record['lotNumber'] == formulaLot) {
//       return false;
//     }
//   }
//   return true;
// }

module.exports.createLotEntry = function(formulaName, formulaLot, intermediate) {
  return new Promise(function(resolve, reject) {
    let newEntry = {
      'name': formulaName,
      'lotNumber': formulaLot,
      'intermediate': intermediate,
      'inProgress': true,
      'constituents': []
    };
    Completed.findOne({formulaLot: formulaLot}).then(function(result) {
      if (result == null) {
        return Completed.create(newEntry);
      } else {
        return result;
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error)
    })
  })
}

module.exports.completeProduct = function(formulaLot) {
  Completed.findOneAndUpdate({'lotNumber': formulaLot}, {'$set': {'inProgress': false}}).exec();
}

module.exports.updateReport = function(formulaName, formulaLot, ingID, ingLot, vendorID) {
  return new Promise(function(resolve, reject) {
    Completed.find().exec().then(function(products) {
      if (vendorID == 'admin') {
        return Promise.all([Ingredient.getIngredientById(ingID), { 'name': 'admin' }]);
      } else {
        return Promise.all([Ingredient.getIngredientById(ingID), Vendor.findVendorById(vendorID)]);
      }
    }).then(function(result) {
      var ing = result[0];
      var vendor = result[1];
      if (vendor == null) {
        vendor = { 'name': 'deleted vendor with ID ' + vendorID };
      }
      let newConstituent = {
        'ingredientID': ingID,
        'ingredientName': ing.name,
        'lotNumber': ingLot,
        'vendorID': vendorID,
        'vendorName': vendor.name
      };
      return Completed.update({'name': formulaName, 'lotNumber': formulaLot}, {'$push': {'constituents': newConstituent}}).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getProducts = function(query) {
  return new Promise(function(resolve, reject) {
    Completed.find(query).sort({'_id': -1}).exec().then(function(products) {
      return Promise.all(products.map(function(record) {
        return addInformation(record);
      }))
    }).then(function(products) {
      resolve(products);
    }).catch(function(error) {
      reject(error);
    })
  })
}

addInformation = function(record) {
  return new Promise(function(resolve, reject) {
    ProductionLine.getProductionLineForLot(record.lotNumber).then(function(line) {
      if (line != null) {
        record['productionLine'] = line['_id'];
      }
      record['timestamp'] = mongoose.Types.ObjectId(record['_id']).getTimestamp().toString();
      resolve(record);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getCompleted = function() {
  return new Promise(function(resolve, reject) {
    Completed.findOne({ 'name': 'recall' }).then(function(recall) {
      resolve(recall);
    }).catch(function(error) {
      reject(error);
    });
  });
}
