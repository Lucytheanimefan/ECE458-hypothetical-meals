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
module.exports = Inventory;
