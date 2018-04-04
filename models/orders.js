var mongoose = require('mongoose');
var uniqid = require('uniqid');
mongoose.Promise = global.Promise;
var path = require('path');
var User = require(path.resolve(__dirname, "./user.js"));
var Log = require(path.resolve(__dirname, "./log.js"));
var InventoryHelper = require('../helpers/inventory');

var OrdersSchema = new mongoose.Schema({
  products:[{
    ingID : {type:mongoose.Schema.Types.ObjectId,ref:'Ingredient'},
    vendID: {type:mongoose.Schema.Types.ObjectId,ref:'Vendor'},
    amount: Number,
    pending: Boolean
  }],
  orderNumber: {
    type: String,
    unique: true
    required:true
  },
  completed: {
    type: Boolean
  },
  timeStamp: {
    type: Number,
    required: true
  }
});

var Orders = mongoose.model('Ingredient', IngredientSchema);

module.exports.addOrder = function(products, amount, timeStamp) {
  return Orders.create({
    'products': products,
    'orderNumber': uniqid(),
    'completed': false,
    'timeStamp': timeStamp
  });
}

module.exports.getOrder = function(orderNumber){
  return Orders.find({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }).exec();
}

module.exports.getAllCompleteOrders = function(){
  return Orders.find({'completed':false}).exec();
}

module.exports.getAllIncompleteOrders = function(){
  return Orders.find({'completed':true}).exec();
}

module.exports.markIngredientArrived = function(orderNumber,ingID,vendID){
  return Orders.findOneAndUpdate({'orderNumber':{
                     $regex : new RegExp(orderNumber, "i") },
                     'products.vendID':mongoose.Types.ObjectId(vendID),
                     'products.ingID':mongoose.Types.ObjectId(ingID)
                   },{
                       '$set':{
                         'product.$.pending' : true
                       }
                     })
}

/*
module.exports.removeIngredient = function(orderNumber,ingID,vendID){
  return Vendor.findOneAndUpdate({'orderNumber':{
                     $regex : new RegExp(orderNumber, "i") }},{'$pull':{'products':{'ingID':ingID,'vendID':vendID}}}).exec();
}

module.exports.addIngredient = function(orderNumber,ingID,vendID){
  ingID = mongoose.Types.ObjectId(ingID.toString());
  vendID = mongoose.Types.ObjectId(vendID.toString());
  let entry = {ingID:ingID, vendID:vendID, amount};
  return Vendor.findOneAndUpdate({'code':{
                     $regex : new RegExp(code, "i") }},{'$push':{'catalogue':entry}}).exec();
}
*/
module.exports.removeOrder = function(orderNumber){
  return Orders.findOneAndRemove({ 'orderNumber': {
                     $regex : new RegExp(orderNumber, "i") }}).exec();
}

module.exports.getAllOrders = function(){
  return Orders.find().exec();
}

module.exports.model = Orders;
