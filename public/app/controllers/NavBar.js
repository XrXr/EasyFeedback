angular.module("easyFeedback").
controller("NavBar", function ($scope, ngDialog, LoginManager, $rootScope) {
    $scope.lm = LoginManager;
    $scope.template_picker = function () {
        var modal_template = LoginManager.get_logged_in_user() ?
                             "app/partials/templatePicker.html" :
                             "app/partials/templatePickerNotLoggedIn.html";
        ngDialog.open({
            template: modal_template,
            className: "ngdialog-theme-default template-modal",
            controller: "TemplatePicker"
        });
    };

    $scope.show_user_menu = function () {
        // see UserMenu controller
        $rootScope.$broadcast("show_user_menu");
    };

    $scope.login = function () {
        ngDialog.open({
            template: "app/partials/login.html",
            className: "ngdialog-theme-default login-modal",
            controller: "Login"
        });
    };
}).
controller("UserMenu", function ($scope, SessionManager, $http, $window,
                                 ngDialog, reload_page) {
    $scope.showing = false;
    $scope.manager = SessionManager;
    $scope.status = "read_only";
    var session_name = "";

    $scope.$on("show_user_menu", function () {
        if ($scope.status !== "loading") {
            $scope.status = "read_only";
            try {
                session_name = SessionManager.get_session_name();
            } catch(_) {}
        }
        $scope.showing = true;
    });

    $scope.edit_name = function () {
        $scope.status = "editing";
    };

    $scope.session_name = function (new_session_name) {
        if (angular.isDefined(new_session_name)) {
            session_name = new_session_name;
        }
        return session_name;
    };

    $scope.send_new_name = function (new_name) {
        $scope.status = "loading";
        // TODO: contact server
        SessionManager.rename_session(new_name).then(function () {
            $scope.status = "edit_success";
        }, function () {
            $scope.status = "edit_failed";
        });
    };

    $scope.log_out = function () {
        $http.post("/logout").then(reload_page, reload_page);
    };

    $scope.close = function () {
        $scope.showing = false;
    };

    $scope.$on("escape_pressed", function () {
        $scope.close();
        $scope.$apply();
    });

    $scope.grading_session_modal = function () {
        $scope.close();
        ngDialog.open({
            template: "app/partials/gradingSessionModal.html",
            className: "ngdialog-theme-default grading-session-modal",
            controller: "GradingSessionModal"
        });
    };
});