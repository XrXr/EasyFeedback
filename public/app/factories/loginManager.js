// Keep track of login status and provide interface for logging in, out and
// registeration
angular.module("easyFeedback").
factory("LoginManager", function ($http, $q, SessionManager) {
    var logged_in_user;
    return {
        // return undefined if user is not logged in
        get_logged_in_user: function () {
            return logged_in_user;
        },
        /*
          Attempt to log in
          @return {promise} Resolves to object with a boolean success field.
          The field will be true if the log in attempt was successful. There
          will be an additional field -- reason if the log in faild. The
          reason field contains a message about why the log in failed. If the
          server responds with data that doesn't fit this format, the promise
          will reject.
        */
        login: function (username, password) {
            return $http.post("/login", {
                username: username,
                password: password,
            }).then(function (res) {
                var data = res.data;
                var success = data.success;
                if (typeof success !== "boolean") {
                    return $q.reject(Error("Bad response"));
                }
                if (success) {
                    logged_in_user = username;
                    // After a sucessfully log in, fetch current session again,
                    // For when a temporary session is transfered to a logged
                    // in user
                    return SessionManager.fetch_current_session().
                        then(function () {
                            return data;
                        });
                }
                return data;
            });
        },
        /*
           Query the server about the current log in status and update the
           local status according to that
        */
        synchronize_login_status: function () {
            $http.get("/login_status").success(function (status) {
                if (status.logged_in) {
                    logged_in_user = status.username;
                }
            });
        },
        register: function (username, password) {
            return $http.post("/register", {
                username: username,
                password: password,
            }).then(function (res) {
                res = res.data;
                var success = res.success;
                if (typeof success !== "boolean" ||
                    (!success && typeof res.reason !== "string")) {
                    return $q.reject(Error("Bad response"));
                }
                return res;
            });
        }
    };
});