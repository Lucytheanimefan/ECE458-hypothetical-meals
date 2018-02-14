var mongoose = require('mongoose');


var LoggableSchema = new mongoose.Schema({
  entities: {
    type: String,
    required: true
  },
  initiating_user: {
  	type:String, 
  }
});


var Loggable = mongoose.model('Loggable', LoggableSchema);
module.exports = Loggable;

