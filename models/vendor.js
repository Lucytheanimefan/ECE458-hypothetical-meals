var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
// var mongoosePaginate = require('mongoose-paginate');

var VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  location:{
    type: String,
    required: false,
    trim: true
  },
  catalogue:[
    {
      ingredient:{type:mongoose.Schema.Types.ObjectId, ref:'Ingredient'},
      cost:Number
    }
  ],
  history:[{ingredient:String, cost:Number, number:Number}]
})

var Vendor = mongoose.model('Vendor', VendorSchema);

module.exports.findVendorById = function(id) {
  return Vendor.findById(id).exec();
}

module.exports.findVendorByName = function(name){
  return Vendor.findOne({'name':name}).exec();
}

module.exports.findVendorByCode = function(code){
  return Vendor.findOne({'code':code}).populate('catalogue.ingredient').exec();
}

module.exports.findVendorByCodeAndName = function(code,name){
  return Vendor.findOne({'code':code, 'name':name})
}

module.exports.findVendorsForIngredient = function(ingredientID) {
  return Vendor.find({ 'catalogue.ingredient': ingredientID });
}

module.exports.createVendor = function(name, code, contact, location) {
  return Vendor.create({
    'name': name,
    'code': code,
    'contact': contact,
    'location': location,
    'history':[],
    'catalogue':[]
  });
}

module.exports.updateVendor = function(code, name, newCode, contact, location) {
  return Vendor.findOneAndUpdate({ 'code':  code }, {
    '$set': {
      'name': name,
      'code': newCode,
      'contact': contact,
      'location': location
    }
  }).exec();
}

module.exports.deleteVendor = function(code) {
  return Vendor.findOneAndRemove({ 'code': code }).exec();
}

module.exports.addIngredient = function(code, ingId, cost){
  ingId = mongoose.Types.ObjectId(ingId.toString());
  let entry = {ingredient:ingId, cost:cost};
  return Vendor.findOneAndUpdate({'code':code},{'$push':{'catalogue':entry}}).exec();
}

module.exports.removeIngredient = function(code, ingId){
  return Vendor.findOneAndUpdate({'code':code},{'$pull':{'catalogue':{'ingredient':ingId}}}).exec();
}

module.exports.removeDeletedIngredient = function(code, ingId){
  return Vendor.findOneAndUpdate({'code':code},{'$pull':{'catalogue':{'_id':ingId}}}).exec();
}

module.exports.model = Vendor;
