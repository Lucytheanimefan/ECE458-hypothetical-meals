var express = require('express');
var router = express.Router();
var Vendor = require('../models/vendor');
let displayLimit = 10;

router.get('/vendors',function(req,res,next){

});

router.post('/vendors/create_vendor',function(req,res,next){

});

router.get('/vendors/:code',function(req,res,next){

});

router.get('vendors/:ingredient?/:location?',function(req,res,next){

});


module.exports = router;
