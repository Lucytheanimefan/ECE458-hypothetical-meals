var mongoose = require('mongoose');
var Ingredient = require('./ingredient');
var Vendor = require('./vendor');
mongoose.Promise = global.Promise;

var RecallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  products: [
    {
      name: String,
      lotNumber: String,
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
    }
  ]
})

var Recall = mongoose.model('Recall', RecallSchema);

module.exports.model = Recall;

// checkNewLot = function(formulaName, formulaLot, report) {
//   for (let record of report['products']) {
//     if (record['name'] == formulaName && record['lotNumber'] == formulaLot) {
//       return false;
//     }
//   }
//   return true;
// }

createReport = function() {
  return new Promise(function(resolve, reject) {
    exports.getRecall().then(function(report) {
      if (report == null) {
        resolve(Recall.create({
          'name': 'recall',
          'products': []
        }));
      } else {
        resolve(report);
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.createLotEntry = function(formulaName, formulaLot, intermediate) {
  let newEntry = {
    'name': formulaName,
    'lotNumber': formulaLot,
    'intermediate': intermediate,
    'constituents': []
  };
  return Recall.findOneAndUpdate({'name': 'recall'}, {'$push': {'products': newEntry}}).exec();
}

module.exports.updateReport = function(formulaName, formulaLot, ingID, ingLot, vendorID) {
  return new Promise(function(resolve, reject) {
    createReport().then(function(result) {
      return Recall.findOne( {'name': 'recall'} ).exec();
    }).then(function(report) {
      if (vendorID == 'admin') {
        return Promise.all([Ingredient.getIngredientById(ingID), {'name': 'admin'}]);
      } else {
        return Promise.all([Ingredient.getIngredientById(ingID), Vendor.findVendorById(vendorID)]);
      }
    }).then(function(result) {
      var ing = result[0];
      var vendor = result[1];
      let newConstituent = {'ingredientID': ingID, 'ingredientName': ing.name, 'lotNumber': ingLot, 'vendorID': vendorID, 
      'vendorName': vendor.name};
      return Recall.update({'$and': [{'name': 'recall'}, {'products': {'$elemMatch': {'name': formulaName, 'lotNumber': formulaLot}}}]},
        {'$push': {'products.$.constituents': newConstituent}}).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getProducts = function() {
  return new Promise(function(resolve, reject) {
    Recall.findOne({'name': 'recall'}).then(function(report) {
      let returnProducts = [];
      for (let record of report.products) {
        record['timestamp'] = mongoose.Types.ObjectId(record['_id']).getTimestamp().toString();
        returnProducts.push(record);
      }
      resolve(returnProducts);
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
