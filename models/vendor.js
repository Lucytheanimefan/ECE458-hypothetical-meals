var mongoose = require('mongoose');

var VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  location:{
    type: String,
    require: true
>>>>>>> master
  }
})

var Vendor = mongoose.model('Vendor', VendorSchema);
module.exports = Vendor;
