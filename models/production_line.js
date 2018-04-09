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
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  formulas: [
    { formulaId: { type: mongoose.Schema.ObjectId, ref: 'Formula' } }
  ],
  busy: {
    type: Boolean,
    default: false,
    required: true
  },
  currentProduct: {
    formulaId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Formula'
    },
    name: {
      type: String
    },
    amount: {
      type: Number
    },
    ingredientLots: [{
      ingID: String,
      ingName: String,
      lotNumber: String,
      vendorID: String
    }]
  },
  history: [{
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      /*'busy' or 'idle' */
      required: true,
    },
    product: { /* a line can only make one product at a time. This is the product that was being made at that time */
      // A final product is just a formula
      type: mongoose.Schema.ObjectId,
      ref: 'Formula'
    }
  }]
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
  return ProductionLine.find({}).exec();
}

module.exports.paginate = function(query = {}, perPage = 10, page = 0) {
  return ProductionLine.find(query).limit(perPage).skip(perPage * page);
}

//TODO: The system should disallow removal of a busy production line with an appropriate error message.
module.exports.deleteProductionLine = function(id) {
  return ProductionLine.findOneAndRemove({ '_id': id }).exec();
}

module.exports.createProductionLine = function(productionLineInfo) {
  return ProductionLine.create(productionLineInfo);
}

// Gets all production lines for a formula
module.exports.productionLinesForFormula = function(formulaId) {
  return ProductionLine.find({ 'formulas': { $elemMatch: { formulaId: mongoose.Types.ObjectId(formulaId) } } } /*{ 'formulas.formuladId': formulaId }*/ ).exec();
}

// Gets all idle production lines for a formula
module.exports.idleProductionLinesForFormula = function(formulaId) {
  return ProductionLine.find({
    'busy': false,
    'formulas': {
      $elemMatch: {
        formulaId: mongoose.Types.ObjectId(formulaId)
      }
    }
  }).exec();
}

/**
 * Adds a formula to a production line
 * @param {[type]} productionLineId [description]
 * @param {[type]} formulaId        [description]
 */
module.exports.addFormulaFromProductionLines = function(productionLineId, formulaId) {
  return ProductionLine.findOneAndUpdate({ _id: productionLineId }, { $push: { formulas: { "formulaId": mongoose.Types.ObjectId(formulaId) } } }).exec();
}

/**
 * Deletes a formula from a production line
 * @param  {[type]} productionLineId [description]
 * @param  {String} formulaId        [description]
 * @return {[type]}                  [description]
 */
module.exports.deleteFormulaFromProductionLines = function(productionLineId, formulaId) {
  return ProductionLine.update({ _id: productionLineId }, { $pull: { formulas: { "formulaId": mongoose.Types.ObjectId(formulaId) } } }).exec();
}

/**
 * Adds a history entry specifying when a production line becomes busy or idle and what product was put on or taken off the line at the time
 * @param  {String} status    "busy" or "idle"
 * @param  {String} formulaId [description]
 * @return {[type]}           [description]
 */
module.exports.updateHistory = function(productionLineId, status, formulaId = null) {
  var history;
  if (formulaId != null) {
    history = {
      'status': status.toLowerCase(),
      'product': mongoose.Types.ObjectId(formulaId)
    }
  } else {
    history = {
      'status': status.toLowerCase(),
    }
  }
  return ProductionLine.findOneAndUpdate({ _id: productionLineId }, {
    $push: {
      history: history
    }
  }, { new: true }).exec();
}

/**
 * Adds a product to the production line
 * @param {[type]} productionLineId [description]
 * @param {[type]} formulaId        [description]
 */
module.exports.addProductToProductionLine = function(productionLineId, formulaId, formulaName, amount, lotsConsumed) {
  return ProductionLine.findOneAndUpdate({ _id: productionLineId }, {
    $set: {
      busy: true,
      currentProduct: { formulaId: mongoose.Types.ObjectId(formulaId), name: formulaName, amount: amount, ingredientLots: lotsConsumed }
    }
  }, { new: true }).exec();
}

/**
 * The general update of a production line
 * @param  {[type]} id         Production line mongodb unique id
 * @param  {[type]} updateInfo A dictionary with the following optional keys (as defined by the model) : name, description, busy
 * @return {[type]}            [description]
 */
module.exports.updateProductionLine = function(id, updateInfo) {
  return ProductionLine.findOneAndUpdate({ '_id': id }, {
    '$set': updateInfo,
  }, { upsert: true }).exec();
}

// module.exports.getProductionLineHistory = function(productionLineObject, startDate, endDate) {
//   return productionLineObject.find({
//     'history': {
//       'timestamp': {
//         "$gte": startDate,
//         "$lte": endDate
//       }
//     }
//   })
// }

//startDate = new Date(req.query.start);
// endDate = new Date(req.query.end);
// query['time'] = { "$gte": startDate, "$lte": endDate }
//