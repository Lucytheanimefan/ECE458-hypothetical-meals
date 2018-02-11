var Inventory = require('../models/inventory');

var query = Inventory.findOne( {'type': 'master'} ).exec();

module.exports.checkInventory = function(package, temp, amount) {
  return new Promise(function(resolve, reject) {
    query.then(function(inv) {
      let temperature = temp.toLowerCase().split(" ")[0];
      let canUpdate = false;

      if (package.toLowerCase() === "truckload" || package.toLowerCase() === "railcar") {
        canUpdate = true;
      } else {
        canUpdate = (parseFloat(inv['current'][temperature]) + amount <= parseFloat(inv['limits'][temperature]));
      }
      resolve(canUpdate);
    }).catch(function(error) {
      console.log(error);
    })
  })
}

module.exports.updateInventory = function(package, temp, amount) {
  return new Promise(function(resolve, reject) {
    let temperature = temp.toLowerCase().split(" ")[0];
    var updateObject = {};
    updateObject['current.' + temperature.toLowerCase()] = amount;
    if (package.toLowerCase() === "truckload" || package.toLowerCase() === "railcar") {
      resolve('nada');
    } else {
      resolve(Inventory.findOneAndUpdate({'type': 'master'}, {
        '$inc': updateObject
      }));
    }
  })
}

