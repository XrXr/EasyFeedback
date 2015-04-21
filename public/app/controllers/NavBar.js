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
controller("UserMenu", function ($scope) {
    $scope.showing = false;
    $scope.status = "read_only";
    var session_name = "";
    $scope.$on("show_user_menu", function () {
        if ($scope.status !== "loading") {
            $scope.status = "read_only";
        }
        // get current session name here
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
    $scope.send_new_name = function () {
        $scope.status = "loading";
        // TODO: contact server
        setTimeout(function() {
            $scope.status="done";
            $scope.$apply();
        }, 1000);
    };
    $scope.close = function () {
        $scope.showing = false;
    };
    $scope.close_on_escape = {
        "Escape" : $scope.close
    };
});