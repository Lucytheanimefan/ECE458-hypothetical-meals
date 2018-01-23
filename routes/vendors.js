var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
let displayLimit = 10;

//Get call for vendor population
router.get('/',function(req,res,next){
  console.log("meme")
});

//Post call for vendor creation
router.post('/create_vendor',function(req,res,next){
  Vendor.create({
    name:req.body.name,
    code:req.body.code,
    contact:req.body.contact,
    catalogue:req.body.catalogue
  },function(error,created){
    if(error){
      return next(error);
    }else{
      return res.redirect(req.baseUrl + '/' + req.body.code);
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
      //res.render('ingredient', { ingredient: ing })
    }
  })
});

//Post call for vendor deletion
router.post('/:code/delete',function(req,res,next){
  console.log("memistan");
  Vendor.findOneAndRemove({code: req.params.code}, function(error, result) {

    if (error) {
      var err = new Error('Couldn\'t delete that vendor.');
      err.status = 400;
      return next(err);
    } else {
      //alert user the ingredient has been deleted.
      console.log(req.baseUrl);
      return res.redirect(req.baseUrl);
    }
  });
});

//Get call for generic vendor search
router.get('/search/:ingredient?/:location?',function(req,res,next){
  Vendor.findOne({ingredient: req.params.ingredient}, function(error, vendor) {
    if (vendor == null) {
      var err = new Error('Invalid vendor code!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {
      //res.render('ingredient', { ingredient: ing })
    }
  })
  Vendor.findOne({location: req.params.location}, function(error, vendor) {
    if (vendor == null) {
      var err = new Error('Invalid vendor code!');
      err.status = 404;
      return next(err);
    } else if (error) {
      var err = new Error('Error searching for ' + req.params.code);
      err.status = 400;
      return next(err);
    } else {
      //res.render('ingredient', { ingredient: ing })
    }
  })
});


module.exports = router;
