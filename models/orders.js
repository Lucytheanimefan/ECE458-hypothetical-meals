var mongoose = require('mongoose');
var uniqid = require('uniqid');
var express = require('express');
var router = express.Router();
mongoose.Promise = global.Promise;

var OrdersSchema = new mongoose.Schema({
  products:[{
    ingID : {type:mongoose.Schema.Types.ObjectId,ref:'Ingredient'},
    vendID: {type:mongoose.Schema.Types.ObjectId,ref:'Vendor'},
    quantity: Number,
    arrived: Boolean,
    assigned: String
  }],
  orderNumber: {
    type: String,
    unique:true,
    required:true
  },
  completed: {
    type: Boolean
  },
  orderTimeStamp: {
    type: String,
    required: true
  },
  arrivalTimeStamp: {
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
    'orderTimeStamp': Date(),
    'arrivalTimeStamp': "n/a"
  });
}

module.exports.getOrder = function(orderNumber){
  return Orders.findOne({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }}).populate('products.ingID').populate('products.vendID').exec();
}

module.exports.getAllCompleteOrders = function(){
  return Orders.find({'completed':true}).populate('products.ingID').populate('products.vendID').exec();
}

module.exports.getAllIncompleteOrders = function(){
  return Orders.find({'completed':false}).populate('products.ingID').populate('products.vendID').exec();
}

module.exports.getAllUnassignedIngredients = function(){
  return Orders.find({'completed':false,'products.assigned':"n/a"}).exec();
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

module.exports.markIngredientAssigned  = function(orderNumber,ingID,vendID,lotNumber){
  return Orders.findOneAndUpdate({'orderNumber':{
                     $regex : new RegExp(orderNumber, "i") },
                     'products.vendID':mongoose.Types.ObjectId(vendID),
                     'products.ingID':mongoose.Types.ObjectId(ingID)
                   },{
                       '$set':{
                         'product.$.assigned' : lotNumber
                       }
                     })
}

module.exports.removeOrder = function(orderNumber){
  return Orders.findOneAndRemove({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }}).exec();
}

module.exports.getAllOrders = function(){
  return Orders.find().populate('products.ingID').populate('products.vendID').exec();
}

module.exports.model = Orders;
