var mongoose = require('mongoose');
var bcrypt = require('bcrypt');



var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  passwordConf: {
    type: String,
    required: false,
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  role: {
    type: String, // "Admin" or "User"
    required: true,
  },
  cart: {
    type: Array
  }
});

//authenticate input against database
UserSchema.statics.authenticate = function(email, password, callback) {
  User.findOne({ email: email })
    .exec(function(err, user) {
      console.log('authenticate: ' + user);
      if (err) {
        console.log('Err: ' + err);
        return callback(err)
      } else if (!user) {
        var err = new Error('User not found.');
        err.status = 401;
        return callback(err);
      }
      bcrypt.compare(password, user.password, function(err, result) {
        //console.log('Compare password: ' + password + ' vs ' + user.password);
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      })
    });
}

//hashing a password before saving it to the database
//UserSchema.pre('save', function(next) {
  // console.log('HASH THE PASSWORD');
  // var user = this;
  // bcrypt.hash(user.password, 10, function(err, hash) {
  //   if (err) {
  //     return next(err);
  //   }
  //   user.password = hash;
  //   next();
  // })
//});


var User = mongoose.model('User', UserSchema);
module.exports = User;
