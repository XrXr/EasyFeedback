angular.module("easyFeedback")
.controller("NavBar", function ($scope, ngDialog) {
    $scope.template_picker = function () {
        ngDialog.open({
            template: "app/partials/templatePicker.html",
            className: "ngdialog-theme-default template-modal",
            controller: "TemplatePicker"
        });
    };

    $scope.login = function () {
        console.log("wtf");
        ngDialog.open({
            template: "app/partials/login.html",
            controller: "Login"
        });
    };
});