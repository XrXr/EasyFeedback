/*
  An abstraction layer on top of express session. Provide interface for storing
  per-session data and persistent data. All the callbacks in this module take
  two parameters -- err and data.
*/
var uuid = require("uuid");
var readConfig = require("./configReader").readConfig;
var is_object = require("is-object");

/*
  Retrieve from per-session storage
  @param {object} session - express session object
  @param {function} cb - callback to call with retrieved data
*/
function temp_retrieve (session, cb) {
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
  of the node process. Grading session data are expected to be objects.
  @param {object} backing - an object that implements the backing storage
    methods. See ./storage_backing/memory for an example
  @return {object} an object with properties session_retrieve,
    session_update and create_new_session
*/
function make_grading_sess_gates (backing) {
    function session_retrieve (session, key, cb) {
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        backing.get(key, function (err, data) {
            if (err) {
                return cb(err);
            }
            cb(null, data);
        });
    }

    function session_update (session, key, data, cb) {
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        backing.get(key, function (err, old_data) {
            if (err) {
                return cb(err);
            }
            if (!old_data) {
                return cb(Error("Cannot update a record that doesn't exist"));
            }
            var username = get_username(session);
            if (username !== old_data.owner) {
                return cb(Error("Unauthorized update"));
            }
            data.owner = username;
            backing.set(key, data, function (err, status) {
                if (err) {
                    return cb(err);
                }
                return cb(null, status);
            });
        });
    }

    function create_new_session (session, data, cb) {
        var id = uuid.v4();
        data.owner = get_username(session);
        data.id = id;
        backing.set(id, data, function (err, status) {
            if (err) {
                return cb(err);
            }
            set_active_grading_sess(session, id);
            return cb(null, id);
        });
    }

    return {
        session_retrieve: session_retrieve,
        session_update: session_update,
        create_new_session: create_new_session
    };
}

function make_user_data_gates (backing) {
    function user_data_retrieve (session, cb) {
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        var username = get_username(session);
        backing.get(username, function (err, data) {
            if (err) {
                return cb(err);
            }
            cb(null, data);
        });
    }

    function user_data_commit (session, data, cb) {
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        var username = get_username(session);
        backing.set(username, data, function (err, status) {
            if (err) {
                return cb(err);
            }
            cb(null, status);
        });
    }
    return {
        user_data_commit: user_data_commit,
        user_data_retrieve: user_data_retrieve
    };
}

/*
  Make a pair of gate functions named default_retrieve and default_commit that
  automatically select data source/destination depending on the log in status
  of the user
*/
function make_default_gates (temp_retrieve, temp_commit, session_retrieve,
                             session_update) {
    /*
      Retrive an object used for storage. The source of the object depends on
      the status data stored in the session object passed in. A login session
      retrieves from a different source than a regular session
      @param {object} session - express session object
      @param {function} cb - callback called with retrieved data
    */
    function default_retrieve (session, cb) {
        if (is_login(session)) {
            var active_grading_session = get_active_grading_sess(session);
            if (!has_active_grading_session(session)) {
                return cb(null, {});  // not active session
            }
            return session_retrieve(session, cb);
        }
        return temp_retrieve(session, cb);
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
            return session_update(session, data.id, data, cb);
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
    var user = session._user;
    return typeof user === "object" && typeof user.username === "string" &&
           user.username.length > 0 && is_object(user.data);
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
    return session._user.username;
}

function get_active_grading_sess (session) {
    if (!is_login(session)) {
        throw Error("Not a login session");
    }
    return session._user.data.active_grading_session;
}

function has_active_grading_session (session) {
    if (!is_login(session)) {
        return false;
    }
    var active_grading_session = get_active_grading_sess(session);
    return typeof active_grading_session === "string";
}

function set_active_grading_sess (session, grading_sess_id) {
    if (!is_login(session)) {
        throw Error("Not a login session");
    }
    session._user.data.active_grading_session = grading_sess_id;
}

/*
  Return a function used for marking a session as a log in session and storing
  additional data on the session
  @param {function} authenticate - function used to check username and
    password. It should take 3 arguments, username, and callback
*/
function make_login_function (authenticate, get_user_data) {
    return function (session, username, password, cb) {
        authenticate(username, password, function (err, success) {
            if (err) {
                return cb(err);
            }
            if (success) {
                return get_user_data(username, function (err, data) {
                    if (err) {
                        return cb(err);
                    }
                    session._user = {
                        username: username,
                        data: data || {}
                    };
                    return cb(null, true);
                });
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
        if (config.backing === "memory") {
            var mem = require("./storage_backing/memory");
            use_backing(mem.MemoryStorage, mem.MemoryCredentialStorage,
                        mem.MemoryStorage);
        } else {
            throw Error("Unknown backing storage type");
        }
    });

    function make_gates (err, backing) {
        if (err) {
            throw err;
        }
        var grading_sess_gates = make_grading_sess_gates(backing);
        var session_retrieve = grading_sess_gates.session_retrieve;
        var session_update = grading_sess_gates.session_update;
        var create_new_session = grading_sess_gates.create_new_session;
        var default_gates = make_default_gates(temp_retrieve, temp_commit,
                                               session_retrieve,
                                               session_update,
                                               create_new_session);
        final_object = {
            default_retrieve: default_gates.default_retrieve,
            default_commit: default_gates.default_commit,
            temp_retrieve: temp_retrieve,
            temp_commit: temp_commit,
            user: {
                session_retrieve: session_retrieve,
                session_update: session_update,
                create_new_session: create_new_session,
                set_active_grading_sess: set_active_grading_sess,
                get_active_grading_sess: get_active_grading_sess
            },
            is_login: is_login,
            get_username: get_username
        };
    }

    // Initialize the backing storages. This function should only be called
    // once
    function use_backing (user_session_backing, credential_backing,
                          template_backing) {
        user_session_backing(function (err, session_backing) {
            if (err) {
                throw err;
            }
            make_gates(err, session_backing);
            credential_backing(function (err, cred_backing) {
                if (err) {
                    throw err;
                }
                template_backing(function (err, usr_backing) {
                    if (err) {
                        throw err;
                    }
                    return add_login_functions(cred_backing, usr_backing);
                });
            });
        });
    }

    function add_login_functions (credential_backing, user_data_backing) {
        var authenticate = credential_backing.authenticate;
        var user_data_gates = make_user_data_gates(user_data_backing);
        final_object.login = make_login_function(authenticate,
                                                 user_data_backing.get);
        final_object.create_user = credential_backing.create_user;
        final_object.user_data_retrieve = user_data_gates.user_data_retrieve;
        final_object.user_data_commit = user_data_gates.user_data_commit;
        cb(null, final_object);
    }
}

module.exports = initialize;