var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
let displayLimit = 10;

//Get call for vendor population
router.get('/vendors',function(req,res,next){
  Vendor.findVendors(displayLimit,function(error,vendors){
    if(error){
      var err = new Error("Failed to pull Vendors");
      err.code = 400;
      return next(error);
    }else{
      //render page with vendors
    }
  });
});

//Post call for vendor creation
router.post('/vendors/create_vendor',function(req,res,next){
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
router.get('/vendors/:code',function(req,res,next){
  Vendor.findByCode(req.params.code,function(error,vendor){
    if(error){
      var err = new Error("Failed to Find Vendor");
      err.status = 400;
      return next(error);
    }
    else{
      //render page
    }
  });
});

//Post call for vendor deletion
router.post('/vendors/:code/delete',function(req,res,next){
  Vendor.findByCode(req.params.code,function(error,result){
    if(error){
      var err = new Error('Deletion of Vendor Failed');
      err.status = 400;
      return next(error);
    }
    else{
      return res.redirect('/vendors');
    }
  });
});

//Get call for generic vendor search
router.get('vendors/:ingredient?/:location?',function(req,res,next){
  if(!req.params.ingredient && !req.params.location){
    var err = new Error('Need to enter search parameters');
    err.status = 400;
    return next(err);
  }else if(!req.params.ingredient && req.params.location != null){
    Vendor.findByLocation(req.params.location, function(error,vendors){
      if(error){
        var err = new Error("Failed to Find Vendor");
        err.status = 400;
        return next(error);
      }else{
        //render vendors
      }
    });
  }else if(req.params.ingredient != null && !req.params.location){
    Vendor.findByIngredient(req.params.ingredient, function(error,vendors){
      if(error){
        var err = new Error("Failed to Find Vendor");
        err.status = 400;
        return next(error);
      }else{
        //render vendors
      }
    });
  }else{
    Vendor.findByLocationIngredient(req.params.location,req.params.ingredient, function(error,vendors){
      if(error){
        var err = new Error("Failed to Find Vendor");
        err.status = 400;
        return next(error);
      }else{
        //render vendors
      }
    });
  }
});


module.exports = router;
