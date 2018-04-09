var mongoose = require('mongoose');
var Ingredient = require('./ingredient');
var Vendor = require('./vendor');
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

module.exports.updateReport = function(formulaName, formulaLot, ingID, ingLot, vendorID) {
  return new Promise(function(resolve, reject) {
    Completed.find().exec().then(function(products) {
      if (vendorID == 'admin') {
        return Promise.all([Ingredient.getIngredientById(ingID), {'name': 'admin'}]);
      } else {
        return Promise.all([Ingredient.getIngredientById(ingID), Vendor.findVendorById(vendorID)]);
      }
    }).then(function(result) {
      var ing = result[0];
      var vendor = result[1];
      if (vendor == null) {
        vendor = {'name': 'deleted vendor with ID ' + vendorID};
      }
      let newConstituent = {'ingredientID': ingID, 'ingredientName': ing.name, 'lotNumber': ingLot, 'vendorID': vendorID, 
      'vendorName': vendor.name};
      return Completed.update({'name': formulaName, 'lotNumber': formulaLot}, {'$push': {'constituents': newConstituent}}).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getProducts = function() {
  return new Promise(function(resolve, reject) {
    Completed.find().sort({'_id': -1}).exec().then(function(products) {
      let returnProducts = [];
      for (let record of products) {
        record['timestamp'] = mongoose.Types.ObjectId(record['_id']).getTimestamp().toString();
        returnProducts.push(record);
      }
      resolve(returnProducts);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getCompleted = function() {
  return new Promise(function(resolve, reject) {
    Completed.findOne({'name': 'recall'}).then(function(recall) {
      resolve(recall);
    }).catch(function(error) {
      reject(error);
    });
  });
}
