/*
  The back end api requires logged in user to send a grading session id for
  requests to certain endpoints via query string. It would be tedious and error
  prone to do this for every instane that this happens. This interceptor will
  add the id to all the requests and provides an interface for updating the id
  sent
*/
angular.module("easyFeedback").
factory("GradingSessionIdInterceptor", function () {
    var id = null;
    return {
        request: function (config) {
            config.params = {id: id};
            return config;
        },
        set_grading_session_id: function (new_id) {
            id = new_id;
        }
    };
});