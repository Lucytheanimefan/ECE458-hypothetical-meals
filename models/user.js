var mongoose = require('mongoose');
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
    trim: true
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
    type: String, // "Admin" or "User" or "Manager"
    default: 'user',
    required: true,
  },
  cart: {
    type: Array
  },
  report: {
    type: Array
  },
  production_report: {
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

UserSchema.statics.authenticate_netid = function(netid, email, callback) {
  findUserByNetid(netid, function(err, user) {
    if (err) {
      console.log('Err: ' + err);
      return callback(err);
    } else if (!user) {
      var user_data = { 'netid': netid, 'username': netid, 'isDukePerson': true };
      if (email != null) {
        user_data['email'] = email;
      }
      // User not found, create an account associated with netid
      User.create(user_data, function(error, user) {
        if (error) {
          console.log("Error creating user: ");
          console.log(error);
          return callback(error);
        }
        // Try logging in again
        findUserByNetid(netid, function(err, user) {
          if (err) {
            console.log('Error finding user by netid: ');
            console.log(err);
            return callback(err);
          }
          return callback(null, user);
        });
      })
    } else {
      console.log('Found the user!');
      console.log(user);
      return callback(null, user);
    }
  })
}

UserSchema.statics.update = function(userdata, newdata, callback) {

  //console.log(userdata);

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


findUserByNetid = function(netid, callback) {
  let user_data = { netid: netid };
  User.findOne(user_data)
    .exec(function(err, user) {
      callback(err, user);
    })
}

makeUserLog = function(user) {
  let log_data = {
    'title': 'User created',
    'description': user.username + ', ' + user.email + ', ' + user.role,
    'entities': 'user'
    /*,
        'user': user.username + ', ' + user.role*/
  }
  Log.create(log_data, function(error, log) {
    if (error) {
      console.log('Error logging user data: ');
      console.log(error);
      //return next();
    }
    console.log('Logged user: ' + log);
    //return next();
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
        makeUserLog(user);
        next(null, user);
      });
    }
  } else if (user.netid !== null) {
    return next(null, user);
  }
});

UserSchema.pre('update', function(next) {
  console.log('Updating user, need to log!');
  var user = this;
  let log_data = {
    'title': 'User updated',
    'description': user.username + ', ' + user.email + ', ' + user.role,
    'entities': 'user'/*,
    'user': user.username + ', ' + user.role*/
  }
  Log.create(log_data, function(error, user) {
    if (error) {
      console.log('Error logging user data: ');
      console.log(error);
      return next();
    }
    console.log('Logged user update: ' + log);
    return next();
  })
});


var User = mongoose.model('User', UserSchema);
module.exports = User;