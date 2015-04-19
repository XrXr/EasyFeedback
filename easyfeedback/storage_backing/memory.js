/*
  A simple implementation of in-memory key-value backing storage. Used in
  storageMan
*/
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
            user_info.get(username, function (_, pwd) {
                if (typeof username !== "string") {
                    return cb(TypeError("Username must be string"));
                }
                if (typeof password !== "string") {
                    return cb(TypeError("Password must be string"));
                }
                if (typeof pwd === "string" && pwd.length > 0 &&
                    pwd === password) {
                    return cb(null, true);
                }
                return cb(null, false);
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
                if (typeof pwd === "undefined") {
                    return user_info.set(username, password, function () {
                        cb(null, {success: true});
                    });
                }
                return cb(null, {
                    success: false, reason: "user_already_exist"
                });
            });
        }
    });
}

module.exports.MemoryStorage = MemoryStorage;
module.exports.MemoryCredentialStorage = MemoryCredentialStorage;