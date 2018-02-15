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

calculateNewSpace = function(package, unitsPerPackage, newAmount, currentAmount) {
  var current = Math.ceil(currentAmount/unitsPerPackage);
  console.log("hi:" + current);
  var newNumberOfPackages = Math.ceil((currentAmount + newAmount)/unitsPerPackage)
  console.log("hi:" + newNumberOfPackages);
  return parseFloat((newNumberOfPackages - current) * spaceMapping[package]);
}

module.exports.checkInventory = function(package, temp, unitsPerPackage, newAmount, currentAmount) {
  return new Promise(function(resolve, reject) {
    Inventory.getInventory().then(function(inv) {
      let temperature = temp.toLowerCase().split(" ")[0];
      let canUpdate = false;

      if (package.toLowerCase() === "truckload" || package.toLowerCase() === "railcar") {
        resolve(true);
      } else {
        var newSpace = calculateNewSpace(package, unitsPerPackage, newAmount, currentAmount)
        resolve(parseFloat(inv['current'][temperature]) + newSpace <= parseFloat(inv['limits'][temperature]));
      }
    }).catch(function(error) {
      console.log(error);
    })
  })
}

module.exports.updateInventory = function(package, temp, unitsPerPackage, newAmount, currentAmount) {
  return new Promise(function(resolve, reject) {
    let temperature = temp.toLowerCase().split(" ")[0];
    var updateObject = {};
    var newSpace = calculateNewSpace(package, unitsPerPackage, newAmount, currentAmount)
    updateObject['current.' + temperature.toLowerCase()] = newSpace;
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

