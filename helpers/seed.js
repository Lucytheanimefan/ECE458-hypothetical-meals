//seed.js
var User = require('../models/user');

var user = {
    username: "Admin User",
    email: "admin@admin.com",
    role: "Admin",
    password: "admin",
    passwordConf: "admin",
    isVerified: true
}

User.create(user, function(e) {
    if (e) {
        throw e;
    }
});