var mongoose = require('mongoose');
var uniqid = require('uniqid');
mongoose.Promise = global.Promise;
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));
var InventoryHelper = require('../helpers/inventory');

var OrdersSchema = new mongoose.Schema({
  ingID: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
    required:true
  },
  pending: {
    type: Boolean
  },
  vendorID: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  timeStamp: {
    type: Number,
    required: true
  }
});

var Orders = mongoose.model('Ingredient', IngredientSchema);

module.exports.addOrderIngredient = function(ingID, vendorID, amount, timeStamp) {
  return Ingredient.create({
    'ingID': mongoose.Types.ObjectId(ingID),
    'vendorID': mongoose.Types.ObjectId(vendorID),
    'amount': parseInt(amount),
    'orderNumber': uniqid(),
    'pending': false,
    'timeStamp': timeStamp
  });
}

module.exports.getOrderIngredient = function(orderNumber, ingID, vendorID) {
  return Ingredient.findOne({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }, 'ingID' : ingID, 'vendorID' : vendorID }).exec();
}

//module.exports

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

module.exports.updateIngredient = function(name, newName, package, temp, nativeUnit, unitsPerPackage) {
  return new Promise(function(resolve, reject) {
    Ingredient.findOneAndUpdate({ 'name':  name }, {
      '$set': {
        'name': newName,
        'package': package.toLowerCase(),
        'temperature': temp.toLowerCase(),
        'nativeUnit': nativeUnit,
        'unitsPerPackage': parseFloat(unitsPerPackage)
      }
    }).exec().then(function(ing) {
      return exports.updateSpace(newName);
    }).then(function(ing) {
      resolve(ing);
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports.updateIngredientAndAmount = function(name, newName, package, temp, nativeUnit, unitsPerPackage, amount) {
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

module.exports.justIncrementAmount = function(name, amount) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$inc': {
      'amount': parseFloat(amount)
    }
  }).exec();
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

module.exports.editLot = function(name, amount, lotID) {
  return Ingredient.update({ 'vendorLots._id': mongoose.Types.ObjectId(lotID) }, {
    '$set': {
      'vendorLots.$.units': amount
    }
  }).exec();
}

module.exports.removeLot = function(name, lotID) {
  return Ingredient.findOneAndUpdate({ 'name': name }, {
    '$pull': {
      'vendorLots': {'_id': lotID}
    }
  }).exec();
}

module.exports.updateSpace = function(name) {
  return new Promise(function(resolve, reject) {
    exports.getIngredient(name).then(function(ing) {
      return exports.updateIngredientAndAmount(ing.name, ing.name, ing.package, ing.temperature, ing.nativeUnit, ing.unitsPerPackage, ing.amount);
    }).then(function(ing) {
      resolve(ing);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.sortLots = function(a, b) {
  let aTime = parseFloat(a['timestamp']);
  let bTime = parseFloat(b['timestamp']);
  if (aTime < bTime) {
    return -1;
  } else if (aTime > bTime) {
    return 1;
  } else {
    return 0;
  }
}

copyLotEntry = function(entry, remaining) {
  let newEntry = {};
  newEntry['vendorID'] = entry['vendorID'];
  newEntry['lotNumber'] = entry['lotNumber'];
  newEntry['units'] = parseFloat(entry['units']) - parseFloat(remaining);
  newEntry['timestamp'] = entry['timestamp'];
  return newEntry;
}

module.exports.consumeLots = function(name, amount) {
  return new Promise(function(resolve, reject) {
    var newEntry = {};
    var update = false;
    var ingredient;
    var consumedList = [];
    exports.getIngredient(name).then(function(ing) {
      ingredient = ing;
      let lots = ing['vendorLots'];
      lots.sort(function(a,b) {
        if (parseInt(a.timestamp) < parseInt(b.timestamp)) {
          return -1;
        } else if (parseInt(a.timestamp) > parseInt(b.timestamp)) {
          return 1;
        } else {
          return 0;
        }
      });
      let pullIDs = [];
      let remaining = parseFloat(amount);
      for (let lot of lots) {
        if (remaining == 0) break;
        pullIDs.push(mongoose.Types.ObjectId(lot['_id']));
        if (remaining >= parseFloat(lot['units'])) {
          remaining -= parseFloat(lot['units']);
          consumedList.push({'ingID': ing._id, 'name': name, 'amount': lot['units'], 'timestamp': lot['timestamp'], 'lotNumber': lot['lotNumber'], 'vendorID': lot['vendorID']});
        } else {
          newEntry = copyLotEntry(lot, remaining);
          update = true;
          consumedList.push({'ingID': ing._id, 'name': name, 'amount': remaining, 'timestamp': lot['timestamp'], 'lotNumber': lot['lotNumber'], 'vendorID': lot['vendorID']});
          break;
        }
      }
      let removeLots = Promise.all(pullIDs.map(function(id) {
        return exports.removeLot(name, id);
      }));
      return removeLots;
    }).then(function() {
      if (update) {
        return exports.addLotEntry(name, newEntry);
      } else {
        return ingredient;
      }
    }).then(function(ing) {
      resolve(consumedList);
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

module.exports.model = Orders;
