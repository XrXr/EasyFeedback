angular.module("easyFeedback")
.controller("Login", function ($scope, $http) {
    $scope.login_error = "";
    $scope.registration_successful = false;

    $scope.login = function () {
        $http.post("/login", {
            username: $scope.username,
            password: $scope.password,
        }).success(function (data) {
            var success = data.success;
            if (typeof success !== "boolean") {
                return set_internal_error();
            }
            if (success) {
                return $scope.closeThisDialog(true);
            }
            return set_bad_log_in();
        }).error(set_internal_error);
    };

    $scope.register = function () {
        $http.post("/register", {
            username: $scope.username,
            password: $scope.password,
        }).success(function (data) {
            var success = data.success;
            if (typeof success !== "boolean") {
                return set_internal_error();
            }
            if (success) {
                $scope.error_status = "";
                $scope.registration_successful = true;
                return;
            }
            if (typeof data.reason !== "string") {
                return set_internal_error();
            }
            console.log(data.reason);
            $scope.error_status = data.reason;
        }).error(set_internal_error);
    };

    function set_internal_error () {
        $scope.error_status = "internal";
    }

    function set_bad_log_in () {
        $scope.password = "";
        $scope.error_status = "bad_login";
    }
});