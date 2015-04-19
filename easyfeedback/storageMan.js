/*
  An abstraction layer on top of express session. Provide interface for storing
  per-session data and persistent data. All the callbacks in this module take
  two parameters -- err and data.
*/
var readConfig = require("./configReader").readConfig;

/*
  Retreive from per-session storage
  @param {object} session - express session object
  @param {function} cb - callback to call with retreived data
*/
function temp_retreive (session, cb) {
    return process.nextTick(function () {
        return cb(null, session._store || {});
    });
}

/*
  Commit to per-session storage
  @param {object} session - express session object
  @param {function} cb - callback to call when done
*/
function temp_commit (session, data, cb) {
    return process.nextTick(function () {
        session._store = data;
        return cb(null, true);
    });
}

/*
  Return an object that has the methods to use for storing per-user data. A
  backing object is expected to store the data put in for at least the lifetime
  of the node process
  @param {object} backing - an object that implements the backing storage
    methods. See ./storage_backing/memory for an example
  @return {object} an object with two properties, login_retrieve and
    login_commit
*/
function make_login_gates (backing) {
    function login_retrieve (session, cb) {
        if (!is_login(session)) {
            cb(Error("Not a login session"));
        }
        var username = get_username(session);
        backing.get(username, function (err, data) {
            if (err) {
                return cb(err, null);
            }
            cb(null, data || {});
        });
    }

    function login_commit (session, data, cb) {
        if (!is_login(session)) {
            cb(Error("Not a login session"));
        }
        var username = get_username(session);
        backing.set(username, data, function (err, status) {
            if (err) {
                return cb(err, null);
            }
            cb(null, status);
        });
    }

    return {
        login_retrieve: login_retrieve,
        login_commit: login_commit
    };
}

/*
  Make a pair of gate functions named default_retrieve and default_commit that
  automatically select data source/destination depending on the log in status
  of the user
*/
function make_default_gates (temp_retreive, temp_commit, login_retrieve,
                             login_commit) {
    /*
      Retrive an object used for storage. The source of the object depends on
      the status data stored in the session object passed in. A login session
      retrieves from a different source than a regular session
      @param {object} session - express session object
      @param {function} cb - callback called with retrieved data
    */
    function default_retrieve (session, cb) {
        if (is_login(session)) {
            return login_retrieve(session, cb);
        }
        return temp_retreive(session, cb);
    }

    /*
      Commit an object used for storage. The destination of the object depends
      on the status data stored in the session object passed in. A login
      session commits to a different source than a regular session
      @param {object} session - express session object
      @param {function} cb - callback when done
    */
    function default_commit (session, data, cb) {
        if (is_login(session)) {
            return login_commit(session, data, cb);
        }
        return temp_commit(session, data, cb);
    }
    return {
        default_commit: default_commit,
        default_retrieve: default_retrieve
    };
}

/*
  Predicate that returns wheter an express session is considered a login
  session
  @param {object} session - express session object
*/
function is_login (session) {
    var username = session._username;
    return typeof username === "string" && username.length > 0;
}

/*
  Get username from a session object. If the session is not a login session,
  an error is thrown
  @param {object} session - express session object
*/
function get_username (session) {
    if (!is_login(session)) {
        throw Error("Not a login session");
    }
    return session._username;
}

/*
  Return a function used for marking a session as a log in session
  @param {function} authenticate - function used to check username and
    password. It should take 3 arguments, username, and callback
*/
function make_login_checker (authenticate) {
    return function (session, username, password, cb) {
        authenticate(username, password, function (err, success) {
            if (err) {
                return cb(err, null);
            }
            if (success) {
                session._username = username;
                return cb(null, true);
            }
            cb(null, false);
        });
    };
}

/*
  This module might need to do some async operation before it can be used. For
  example, connecting to a DB.
*/
function initialize (cb) {
    var final_object = {};
    readConfig(function (err, config) {
        if (err) {
            throw err;
        }
        switch (config.backing) {
            default: {
                var mem = require("./storage_backing/memory");
                mem.MemoryStorage(function (err, backing) {
                    make_gates(err, backing);
                    mem.MemoryCredentialStorage(add_login_functions);
                });
                break;
            }
        }
    });

    function make_gates (err, backing) {
        if (err) {
            throw err;
        }
        var login_gates = make_login_gates(backing);
        var login_retrieve = login_gates.login_retrieve;
        var login_commit = login_gates.login_commit;
        var default_gates = make_default_gates(temp_retreive, temp_commit,
                                               login_retrieve, login_commit);
        final_object = {
            default_retrieve: default_gates.default_retrieve,
            default_commit: default_gates.default_commit,
            temp_retreive: temp_retreive,
            temp_commit: temp_commit,
            login_retrieve: login_retrieve,
            login_commit: login_commit,
            is_login: is_login,
            get_username: get_username
        };
    }

    function add_login_functions (err, backing) {
        if (err) {
            throw err;
        }
        final_object.login = make_login_checker(backing.authenticate);
        final_object.create_user = backing.create_user;
        cb(null, final_object);
    }
}

module.exports = initialize;