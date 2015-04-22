angular.module("easyFeedback")
.controller("GradingSessionModal", function ($scope, $http, SessionManager,
                                             GradingSessionIdInterceptor,
                                             reload_page) {
    $scope.loading = false;
    $scope.loading_failed = false;
    $scope.info_list = [];


    $scope.$on("ngDialog.opened", function () {
        $http.get("/user/all_session_info").success(function (data) {
            $scope.info_list = data.info;
            $scope.name_query = "";
            $scope.loading = false;
        }, function (res) {
            console.error(res);
            $scope.loading_failed = true;
        });
    });

    $scope.graded_percentage = function (info) {
        return Math.round(info.graded / info.total * 100) + "%";
    };

    $scope.not_submitted_percentage = function (info) {
        return Math.round((info.total - info.submitted) / info.total * 100) +
               "%";
    };

    $scope.not_submitted_style = function (info) {
        return {
            width: $scope.not_submitted_percentage(info)
        };
    };

    $scope.change_session = function (info) {
        $http.put("/user/active_session_id", {
            new_session_id: info.id
        }).then(reload_page, reload_page);
    };

    $scope.new_session = function () {
        $http.put("/user/active_session_id").then(reload_page, reload_page);
    };

    $scope.graded_style = function (info) {
        return {
            width: $scope.graded_percentage(info)
        };
    };
});
