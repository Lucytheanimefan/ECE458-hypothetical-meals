var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));
var InventoryHelper = require('../helpers/inventory');

var IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  package: {
    type: String,
    enum: ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'],
    required: true,
    trim: true
  },
  temperature: {
    type: String,
    enum: ['frozen', 'refrigerated', 'room temperature'],
    required: true,
    trim: true
  },
  nativeUnit: {
    type: String,
    required: true,
    trim: true
  },
  unitsPerPackage: {
    type: Number,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  averageCost: {
    type: Number
  },
  space: {
    type: Number,
    required:true
  },
  vendors: [{
    vendorId: {
      type: String,
      trim: true
    }
  }],
  vendorLots: [{
    vendorID: String,
    lotNumber: Number,
    units: Number,
    timestamp: Number
  }]
});

var Ingredient = mongoose.model('Ingredient', IngredientSchema);

module.exports.createIngredient = function(name, package, temp, nativeUnit, unitsPerPackage, amount, lotNumber) {
  return Ingredient.create({
    'name': name,
    'package': package.toLowerCase(),
    'temperature': temp.toLowerCase(),
    'nativeUnit': nativeUnit,
    'unitsPerPackage': parseFloat(unitsPerPackage),
    'amount': amount,
    'averageCost': 0,
    'space': InventoryHelper.calculateSpace(package.toLowerCase(), parseFloat(unitsPerPackage), parseFloat(amount)),
    'vendorLots': [{'vendorID': 'admin', 'lotNumber': lotNumber, 'units': amount, 'timestamp': Date.now()}]
  });
}

module.exports.createIngredientNoAmount = function(name, package, temp, nativeUnit, unitsPerPackage) {
  return Ingredient.create({
    'name': name,
    'package': package.toLowerCase(),
    'temperature': temp.toLowerCase(),
    'nativeUnit': nativeUnit,
    'unitsPerPackage': parseFloat(unitsPerPackage),
    'amount': 0,
    'averageCost': 0,
    'space': 0,
    'vendorLots': []
  });
}

module.exports.getIngredient = function(name) {
  return Ingredient.findOne({ 'name': name }).exec();
}

module.exports.getIngredientById = function(id){
  return Ingredient.findById(id).exec();
}

module.exports.getAllIngredients = function() {
  return Ingredient.find().exec();
}

//this returns a query for searching
module.exports.searchIngredients = function() {
  return Ingredient.find();
}

module.exports.updateIngredient = function(name, newName, package, temp, nativeUnit, unitsPerPackage, amount) {
  return Ingredient.findOneAndUpdate({ 'name':  name }, {
    '$set': {
      'name': newName,
      'package': package.toLowerCase(),
      'temperature': temp.toLowerCase(),
      'nativeUnit': nativeUnit,
      'unitsPerPackage': parseFloat(unitsPerPackage),
      'space': InventoryHelper.calculateSpace(package.toLowerCase(), parseFloat(unitsPerPackage), parseFloat(amount)),
      'amount': parseFloat(amount)
    }
  }).exec();
}

module.exports.incrementAmount = function(name, amount, vendorID, lotNumber) {
  return Promise.all([Ingredient.findOneAndUpdate({ 'name': name }, {
    '$inc': {
      'amount': parseFloat(amount)
    }
  }).exec(), exports.addLot(name, amount, vendorID, lotNumber)]);
}

module.exports.decrementAmount = function(name, amount) {
  return Promise.all([Ingredient.findOneAndUpdate({ 'name': name }, {
    '$inc': {
      'amount': parseFloat(-amount)
    }
  }).exec(), exports.consumeLots(name, amount)]);
}

module.exports.addLot = function(name, amount, vendorID, lotNumber) {
  let entry = {'vendorID': vendorID, 'lotNumber': lotNumber, 'units': amount, 'timestamp': Date.now()};
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$push': {
      'vendorLots': entry
    }
  }).exec();
}

module.exports.addLotEntry = function(name, entry) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$push': {
      'vendorLots': entry
    }
  }).exec();
}

module.exports.removeLot = function(name, lotID) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$pull': {
      'vendorLots': {'_id': lotID}
    }
  })
}

module.exports.updateSpace = function(name) {
  return new Promise(function(resolve, reject) {
    exports.getIngredient(name).then(function(ing) {
      return exports.updateIngredient(ing.name, ing.name, ing.package. ing.temperature, ing.nativeUnit, ing.unitsPerPackage, ing.amount);
    }).then(function(ing) {
      resolve(ing);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.sortLots = function(a, b) {
  let aTime = a['timestamp'];
  let bTime = b['timestamp'];
  if (aTime < bTime) {
    return -1;
  } else if (aTime > btime) {
    return 1;
  } else {
    return 0;
  }
}

copyLotEntry = function(entry) {
  let newEntry = {};
  newEntry['vendorID'] = entry['vendorID'];
  newEntry['lotNumber'] = entry['lotNumber'];
  newEntry['units'] = parseFloat(entry['lotNumber']);
  newEntry['timestamp'] = entry['timestamp'];
  return newEntry;
}

module.exports.consumeLots = function(name, amount) {
  return new Promise(function(resolve, reject) {
    exports.getIngredient(name).then(function(ing) {
      let lots = ing['vendorLots'];
      lots.sort(function(a,b) {exports.sortLots(a,b)});
      let pullIDs = [];
      let remaining = parseFloat(amount);
      let newEntry = {};
      for (let lot of lots) {
        if (remaining <= 0) break;
        pullIDs.push(lot['_id']);
        if (parseFloat(lot['units']) > remaining) {
          remaining -= parseFloat(lot['units']);
        } else {
          newEntry = copyLotEntry(lot);
          newEntry['units'] -= remaining;
          break;
        }
      }
      let removeLots = Promise.all(pullIDs.map(function(id) {
        return exports.removeLot(name, id);
      }));
      let addLot = exports.addLotEntry(name, newEntry);
      return Promise.all([removeLots, addLot]);
    }).then(function() {
      resolve('lots consumed');
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.deleteIngredient = function(name) {
  return Ingredient.findOneAndRemove({ 'name': name }).exec();
}

module.exports.addVendor = function(name, vendorId) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$addToSet': {'vendors': vendorId}
  }).exec();
}

module.exports.model = Ingredient;
