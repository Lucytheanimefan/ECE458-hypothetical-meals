var Vendor = require('../models/vendor');
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('./ingredients');
var InventoryHelper = require('./inventory');
var Inventory = require('../models/inventory');
var Spending = require('../models/spending');
var mongoose = require('mongoose');
mongoose.promise = global.Promise;

let spaceMapping = {
  sack: 0.5,
  pail: 1,
  drum: 3,
  supersack: 16,
  truckload: 0,
  railcar: 0
}


module.exports.makeOrder = function(ingredientId,vendorId,numUnits){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  let vendId = mongoose.Types.ObjectId(vendorId);
  return new Promise(function(resolve,reject){
    var vendQuery = Vendor.model.findById(vendorId).populate('catalogue.ingredient');
    var ingQuery = Ingredient.model.findById(ingId);
    var vendor;
    vendQuery.exec().then(function(vend){
      if(vend==null){
        var error = new Error('Vendor could not be found');
        error.status = 400;
        throw(error);
      }
      else{
        vendor = vend;
        return ingQuery;
      }
    }).then(function(ing){
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
        let nativeUnit = ing['nativeUnit'];
        let unitsPerPackage = parseFloat(ing['unitsPerPackage']);
        let totalNewUnits = parseFloat(numUnits)*parseFloat(ing['unitsPerPackage'])
        let amount = totalNewUnits + parseFloat(ing['amount']);
        // console.log(vendor['catalogue']);
        let index = ingIndex(vendor['catalogue'], ing._id);
        if (index == -1) {
          var error = new Error('Vendor ' + vendor['code'] + ' does not have ingredient ' + ing['name']);
          error.status = 400;
          throw error;
        } else {
          let cost = parseFloat(vendor['catalogue'][index]['cost']);
          let updateIngCost = IngredientHelper.updateCost(name, totalNewUnits, cost);
          let updateReport = Spending.updateReport(mongoose.Types.ObjectId(ing['_id']), cost*parseFloat(numUnits), 'spending');
          let updateIngredient = IngredientHelper.updateIngredient(name, newName, package, temp, nativeUnit, unitsPerPackage, amount);
          return Promise.all([updateIngCost, updateReport, updateIngredient]);
        }
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
  let ingId = ingredientId;
  return new Promise(function(resolve,reject){
    var ingQuery = Ingredient.model.findById(ingId);
    var vendQuery = Vendor.findVendorByCode(code);
    ingQuery.exec().then(function(ing){
      if(ing==null){
        var error = new Error('Specified ingredient doesn\'t exist');
        error.status = 400;
        throw(error);
      }
      if(parseFloat(cost) < 0){
        var error = new Error('Invalid cost: ${cost}. Please enter a valid cost');
        error.status = 400;
        throw(error);
      }
      else{
        return vendQuery;
      }
    }).then(function(vend) {
      let menu = vend['catalogue'];
      console.log(menu);
      let index = ingIndex(menu,ingredientId);
      if(index >= 0){
        vend['catalogue'][index]['cost'] = cost;
        vend.save();
        return;
      }
      else{
        var result = Vendor.addIngredient(code,ingId,cost);
      }
    }).then(function(result){
      resolve(result);
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
      if(parseFloat(cost) < 0){
        var error = new Error('Invalid cost: ${cost}. Please enter a valid cost');
        error.status = 400;
        throw(error);
      }
      else{
        return result = Vendor.removeIngredient(code,ingId);
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
    var result = Vendor.removeIngredient(code,ingId);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}

module.exports.deleteRemovedIngredient = function(code, ingredientId){
  let ingId = mongoose.Types.ObjectId(ingredientId);
  return new Promise(function(resolve,reject){
    var result = Vendor.removeDeletedIngredient(code,ingId);
    result.then(function(success){
      resolve(success);
    }).catch(function(error){
      reject(error);
    })
  })
}

ingIndex = function(list,name){
  console.log(name);
  console.log(list);
  for(var i = 0; i < list.length; i++){
    if (list[i]['ingredient'] == null) {
      continue;
    } else if(list[i]['ingredient']['_id'].toString() === name.toString()){
      return i;
    }
  }
  return -1;
}
