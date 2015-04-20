angular.module("easyFeedback")
.controller("Login", function ($scope, LoginManager) {
    $scope.login_error = "";
    $scope.registration_successful = false;

    $scope.login = function (username, password) {
        LoginManager.login(username, password).then(function (res) {
            if (res.success) {
                return $scope.closeThisDialog(true);
            }
            return set_bad_log_in();
        }, set_internal_error);
    };

    $scope.register = function (username, password) {
        LoginManager.register(username, password).then(function (data) {
            var success = data.success;
            if (success) {
                $scope.error_status = "";
                $scope.registration_successful = true;
                return;
            }
            console.log(data.reason);
            $scope.error_status = data.reason;
        }, set_internal_error);
    };

    function set_internal_error () {
        $scope.error_status = "internal";
    }

    function set_bad_log_in () {
        $scope.password = "";
        $scope.error_status = "bad_login";
    }
});