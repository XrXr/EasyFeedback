/*
  An abstraction layer on top of express session and any kind of backing
  presistent sotrage. Provide interface for storing per-session data and
  persistent data. All the callbacks in this module take two parameters --
  err and data.
*/
var uuid = require("uuid");
var readConfig = require("./configReader").readConfig;
var utils = require("../easyfeedback/util");
var predefined_templates = utils.predefined_templates;

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
    session_update, retrieve_all_sessions, create_new_session
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
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        var id = uuid.v4();
        data.owner = get_username(session);
        data.id = id;
        backing.set(id, data, function (err, status) {
            if (err) {
                return cb(err);
            }
            return cb(null, id);
        });
    }

    // Retrieve all sessions owned by the logged in user
    function retrieve_all_sessions (session, cb) {
        if (!is_login(session)) {
            return cb(Error("Not a login session"));
        }
        var username = get_username(session);
        backing.find({owner: username}, cb);
    }

    return {
        session_retrieve: session_retrieve,
        session_update: session_update,
        create_new_session: create_new_session,
        retrieve_all_sessions: retrieve_all_sessions
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
  Predicate that returns wheter an express session is considered a login
  session
  @param {object} session - express session object
*/
function is_login (session) {
    var user = session._user;
    return typeof user === "object" && typeof user.username === "string" &&
           user.username.length > 0;
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
                session._user = {
                    username: username,
                };
            }
            cb(null, success);
        });
    };
}

/*
  Make a function that creates a user in the credential storage and initialize
  some data in the user data backing
*/
function make_create_user (cred_create_user, set_user_data) {
    return function (username, password, cb) {
        cred_create_user(username, password, function (err, status) {
            if (err) {
                return cb(err);
            }
            // failed to create in credential store
            if (!status.success) {
                return cb(null, status);
            }
            var initial_user_data = {
                active_session: undefined,
                prefered_template: 0,
                template_list: predefined_templates(),
            };
            set_user_data(username, initial_user_data, function (err) {
                if (err) {
                    return cb(err);
                }
                return cb(null, status);
            });
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

    // Initialize the backing storages. This function should only be called
    // once
    function use_backing (user_session_backing, credential_backing,
                          user_data_backing) {
        user_session_backing(function (err, session_backing) {
            if (err) {
                throw err;
            }
            make_gates(err, session_backing);
            credential_backing(function (err, cred_backing) {
                if (err) {
                    throw err;
                }
                user_data_backing(function (err, usr_backing) {
                    if (err) {
                        throw err;
                    }
                    return add_login_functions(cred_backing, usr_backing);
                });
            });
        });
    }

    function make_gates (err, backing) {
        if (err) {
            throw err;
        }
        var grading_sess_gates = make_grading_sess_gates(backing);
        var session_retrieve = grading_sess_gates.session_retrieve;
        var session_update = grading_sess_gates.session_update;
        var create_new_session = grading_sess_gates.create_new_session;
        var retrieve_all_sessions = grading_sess_gates.retrieve_all_sessions;
        final_object = {
            temp_retrieve: temp_retrieve,
            temp_commit: temp_commit,
            user: {
                retrieve_all_sessions: retrieve_all_sessions,
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

    function add_login_functions (credential_backing, user_data_backing) {
        var authenticate = credential_backing.authenticate;
        var user_data_gates = make_user_data_gates(user_data_backing);
        final_object.login = make_login_function(authenticate,
                                                 user_data_backing.get);
        final_object.create_user =
            make_create_user(credential_backing.create_user,
                             user_data_backing.set);
        final_object.user.data_retrieve = user_data_gates.user_data_retrieve;
        final_object.user.data_commit = user_data_gates.user_data_commit;
        cb(null, final_object);
    }
}

module.exports = initialize;