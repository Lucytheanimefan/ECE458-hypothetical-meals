var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var FinalProductSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  lots: [{
    units: Number,
    timestamp: Number
  }]
});

var FinalProduct = mongoose.model('final_product', FinalProductSchema);

module.exports.createFinalProduct = function(name) {
  return FinalProduct.create({
    'name': name,
    'amount': 0,
    'lots': []
  })
}

module.exports.deleteFinalProduct = function(name) {
  return FinalProduct.findOneAndRemove({'name': name}).exec();
}

module.exports.getFinalProduct = function(name) {
  return FinalProduct.findOne({'name': name}).exec();
}

module.exports.getAllFinalProducts = function() {
  return FinalProduct.find().exec();
}

module.exports.addLot = function(name, units) {
  let lotEntry = {'units': units, 'timestamp': Date.now()}
  return FinalProduct.findOneAndUpdate({'name': name}, {
    '$push': {
      'lots': lotEntry
    }
  }).exec();
}

module.exports.addLotEntry = function(name, entry) {
  return FinalProduct.findOneAndUpdate({'name': name}, {
    '$push': {
      'lots': entry
    }
  }).exec();
}

module.exports.removeLot = function(name, lotID) {
  return FinalProduct.findOneAndUpdate({ 'name': name }, {
    '$pull': {
      'lots': {'_id': lotID}
    }
  }).exec();
}

module.exports.incrementAmount = function(name, incAmount) {
  return FinalProduct.findOneAndUpdate({'name': name}, {
    '$inc': {
      'amount': incAmount
    }
  })
}

createNewLotEntry = function(entry, remaining) {
  let newEntry = {};
  newEntry['units'] = parseFloat(entry['units']) - parseFloat(remaining);
  newEntry['timestamp'] = entry['timestamp'];
  return newEntry;
}

module.exports.consumeLots = function(name, amount) {
  return new Promise(function(resolve, reject) {
    var newEntry = {};
    var update = false;
    var finalProduct;
    var consumedList = [];
    exports.getFinalProduct(name).then(function(fp) {
      finalProduct = fp;
      let lots = fp['lots'];
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
          consumedList.push({'finalProductID': fp._id, 'finalProductName': name, 'amount': lot['units'], 'timestamp': lot['timestamp']});
        } else {
          newEntry = createNewLotEntry(lot, remaining);
          update = true;
          consumedList.push({'finalProductID': fp._id, 'finalProductName': name, 'amount': remaining, 'timestamp': lot['timestamp']});
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
        return finalProduct;
      }
    }).then(function(ing) {
      resolve(consumedList);
    }).catch(function(error) {
      reject(error);
    })
  })
}