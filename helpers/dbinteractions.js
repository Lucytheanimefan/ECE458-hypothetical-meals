var Vendor = require('../models/vendor');
var Ingredient = require('../models/ingredient');
var Inventory = require('../models/inventory');

dbinteractions.prototype.checkAvailableSpace = function(size,temp){
  var queryInv = Inventory.findOne({type:'master'});
  if(size < 0){
    var err = new Error('Amounts must not be negative');
    err.status = 400;
    throw err;
  }
  queryInv.then(function(inv){
    if(ing == null){
      var err = new Error('Inventory database cannot be accessed');
      err.status = 404;
      throw err;
    }
    let available = inv['limits'][temp]-inv['current'][temp];
    return space<=available;
  })
}

dbinteractions.prototype.checkInventoryResize = function(newSize,temp){
  var queryInv = Inventory.findOne({type:'master'});
  queryInv.then(function(inv){
    if(inv == null){
      var err = new Error('Inventory database cannot be accessed');
      err.status = 404;
      throw err;
    }
    return newSize >= inv['current'][temp];
  })
}

dbinteractions.prototype.ingredientOrdered = function(ingId, vendorId, quantity){
  var queryInv = Inventory.findOne({type:'master'});
  var queryIng = Ingredient.findOne({_id:ingId});
  var querVendor = Vendor.findOne({_id:vendorId});
  queryInv.then(function(inv){
    if(inv == null){
      var err = new Error('Inventory database cannot be accessed');
      err.status = 404;
      throw err;
    }
    return queryIng;
  }).then(function(ing,inv){
    if(ing == null){
      var err = new Error('Ingredient not found');
      err.status = 404;
      throw err;
    }
    return queryVendor;
  }).then(function(vendor,ing,inv){
    if(vendor == null){
      var err = new Error('Vendor not found');
      err.status = 404;
      throw err;
    }
    let temp = ing['temperature'];
    let index = searchIngredient(vendor['catalogue'],ingId);
    let cost = vendor['catalogue'][index]['cost'];
    //edit this line for space
    inv['current'][temp]+=quantity;
    //edit this for space and vendor
    ing['amount']-=quantity;

    ing.save();
    inv.save();
    vendor.save();

  });
}


searchIngredient = function(list,ing){
  for(var i = 0; i < list.length; i++){
    if(list[i]['ingredient']===ing){
      return i;
    }
  }
  return -1;
}

module.exports = new dbinteractions();
