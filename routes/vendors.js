var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
var uniqid = require('uniqid');
let displayLimit = 10;

//Get call for vendor population
router.get('/',function(req,res,next){
  res.render('vendor');
});

//Post call for vendor creation
router.post('/create_vendor',function(req,res,next){
  let uicode = uniqid();
  Vendor.create({
    name:req.body.name,
    code:uicode,
    contact:req.body.contact,
    location:req.body.location,
  },function(error,created){
    if(error){
      return next(error);
    }else{
      return res.redirect(req.baseUrl + '/' + uicode);
    }
  });
});


//Get call for vendor population
router.get('/:code',function(req,res,next){
  Vendor.findOne({code: req.params.code}, function(error, vendor) {
    if (vendor == null) {
      var err = new Error('Invalid vendor code!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {

    }
  })
});

//Post call for vendor deletion
router.post('/:code/delete',function(req,res,next){
  Vendor.findOneAndRemove({code: req.params.code}, function(error, result) {

    if (error) {
      var err = new Error('Couldn\'t delete that vendor.');
      err.status = 400;
      return next(err);
    } else {

      console.log(req.baseUrl);
      return res.redirect(req.baseUrl);
    }
  });
});

//Get call for generic vendor search
router.get('/search',function(req,res,next){
  Vendor.find({ingredient: req.body.ingredient,name:req.body.name,
    location:req.body.location,code:req.body.code},function(error, vendor) {
    if (vendor == null) {
      var err = new Error('Nothing matched search criteria!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for vendors');
      err.status = 400;
      return next(err);
    } else {
      res.render('vendor_results')
    }
  })
});

router.get('/search', function(req, res, next){
  let name = req.body.name;

  Vendor.findOne({name:name},
    function(error, vendors) {
    if (error) {
      var err = new Error('Error loading vendors ');
      err.status = 400;
      return next(err);
    } else {
      //res.render('ingredients', { ingredients: ings });
      res.render('vendor',{vendor:vendors});
    }
  })
})

//PUT request to update an existing ingredient
// router.post('/update/', function(req, res) {
//   Ingredient.findOneAndUpdate({name: req.body.name}, function(){});
// });

module.exports = router;
