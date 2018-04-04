var mongoose = require('mongoose');
var uniqid = require('uniqid');
mongoose.Promise = global.Promise;
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));
var InventoryHelper = require('../helpers/inventory');

var OrdersSchema = new mongoose.Schema({
  ingID: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
    required:true
  },
  pending: {
    type: Boolean
  },
  vendorID: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  timeStamp: {
    type: Number,
    required: true
  }
});

var Orders = mongoose.model('Ingredient', IngredientSchema);

module.exports.addOrderIngredient = function(ingID, vendorID, amount, timeStamp) {
  return Ingredient.create({
    'ingID': mongoose.Types.ObjectId(ingID),
    'vendorID': mongoose.Types.ObjectId(vendorID),
    'amount': parseInt(amount),
    'orderNumber': uniqid(),
    'pending': true,
    'timeStamp': timeStamp
  });
}

module.exports.getOrderIngredient = function(orderNumber, ingID, vendorID) {
  return Orders.findOne({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }, 'ingID' : ingID, 'vendorID' : vendorID }).exec();
}

module.exports.getOrder = function(orderNumber){
  return Orders.find({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }).exec();
}

module.exports.markIngredientComplete = function(orderNumber, ingID, vendorID){
  return Orders.findOneAndUpdate({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }, 'ingID' : ingID, 'vendorID' : vendorID },{
                       '$set':{
                         'pending' : true
                       }
                     })
}

module.exports.removeOrderIngredient = function(orderNumber, ingID, vendorID){
  return Orders.findOneAndRemove({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }, 'ingID' : ingID, 'vendorID' : vendorID }).exec();
}

module.exports.getAllOrders = function(){
  return Orders.find().exec();
}

module.exports.model = Orders;
