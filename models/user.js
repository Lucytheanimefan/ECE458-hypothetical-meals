var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var bcrypt = require('bcrypt');
var path = require('path');
var Log = require(path.resolve(__dirname, "./log.js"));

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    trim: true
  },
  username: {
    type: String,
    required: false,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: false,
  },
  passwordConf: {
    type: String,
    required: false,
  },
  netid: {
    type: String,
    required: function() {
      return this.isDukePerson ? true : false
    }
  },
  isDukePerson: {
    type: Boolean,
    default: false
  },
  role: {
    type: String, // "Admin" or "User" or "Manager" or "it_person"
    default: 'user',
    required: true,
  },
  cart: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Ingredient',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    vendors: {
      type: Array,
      required: true
    }
  }],
  report: {
    type: Array
  },
  production_report: {
    type: Array
  }
});

//authenticate input against database
UserSchema.statics.authenticate = function(email, password, callback) {
  User.findOne({ username: email })
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
        console.log('Compare password: ' + password + ' vs ' + user.password);
        if (result === true) {
          return callback(null, user);
        } else {
          console.log('Incorrect password');
          return callback(null, null);
        }
      })
    });
}

UserSchema.statics.authenticate_netid = function(netid, email, callback) {
  console.log('authenticate_netid');
  findUserByNetid(netid, function(err, user) {
    if (err) {
      console.log('Err: ' + err);
      return callback(err);
    } else if (!user) {
      var user_data = { 'netid': netid, 'username': netid, 'isDukePerson': true };
      if (email != null) {
        user_data['email'] = email;
      }
      callback(null, null);

    } else {
      console.log('Found the user!');
      console.log(user);
      return callback(null, user);
    }
  })
}

UserSchema.statics.update = function(userdata, newdata, callback) {
  console.log('NEW DATA: ');
  console.log(newdata)

  User.findOne(userdata, function(err, user) {
    console.log(user);
    if (err) {
      console.log(err);
      let error = new Error('Couldn\'t find that user.');
      error.status = 400;
      return callback(error);
    }

    if (newdata['username'] != null) {
      user.username = newdata['username'];
    }
    if (newdata['password'] != null) {
      if (newdata['password'].length > 0) {
        user.password = newdata['password'];
      }
    }

    if (newdata['email'] != null) {
      user.email = newdata['email'];
    }

    if (newdata['role'] != null) {
      user.role = newdata['role'];
    }

    user.save(function(err) {
      if (err) {
        console.log(err);
        let error = new Error('Couldn\'t update that user.');
        error.status = 400;
        return callback(error);
      }
      return callback(null, user);
    });
  })
}

UserSchema.statics.all = function(callback) {
  console.log("reached");
  User.find({}, function(err, users) {
    if (err) {
      callback(err);
    }
    callback(null, users);
  })
}

UserSchema.statics.current_user = function(req, callback) {
  User.findById(req.session.userId)
    .exec(function(error, user) {
      if (error) {
        return callback(error);
      } else {
        if (user == null) {
          let err = new Error('No user for that id');
          return callback(err);
        } else {
          callback(null, user);
        }
      }
    });
}

UserSchema.statics.user_by_netid = function(netid, callback){
  findUserByNetid(netid, callback);
}

findUserByNetid = function(netid, callback) {
  let user_data = { netid: netid };
  User.findOne(user_data)
    .exec(function(err, user) {
      callback(err, user);
    })
}


//hashing a password before saving it to the database
UserSchema.pre('save', function(next) {
  console.log('HASH THE PASSWORD');
  var user = this;
  if (user.password !== null && user.password !== undefined) {
    if (user.password.length > 0) {
      console.log('Trying to hash');
      bcrypt.hash(user.password, 10, function(err, hash) {
        if (err !== null && err !== undefined) {
          console.log('Error after save: ' + err);
          return next(err);
        }
        user.password = hash;
        console.log('Saved password successfully');
        next(null, user);
      });
    }
  } else if (user.netid !== null) {
    return next(null, user);
  }
});

var User = mongoose.model('User', UserSchema);
module.exports = User;

module.exports.getUserById = function(id) {
  return User.findOne({'_id':id}).exec();
}

module.exports.addToCart = function(id, ingId, quantity, vendors) {
  ingId = mongoose.Types.ObjectId(ingId.toString());
  let entry = {ingredient:ingId, quantity:quantity, vendors:vendors};
  return User.findOneAndUpdate({'_id':id},{'$push':{'cart':entry}}).exec();
}

module.exports.removeOrder = function(id, ingId) {
  ingId = mongoose.Types.ObjectId(ingId.toString());
  return User.findOneAndUpdate({'_id':id},{'$pull':{'cart':{'ingredient':ingId}}}).exec();
}

module.exports.updateCart = function(id, ingId, quantity, vendors) {
  return new Promise(function(resolve, reject) {
    User.removeOrder(id,ingId).then(function(result){
      return User.addToCart(id,ingId,quantity,vendors);
    }).then(function(tuple) {
      resolve(tuple);
    }).catch(function(error) {
      reject(error);
    });
  })
}
