var mongoose = require('mongoose');

module.exports.extendSchema = function(Schema, definition, options) {
  return new mongoose.Schema(
    Object.assign({}, Schema.obj, definition),
    options
  );
}