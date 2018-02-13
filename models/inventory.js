var mongoose = require('mongoose');
mongoose.Promise = global.Promise;


var InventorySchema = new mongoose.Schema({
  type:String,
  limits: {
    refrigerated:Number,
    frozen:Number,
    room:Number
  },
  current: {
    refrigerated:Number,
    frozen:Number,
    room:Number
  }
})


var Inventory = mongoose.model('Inventory', InventorySchema);

module.exports.getInventory = function() {
  return Inventory.findOne( {'type': 'master'} ).exec();
}

module.exports.updateInventory = function(updateObject) {
  return Inventory.findOneAndUpdate({'type': 'master'}, {
        '$inc': updateObject
      });
}

module.exports.model = Inventory;
