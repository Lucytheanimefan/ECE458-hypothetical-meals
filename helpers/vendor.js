var Vendor = require('../models/vendor');
var Ingredient = require('../models/ingredient');
var InventoryHelper = require('./inventory');
var Inventory = require('../models/inventory');
var mongoose = require('mongoose');
mongoose.promise = global.Promise;

var checkAndUpdate = function(package, temp, amount) {
  return new Promise(function(resolve, reject) {
    InventoryHelper.checkInventory(package, temp, amount).then(function(update) {
      if (update) {
        resolve(Promise.all([InventoryHelper.updateInventory(package, temp, amount), promise]));
      } else {
        var error = new Error('Not enough space in inventory!');
        error.status = 400;
        reject(error);
      }
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports.makeOrder = function(ingredientId,vendorId,numUnits){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  let vendId = mongoose.Types.ObjectId(vendorId);
  return new Promise(function(resolve,reject){
    var vendQuery = Vendor.model.findById(vendorId);
    var ingQuery = Ingredient.model.findById(ingId);
    vendQuery.exec().then(function(vend){
      if(vend==null){
        var error = new Error('Vendor could not be found');
        error.status = 400;
        throw(error);
      }
      else{
        return ingQuery;
      }
    }).then(function(ing,vend){
      if(ing==null){
        var error = new Error('Ingredient could not be found');
        error.status = 400;
        throw(error);
      }
      else{
        let package = ing['package'];
        let temp = ing['temperature'];
        let name = ing['name'];
        let newName = ing['name'];
        //TODO make amount on package volume
        let amount = numUnits+ing['amount'];
        result =  Ingredient.updateIngredient(name, newName, package, temp, amount);
      }
    }).then(function(result){
      resolve(result);
    }).catch(function(error){
      reject(error);
    })
  })

}
//TODO add error check here
module.exports.createVendor = function(name, code, contact, location){
  return new Promise(function(resolve,reject){
    var result = Vendor.createVendor(name,code,contact,location);
    resolve(result);
  })
}

module.exports.updateVendor = function(code, name, newCode, contact, location){
  return new Promise(function(resolve,reject){
    var vendQuery = Vendor.findVendorByCode(code);
    vendQuery.then(function(vend){
      if(vend==null){
        console.log("error");
        var error = new Error('Specified vendor doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        var result = Vendor.updateVendor(code, name, newCode, contact, location);
      }
    }).then(function(result) {
      resolve(result);
    }).catch(function(error){
      reject(error);
    })
  })
}
module.exports.deleteVendor = function(code){
  return new Promise(function(resolve,reject){
    var vendQuery = Vendor.findVendorByCode(code);
    vendQuery.then(function(vend){
      if(vend == null){
        var error = new Error('Specified vendor doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        var result = Vendor.deleteVendor(code);
      }
    }).then(function(result){
      resolve(result.exec());
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.addIngredient = function(code, ingredientId, cost){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  return new Promise(function(resolve,reject){
    var ingQuery = Ingredient.model.findById(ingId);
    ingQuery.exec().then(function(ing){
      if(ing==null){
        var error = new Error('Specified ingredient doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        return Vendor.addIngredient(code,ingId,cost);
      }
    }).then(function(result) {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.updateIngredient = function(code, ingredientId, cost){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  return new Promise(function(resolve,reject){
    var ingQuery = Ingredient.model.findById(ingId);
    ingQuery.exec().then(function(ing){
      if(ing==null){
        var error = new Error('Specified ingredient doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        result = Vendor.removeIngredient(code,ingId);
      }
    }).then(function(result) {
      resolve(result);
      nextResult = Vendor.addIngredient(code,ingId,cost);
    }).then(function(nextResult){
      resolve(nextResult);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.deleteIngredient = function(code, ingredientId){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  return new Promise(function(resolve,reject){
    var ingQuery = Ingredient.model.findById(ingId);
    ingQuery.exec().then(function(ing){
      if(ing==null){
        var error = new Error('Specified ingredient doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      else{
        return Vendor.removeIngredient(code,ingId);
      }
    }).then(function(result) {
      resolve();
    }).catch(function(error){
      reject(error);
    })
  })
}
