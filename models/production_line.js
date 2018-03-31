var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// A part of a production facility capable of producing a food product. 
// Certain production lines can only make certain products, and a line 
// can only make one product at a time. A production line that is in use 
// is busy, otherwise it is idle.

// Administrator will be able to add, edit, or remove production lines. A production line is defined as:
// • A unique name
// • A multi-line description field, optional
// • A mapping to zero or more formulas that the production line is capable of
// supporting


var ProductionLineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
  },
  formulas: [
    { formulaId: { type: mongoose.Schema.ObjectId, ref: 'Formula' } }
  ],
  busy: {
    type: Boolean,
    default: false,
    required: true
  }

})

var ProductionLine = mongoose.model('ProductionLine', ProductionLineSchema);
module.exports.model = ProductionLine;

module.exports.createProductionLine = function(info) {
  return Ingredient.create(info);
}

module.exports.getProductionLine = function(name) {
  return ProductionLine.findOne({ 'name': name }).exec();
}

module.exports.getProductionLineById = function(id) {
  return ProductionLine.findById(id).exec();
}

module.exports.getAllProductionLines = function() {
  return ProductionLine.find().exec();
}

module.exports.paginate = function(query = {}, perPage = 10, page = 0) {
  return ProductionLine.find(query).limit(perPage).skip(perPage * page)
}

//TODO: The system should disallow removal of a busy production line with an appropriate error message.
module.exports.deleteProductionLine = function(id) {
  return ProductionLine.findOneAndRemove({ '_id': id }).exec();
}

module.exports.createProductionLine = function(productionLineInfo) {
  return ProductionLine.create(productionLineInfo);
}

/**
 * [updateProductionLine description]
 * @param  {[type]} id         Production line mongodb unique id
 * @param  {[type]} updateInfo A dictionary with the following optional keys (as defined by the model) : name, description, busy
 * @return {[type]}            [description]
 */
module.exports.updateProductionLine = function(id, updateInfo, formulas) {
  console.log("FORMULAS TO UPDATE PRODUCTION LINE WITH:");
  console.log(formulas);
  return ProductionLine.findOneAndUpdate({ '_id': id }, {
    '$set': updateInfo,
    '$push': { formulas: { $each: formulas } },
  }, { upsert: true }).exec();
}