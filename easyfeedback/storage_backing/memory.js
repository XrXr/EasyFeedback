/*
  A simple implementation of in-memory key-value backing storage. Used in
  storageMan
*/
var bcrypt = require("bcrypt");

function MemoryStorage (cb) {
    var data = new Map();
    cb(null, {
        get: function (key, cb) {
            cb(null, data.get(key));
        },
        set: function (key, value, cb) {
            data.set(key, value);
            cb(null, true);
        }
    });
}

// ignore errors since we know from above that no error will ever happen
function MemoryCredentialStorage (cb) {
    MemoryStorage(function (_, user_info) {
        cb(null, {
            authenticate: authenticate,
            create_user: create_user
        });

        function authenticate (username, password, cb) {
            user_info.get(username, function (_, hashed) {
                if (typeof username !== "string") {
                    return cb(TypeError("Username must be string"));
                }
                if (typeof password !== "string") {
                    return cb(TypeError("Password must be string"));
                }
                if (!hashed) {  // not a user on record
                    return cb(null, false);
                }
                bcrypt.compare(password, hashed, cb);
            });
        }

        function create_user (username, password, cb) {
            if (typeof username !== "string") {
                return cb(TypeError("Username must be string"));
            }
            if (typeof password !== "string") {
                return cb(TypeError("Password must be string"));
            }
            if (username.length < 6) {
                return cb(null, {
                    success: false,
                    reason: "username_too_short"
                });
            }
            if (password.length < 6) {
                return cb(null, {
                    success: false,
                    reason: "password_too_short"
                });
            }
            user_info.get(username, function (_, pwd) {
                if (typeof pwd !== "undefined") {
                    return cb(null, {
                        success: false, reason: "user_already_exist"
                    });
                }
                bcrypt.hash(password, 10, function (err, hashed) {
                    if (err) {
                        return cb(err);
                    }
                    user_info.set(username, hashed, function () {
                        cb(null, {success: true});
                    });
                });
            });
        }
    });
}

module.exports.MemoryStorage = MemoryStorage;
module.exports.MemoryCredentialStorage = MemoryCredentialStorage;