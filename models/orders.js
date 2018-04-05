var mongoose = require('mongoose');
var uniqid = require('uniqid');
var express = require('express');
var router = express.Router();
mongoose.Promise = global.Promise;

var OrdersSchema = new mongoose.Schema({
  products:[{
    ingID : {type:mongoose.Schema.Types.ObjectId,ref:'Ingredient'},
    vendID: {type:mongoose.Schema.Types.ObjectId,ref:'Vendor'},
    amount: Number,
    arrived: Boolean,
    assigned: Boolean
  }],
  orderNumber: {
    type: String,
    unique:true,
    required:true
  },
  completed: {
    type: Boolean
  },
  timeStamp: {
    type: String,
    required: true
  }
});


var Orders = mongoose.model('Orders', OrdersSchema);

module.exports.addOrder = function(products) {
  return Orders.create({
    'products': products,
    'orderNumber': uniqid(),
    'completed': false,
    'timeStamp': Date()
  });
}

module.exports.getOrder = function(orderNumber){
  return Orders.find({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }}).exec();
}

module.exports.getAllCompleteOrders = function(){
  return Orders.find({'completed':false}).exec();
}

module.exports.getAllIncompleteOrders = function(){
  return Orders.find({'completed':true}).exec();
}

module.exports.getAllUnassignedIngredients = function(){
  return Orders.find({'completed':false,'products.assigned':false}).exec();
}

module.exports.markIngredientArrived = function(orderNumber,ingID,vendID){
  return Orders.findOneAndUpdate({'orderNumber':{
                     $regex : new RegExp(orderNumber, "i") },
                     'products.vendID':mongoose.Types.ObjectId(vendID),
                     'products.ingID':mongoose.Types.ObjectId(ingID)
                   },{
                       '$set':{
                         'product.$.arrived' : true
                       }
                     })
}

module.exports.markIngredientAssigned  = function(orderNumber,ingID,vendID){
  return Orders.findOneAndUpdate({'orderNumber':{
                     $regex : new RegExp(orderNumber, "i") },
                     'products.vendID':mongoose.Types.ObjectId(vendID),
                     'products.ingID':mongoose.Types.ObjectId(ingID)
                   },{
                       '$set':{
                         'product.$.assigned' : true
                       }
                     })
}

module.exports.removeOrder = function(orderNumber){
  return Orders.findOneAndRemove({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }}).exec();
}

module.exports.getAllOrders = function(){
  return Orders.find().exec();
}

module.exports.model = Orders;
