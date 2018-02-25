var Inventory = require('../models/inventory');
var Ingredient = require('../models/ingredient');

var spaceMapping = {
  sack:0.5,
  pail:1,
  drum:3,
  supersack:16,
  truckload:0,
  railcar:0
}

calculateSpace = function(package, unitsPerPackage, amount) {
  if (package.toLowerCase() === 'truckload' || package.toLowerCase() === 'railcar') {
    return 0;
  }
  var numberOfPackages = Math.ceil(parseFloat(amount)/parseFloat(unitsPerPackage));
  return parseFloat(numberOfPackages * spaceMapping[package]);
}

//this checks and updates the inventory

module.exports.checkInventory = function(name, package, temp, unitsPerPackage, amount) {
  return new Promise(function(resolve, reject) {
    Promise.all([Inventory.getInventory(), Ingredient.getIngredient(name)]).then(function(results) {
      let inv = results[0];
      let ing = results[1];
      let temperature = temp.toLowerCase().split(" ")[0];
      var newSpace = calculateSpace(package, unitsPerPackage, amount)
      var oldSpace = 0;
      if (ing != null) {
        let ingTemperature = ing.temperature.toLowerCase().split(" ")[0]
        oldSpace = calculateSpace(ing['package'], ing['unitsPerPackage'], ing['amount']);
        inv['current'][ingTemperature] = parseFloat(inv['current'][ingTemperature]) - oldSpace;
      }
      inv['current'][temperature] = parseFloat(inv['current'][temperature]) + newSpace;
      console.log("HERE BOIIIII");
      console.log(parseFloat(inv['current'][temperature]));
      console.log(parseFloat(inv['limits'][temperature]));
      var update = (parseFloat(inv['current'][temperature]) <= parseFloat(inv['limits'][temperature]));
      resolve(update);
    }).catch(function(error) {
      reject(error)
    })
  })
}
module.exports.updateInventory = function(name, package, temp, unitsPerPackage, amount) {
  return new Promise(function(resolve, reject) {
    Promise.all([Inventory.getInventory(), Ingredient.getIngredient(name)]).then(function(results) {
      let inv = results[0];
      let ing = results[1];
      let temperature = temp.toLowerCase().split(" ")[0];
      var newSpace = calculateSpace(package, unitsPerPackage, amount)
      var oldSpace = 0;
      if (ing != null) {
        let ingTemperature = ing.temperature.toLowerCase().split(" ")[0]
        oldSpace = calculateSpace(ing['package'], ing['unitsPerPackage'], ing['amount']);
        inv['current'][ingTemperature] = parseFloat(inv['current'][ingTemperature]) - oldSpace;
      }
      inv['current'][temperature] = parseFloat(inv['current'][temperature]) + newSpace;
      return inv.save();
    }).then(function(inv) {
      resolve(inv);
    }).catch(function(error) {
      reject(error)
    })
  })
}

module.exports.updateLimits = function(frozen, room, refrigerated) {
  return new Promise(function(resolve, reject) {
    Inventory.getInventory().then(function(inv) {
      if (parseFloat(frozen) >= parseFloat(inv.current.frozen)) {
        inv.limits.frozen = frozen;
      } else {
        var error = new Error('Can\'t set frozen limit to under current capacity');
        throw error;
      }
      if (parseFloat(room) >= parseFloat(inv.current.room)) {
        inv.limits.room = room;
      } else {
        var error = new Error('Can\'t set room temperature limit to under current capacity');
        throw error;
      }
      if (parseFloat(refrigerated) >= parseFloat(inv.current.refrigerated)) {
        inv.limits.refrigerated = refrigerated;
      } else {
        var error = new Error('Can\'t set refrigerated limit to under current capacity');
        throw error;
      }
      inv.save();
      resolve(inv);
    }).catch(function(error) {
      reject(error);
    });
  })
}
