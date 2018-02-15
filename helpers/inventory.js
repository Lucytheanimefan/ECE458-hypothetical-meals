var Inventory = require('../models/inventory');

module.exports.checkInventory = function(package, temp, amount) {
  return new Promise(function(resolve, reject) {
    Inventory.getInventory().then(function(inv) {
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
      resolve(Inventory.updateInventory(updateObject));
    }
  })
}

module.exports.updateLimits = function(frozen, room, refrigerated) {
  return new Promise(function(resolve, reject) {
    Inventory.getInventory().then(function(inv) {
      if (parseInt(frozen) >= parseInt(inv.current.frozen)) {
        inv.limits.frozen = frozen;
      } else {
        var error = new Error('Can\'t set frozen limit to under current capacity');
        throw error;
      }
      if (parseInt(room) >= parseInt(inv.current.room)) {
        inv.limits.room = room;
      } else {
        var error = new Error('Can\'t set room temperature limit to under current capacity');
        throw error;
      }
      if (parseInt(refrigerated) >= parseInt(inv.current.refrigerated)) {
        inv.limits.refrigerated = refrigerated;
      } else {
        var error = new Error('Can\'t set refrigerated limit to under current capacity');
        throw error;
      }
      resolve(inv.save());
    }).catch(function(error) {
      reject(error);
    });
  })
}
