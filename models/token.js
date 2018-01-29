var mongoose = require('mongoose');


//create a verification token within Mongo.
//The TTL expires attribute is set to 43200 seconds, meaning the verification token document will automatically delete itself after 12 hours
const tokenSchema = new mongoose.Schema({
  _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now, expires: 43200 }
});



var Token = mongoose.model('Token', tokenSchema);
module.exports = Token;