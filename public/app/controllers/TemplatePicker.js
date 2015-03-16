angular.module("easyFeedback")
.controller("TemplatePicker", function ($scope, $timeout) {
    $scope.on_editor = function (editor) {
        editor.setReadOnly(true);
    };
});