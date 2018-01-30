var mongoose = require('mongoose');


var InventorySchema = new mongoose.Schema({
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
module.exports = Inventory;
