var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Vendor = require('../models/vendor');
var Inventory = require('../models/inventory');
var Ingredient = require('../models/ingredient');
var path = require('path');
var logs = require(path.resolve(__dirname, "./logs.js"));
var uniqid = require('uniqid')
let packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
let temperatures = ['frozen', 'refrigerated', 'room temperature'];
let pageSize = 10;

let weightMapping = {
  sack: 50,
  pail: 50,
  drum: 500,
  supersack: 2000,
  truckload: 50000,
  railcar: 280000
}


router.get('/', function(req, res, next) {
  res.redirect(req.baseUrl + '/home/');
})

//GET request to show available ingredients
router.get('/home/:page?', function(req, res, next) {
  var perPage = 10;
  var page = req.params.page || 1;
  page = (page < 1) ? 1 : page;
  Vendor.find({}, null, { skip: (perPage * page) - perPage, limit: perPage }, function(error, vendors) {
    if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('vendors', { vendors: vendors, packages: packageTypes, temps: temperatures, page: page });
    }
  })
})
router.get('/:code/:page?', async function(req, res, next) {
  await Vendor.findOne({ code: req.params.code }, function(error, ing) {
    if (ing == null) {
      var err = new Error('That vendor doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {
      var page = req.params.page || 1;
      page = (page < 1) ? 1 : page;
      let fullMenu = ing.catalogue;
      let name = ing.name;
      let contact = ing.contact;
      let state = ing.location.state;
      let city = ing.location.city;
      let menu = fullMenu.splice((page - 1) * pageSize, page * pageSize)

      res.render('vendor', {
        vendor: ing,
        packages: packageTypes,
        temps: temperatures,
        catalogue: menu,
        name: name,
        contact: contact,
        state: state,
        city: city,
        page: page
      });
    }
  })
})

//POST request to delete an existing ingredient
router.post('/:code/delete', function(req, res, next) {
  Vendor.findOneAndRemove({ code: req.params.code }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that Vendor.');
      err.status = 400;
      return next(err);
    } else {
      logs.makeVendorLog('Deleted vendor', result, ['vendor'], req.session.userId);
      return res.redirect(req.baseUrl);
    }
  });
});

router.post('/:code/add_ingredients', function(req, res, next) {
  createIngredient(req.body);
  addIngredient(req.body, req.params.code).then(function(code) {
    logs.makeVendorLog('Add ingredient to vendor', { 'vendor': code, 'ingredient': req.body }, ['vendor', 'ingredient'], req.session.userId);

    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    next(error);
  })
});

router.post('/:code/update_ingredients', function(req, res, next) {
  Vendor.findOne({ code: req.params.code }, function(err, vendor) {
    if (err) {
      var error = new Error('Couldn\'t find that vendor.');
      error.status = 400;
      return next(error);
    }
    vendor.catalogue = updateCatalogue(req.body, vendor.catalogue);
    vendor.save(function(err) {
      if (err) {
        var error = new Error('Couldn\'t update that vendor.');
        error.status = 400;
        return next(error);
      }
      logs.makeVendorLog('Update ingredients catalogue', vendor, ['vendor', 'catalogue'], req.session.userId);
      return res.redirect(req.baseUrl + '/' + req.params.code);
    });
  })
});

router.post('/:code/update', async function(req, res, next) {
  Vendor.findOne({ code: req.params.code }, function(err, vendor) {
    if (err) {
      var error = new Error('Couldn\'t find that vendor.');
      error.status = 400;
      return next(error);
    }
    vendor.name = req.body.name;
    vendor.contact = req.body.contact;
    vendor.location = genLocation(req.body);
    //vendor.catalogue = genCatalogue(req.body,vendor.catalogue);
    vendor.history = [];
    vendor.save(function(err) {
      if (err) {
        var error = new Error('Couldn\'t update that vendor.');
        error.status = 400;
        return next(error);
      }

      logs.makeVendorLog('Update vendor', vendor, ['vendor'], req.session.userId);
      return res.redirect(req.baseUrl + '/' + req.params.code); // This should be happening in the callback
    });

  });

});

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  let newid = uniqid();
  Vendor.create({
    name: req.body.name,
    code: newid,
    contact: req.body.contact,
    location: genLocation(req.body),
    catalogue: []
  }, function(error, newInstance) {
    if (error) {
      return next(error);
    } else {
      logs.makeVendorLog('Creation', newInstance, ['vendor'], req.session.userId);
      return res.redirect(req.baseUrl + '/' + newid);
      //alert user the ingredient has been successfully added.
    }
  });
});

router.post('/:code/order', async function(req, res, next) {
  let ingredient = req.body.ingredient;
  let quantity = parseFloat(req.body.quantity);
  let ing = await queryIngredient(ingredient, next);
  let findVendor = Vendor.findOne({ code: req.params.code });
  checkIfIngredientDeleted(ingredient, req.params.code).then(function(result) {
    return checkFridge(ingredient, quantity, req.params.code);
  }).then(function(canOrder) {
    return findVendor;
  }).then(async function(vendor) {
    let ingIndex = searchIngredient(vendor['catalogue'], ingredient);
    if (ingIndex == -1) {
      var err = new Error('Ingredient not found ');
      err.status = 400;
      return next(err);
    }
    if (vendor['catalogue'][ingIndex]['available'] >= parseFloat(req.body.quantity)) {
      vendor['catalogue'][ingIndex]['available'] -= parseFloat(req.body.quantity);
      var entry = {};
      entry['ingredient'] = ingredient.toLowerCase();
      entry['cost'] = vendor['catalogue'][ingIndex]['cost'];
      entry['number'] = parseFloat(req.body.quantity);
      vendor['history'].push(entry);
      await User.findOne({ "_id": req.session.userId }, function(err, user) {
        console.log(user);
        if (err) return next(err);
        var report = user.report;
        if (report === null | report === undefined | report == []) {
          // report = [];
          // report.push({});
          report = {}
        }
        // new_report = report[0];
        var cost = Number(entry['cost']) * Number(entry['number']);

        if (report != null) {
          if (ingredient in report) {
            cost += report[ingredient];
          }
        }
        report[ingredient] = cost;
        User.findByIdAndUpdate({
          _id: req.session.userId
        }, {
          $set: {
            report: report
          }
        }, function(err, cart_instance) {
          console.log('cart instance error');
          console.log(err);
          if (err) return next(err);
          logs.makeVendorLog('Make order', { 'cart': cart_instance, 'vendor': vendor }, ['vendor'], req.session.userId);
        });
      });
    } else {
      var err = new Error('Quantity exceeds vendor inventory.');
      err.status = 400;
      return next(err);
    }
    return vendor.save();
  }).then(function(result) {
    res.redirect(req.baseUrl + '/' + req.params.code);
  }).catch(function(error) {
    console.log(error);
    next(error);
  });

  // {
  //   await Vendor.findOne({code: req.params.code}, function(err, vendor){
  //   if (err) { return next(err); }
  //     let ingIndex = searchIngredient(vendor['catalogue'],ingredient);
  //     if(ingIndex == -1){
  //       var err = new Error('Ingredient not found ');
  //       err.status = 400;
  //       return next(err);
  //     }
  //     if(vendor['catalogue'][ingIndex]['available'] >= parseFloat(req.body.quantity)){
  //       vendor['catalogue'][ingIndex]['available'] -= parseFloat(req.body.quantity);
  //       var entry = {};
  //       entry['ingredient'] = ingredient.toLowerCase();
  //       entry['cost'] = vendor['catalogue'][ingIndex]['cost'];
  //       entry['number'] = parseFloat(req.body.quantity);
  //       vendor['history'].push(entry);
  //     }
  //     vendor.save(function(err) {
  //       if (err) { return next(err); }
  //     });

  //     return res.redirect(req.baseUrl + '/' + req.params.code);
  //   });
  // }
  // else{
  //   var error = new Error("Exceeds Refrigeration Capacity or Not Enough in Stock");
  //   err.status = 400;
  //   return next(err);
  // }
});

router.get('/search', function(req, res, next) {
  let ingredient = req.body.ingredient;
  let name = req.body.name;
  let location = genLocation(req.body);
  let code = req.body.code;
  let contact = req.body.contact;
  Vendor.find({ code: code, name: name, contact: contact, location: location },
    function(error, vendors) {
      if (error) {
        var err = new Error('Error loading vendors ');
        err.status = 400;
        return next(err);
      } else {}
    })
})

queryIngredient = function(name, next) {
  Ingredient.findOne({ name: name }, function(err, ing) {
    if (err) { return next(err); } else {
      return ing;
    }
  })
}

queryInventory = async function(next) {
  await Inventory.findOne({ type: "master" }, function(err, inv) {
    if (err) { return next(err); } else {
      return inv;
    }
  })
}

genLocation = function(data) {
  var loc = {};
  loc['city'] = data['city'];
  loc['state'] = data['state'];
  return loc;
}

genCatalogue = function(data, catalogue) {
  var entry = {};
  let index = searchIngredient(catalogue, data.ingredient);
  entry.ingredient = data.ingredient.toLowerCase();
  entry.package = data.size.toLowerCase();
  if (index == -1) {
    entry.temp = data.temperature.toLowerCase();
    entry.cost = parseFloat(data.cost);
    entry.available = parseFloat(data.quantity);
    // catalogue.push(entry);
    // return catalogue;
  } else {
    entry.temp = data.temperature.toLowerCase();
    entry.available = parseFloat(data.quantity);
    entry.cost = parseFloat(data.cost);
  }
  return entry;

}

updateCatalogue = function(data, catalogue) {
  var entry = {};
  let index = searchIngredient(catalogue, data.ingredient);
  if (index > -1) {
    catalogue[index].available = parseFloat(data.quantity);
    catalogue[index].cost = parseFloat(data.cost);
  }
  return catalogue;
}

createIngredient = async function(data) {
  await Ingredient.find({ name: data.ingredient }, function(err, ings) {
    if (ings.length == 0) {
      Ingredient.create({
        name: data.ingredient,
        package: data.size,
        temperature: data.temperature.toLowerCase(),
        amount: 0
      }, function(error, newInstance) {
        if (error) {
          return error;
        }
      });
    }
  });
}

checkFridge = function(name, amount) {
  var findIngredient = Ingredient.findOne({ name: name });
  var findInventory = Inventory.findOne({ type: "master" });
  var ing;
  var check;
  return new Promise(function(resolve, reject) {
    findIngredient.then(function(ingredient) {
      ing = ingredient;
      return findInventory;
    }).then(function(inv) {
      let size = ing['package'].toLowerCase();
      let temp = ing['temperature'].split(" ")[0];
      let space = inv['limits'][temp] - inv['current'][temp];
      let amountInPounds = amount * weightMapping[size];
      let diff = space >= amountInPounds || size === "truckload" || size === "railcar" ? amountInPounds : 0;
      if (space < amountInPounds) {
        var error = new Error('There is not enough space in inventory for transaction');
        error.status = 400;
        reject(error);
      }
      inv.current[temp] += diff;
      ing.amount += amountInPounds;
      return inv.save();
    }).catch(function(err) {
      var error = new Error('Couldn\'t update the inventory.');
      error.status = 400;
      reject(error);
    }).then(function(result) {
      return ing.save();
    }).catch(function(err) {
      var error = new Error('Couldn\'t update the ingredient quantity');
      error.status = 400;
      reject(error);
    }).then(function(result) {
      resolve(true);
    })
  })
  // await Ingredient.findOne({name:name},async function(err,ing){
  //   if(err){return next(err);}
  //   else{
  //     await Inventory.findOne({type:"master"},function(err,inv){
  //       if(err){return next(err);}
  //       else{
  //         let size = ing['package'].toLowerCase();
  //         let temp = ing['temperature'].split(" ")[0];
  //         let space = inv['limits'][temp]-inv['current'][temp];
  //         let amountInPounds = amount*weightMapping[size];
  //         let diff = space>=amountInPounds || size==="truckload" || size==="railcar" ? amountInPounds:0;
  //         if(space<amountInPounds){
  //           var error = new Error('There is not enough space in inventory for transaction');
  //           error.status = 400;
  //           console.log("you can't do that!!!!");
  //           return(next(error));
  //         }
  //         inv.current[temp]+=diff;
  //         ing.amount+=amountInPounds;
  //         inv.save(function(err) {
  //           if (err) {
  //             var error = new Error('Couldn\'t update the inventory.');
  //             error.status = 400;
  //             return next(error);
  //             }
  //           });
  //         ing.save(function(err){
  //           if(err){
  //             var error = new Error('Couldn\'t update the ingredient quantity');
  //             error.status = 400;
  //             return next(error);
  //           }
  //         })
  //         return space>=amountInPounds;
  //       }
  //     })
  //   }
  // })
}

checkIfIngredientDeleted = function(name, code) {
  var vendor;
  var findIngredient = Ingredient.findOne({ name: name });
  var findVendor = Vendor.findOne({ code: code });
  var createIngredient = function(name, size, temp) {
    return Ingredient.create({
      name: name,
      package: size,
      temperature: temp,
      amount: 0
    });
  }
  return new Promise(function(resolve, reject) {
    findVendor.then(function(seller) {
      vendor = seller;
      return findIngredient;
    }).then(function(ing) {
      if (ing == null) {
        console.log("ingredient deleted");
        let ingIndex = searchIngredient(vendor['catalogue'], name.toLowerCase());
        let size = vendor['catalogue'][ingIndex]['package'];
        let temperature = vendor['catalogue'][ingIndex]['temp'];
        return createIngredient(name, size, temperature);
      }
      resolve(ing);
    }).then(function(result) {
      resolve(result);
    }).catch(function(error) {
      reject(error);
    })
  })
}

searchIngredient = function(list, ing) {
  for (var i = 0; i < list.length; i++) {
    if (list[i]['ingredient'] === ing) {
      return i;
    }
  }
  return -1;
}

addIngredient = function(ingredientInfo, vendorCode) {
  return new Promise(function(resolve, reject) {
    var vendorQuery = Vendor.findOne({ code: vendorCode });
    var vendorRemove = Vendor.update({ code: vendorCode }, {
      '$pull': {
        'catalogue': { 'ingredient': ingredientInfo.ingredient.toLowerCase() }
      }
    });
    var vendorUpdate = function(newEntry) {
      return Vendor.findOneAndUpdate({ code: vendorCode }, { $push: { catalogue: newEntry } });
    };
    var myEntry;
    vendorQuery.then(function(vendor) {
      myEntry = genCatalogue(ingredientInfo, vendor.catalogue);
      return vendorRemove.exec();
    }).then(function(result) {
      return vendorUpdate(myEntry).exec();
    }).then(function(result) {
      resolve(vendorCode);
    }).catch(function(error) {
      var error = new Error('Couldn\'t update that vendor.');
      error.status = 400;
      reject(error);
    });
  });
}


module.exports = router;
module.exports.addIngredient = addIngredient;