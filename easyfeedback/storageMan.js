/*
  An abstraction layer on top of express session. Provide interface for storing
  per-session data and persistent data. All the callbacks in this module take
  two parameters -- err and data.
*/

/*
  Retrive an object used for storage. The source of the object depends on the
  status data stored in the session object passed in. A logged in session
  retrieves from a different source than a regular session
  @param {object} session - express session object
  @param {function} cb - callback called with retrieved data
*/
function default_retrieve (session, cb) {
    // if (is_login_session(session))
    return temp_retreive(session, cb);
}

/*
  Commit an object used for storage. The destination of the object depends on
  the status data stored in the session object passed in. A logged in session
  commit to a different source than a regular session
  @param {object} session - express session object
  @param {function} cb - callback when done
*/
function default_commit (session, data, cb) {
    // if (is_login_session(session))
    return temp_commit(session, data, cb);
}

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

module.exports = {
    default_retrieve: default_retrieve,
    default_commit: default_commit,
    temp_retreive: temp_retreive,
    temp_commit: temp_commit
};