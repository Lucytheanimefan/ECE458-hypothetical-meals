var express = require('express');
var router = express.Router();
var Ingredient = require('../models/ingredient');
var Vendor = require('../models/vendor');
var users = require('./users');


var packageTypes = ['Sack', 'Pail', 'Drum', 'Supersack', 'Truckload', 'Railcar'];
var temperatures = ['frozen', 'refrigerated', 'room temperature'];

//GET request to show available ingredients
router.get('/', function(req, res, next) {
  Ingredient.find({}, function(error, ings) {
    if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
    }
  })
})

router.get('/search_results', function(req, res, next) {
  var query = Ingredient.find();
  if (req.query.name != null) {
    var name = req.query.name;
    var search = '.*' + name + '.*'
    query.where({name: new RegExp(search)});
  }
  if (req.query.package != null) {
    query.where('package').in(req.query.package);
  }
  if (req.query.temperature != null) {
    query.where('temperature').in(req.query.temperature);
  }
  query.exec(function(error, ings) {
    if (error) {
      var err = new Error('Error during search');
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredients', { ingredients: ings, packages: packageTypes, temps: temperatures });
    }
  })
})

router.get('/:name', function(req, res, next) {
  Ingredient.findOne({ name: req.params.name }, async function(error, ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      var vendors;
      await Vendor.find({ 'catalogue.ingredient': req.params.name }, function(error, results) {
        if (error) {
          var err = new Error('Error searching for ' + req.params.name);
          err.status = 400;
          return next(err);
        } else {
          vendors = results;
        }
      });
      // console.log(vendors[0]);
      var catalogue = createCatalogue(vendors, req.params.name);
      res.render('ingredient', { ingredient: ing, packages: packageTypes, temps: temperatures, vendors: catalogue });
    }
  })
})

router.get('/:name/:amt', function(req, res, next) {
  Ingredient.findOne({name: req.params.name}, function(error, ing) {
    if (ing == null) {
      var err = new Error('That ingredient doesn\'t exist!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.name);
      err.status = 400;
      return next(err);
    } else {
      res.render('ingredient', { ingredient: ing, packages: packageTypes, temps: temperatures, amount: req.params.amt });
    }
  })
})

//POST request to delete an existing ingredient
router.post('/:name/delete', function(req, res, next) {
  Ingredient.findOneAndRemove({ name: req.params.name }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t delete that ingredient.');
      err.status = 400;
      return next(err);
    } else {
      //alert user the ingredient has been deleted.
      return res.redirect(req.baseUrl);
    }
  });
});


router.post('/:name/update', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  Ingredient.findOneAndUpdate({ name: req.params.name }, {
    $set: {
      name: ingName,
      package: req.body.package,
      temperature: req.body.temperature,
      amount: req.body.amount
    }
  }, function(error, result) {
    if (error) {
      var err = new Error('Couldn\'t update that ingredient.');
      err.status = 400;
      return next(err);
    } else {
      return res.redirect(req.baseUrl + '/' + ingName);
    }
  });
});

//POST request to create a new ingredient
router.post('/new', function(req, res, next) {
  let ingName = req.body.name.toLowerCase();
  Ingredient.create({
    name: ingName,
    package: req.body.package,
    temperature: req.body.temperature,
    amount: req.body.amount
  }, function(error, newInstance) {
    if (error) {
      return next(error);
    } else {
      return res.redirect(req.baseUrl + '/' + ingName);
      //alert user the ingredient has been successfully added.
    }
  });
});

createCatalogue = function(vendors, name) {
  var catalogue = [];
  for (i = 0; i < vendors.length; i++) {
    var vendor = vendors[i];
    for (j = 0; j < vendor['catalogue'].length; j++) {
      if (vendor['catalogue'][j]['ingredient'] == name) {
        var record = vendor['catalogue'][j]['units'];
        var recordList = [];
        for (k = 0; k < packageTypes.length; k++) {
          var type = packageTypes[k].toLowerCase();
          if (record[type]['cost'] != null) {
            recordList.push([type, record[type]['cost'], record[type]['available']]);
          }
        }
        catalogue.push({vendorName: vendor['name'], vendorCode: vendor['code'], records: recordList});
        // catalogue.set(vendor['name'], recordList);
      }
    }
  }
  return catalogue
}


//PUT request to update an existing ingredient
// router.post('/update/', function(req, res) {
//   Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
// });

module.exports = router;