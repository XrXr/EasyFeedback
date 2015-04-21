angular.module("easyFeedback")
.controller("NavBar", function ($scope, ngDialog, LoginManager) {
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

    $scope.login = function () {
        ngDialog.open({
            template: "app/partials/login.html",
            className: "ngdialog-theme-default login-modal",
            controller: "Login"
        });
    };
});