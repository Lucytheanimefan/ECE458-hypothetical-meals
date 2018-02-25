var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ProductionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  product: [
    {
      formulaId: {
        type: mongoose.Schema.Types.ObjectId
      },
      formulaName: String,
      unitsProduced: Number,
      totalCost: Number
    }
  ]
})

var Production = mongoose.model('Production', ProductionSchema);

module.exports.model = Production;

checkNewFormula = function(formulaId, report) {
  for (let record of report['product']) {
    if (record['formulaId'].equals(formulaId)) {
      return false;
    }
  }
  return true;
}

createReport = function() {
  return new Promise(function(resolve, reject) {
    exports.getProduction().then(function(report) {
      if (report == null) {
        resolve(Production.create({
          'name': 'production',
          'product': []
        }));
      } else {
        resolve('good to go');
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.updateReport = function(formulaId, formulaName, units, cost) {
  return new Promise(function(resolve, reject) {
    createReport().then(function(result) {
      return Production.findOne( {'name': 'production'}).exec();
    }).then(function(report) {
      if (checkNewFormula(formulaId, report)) {
        let newEntry = {
          'formulaId': formulaId,
          'formulaName': formulaName,
          'unitsProduced': units,
          'totalCost': cost
        };
        return Production.findOneAndUpdate({'name': 'production'}, {'$push': {'product': newEntry}}).exec();
      } else {
        return Production.update({'$and': [{'name': 'production'}, {'product': {'$elemMatch': {'formulaId': formulaId}}}]},
          {'$inc': {'product.$.totalCost': cost, 'product.$.unitsProduced': units}}).exec();
      }
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.getProduction = function() {
  return new Promise(function(resolve, reject) {
    Production.findOne({'name': 'production'}).then(function(production) {
      resolve(production);
    }).catch(function(error) {
      reject(error);
    });
  });
}