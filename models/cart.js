var mongoose = require('mongoose');

var CartSchema = new mongoose.Schema({
  ingredient: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  }
});

CartSchema.statics.load = function(next) {
  Cart.find().toArray(function(err, result) {
    if (err) return next(err)
    res.render('cart', {items: result})
  })
}

var Cart = mongoose.model('Cart', CartSchema);
module.exports = Cart;
