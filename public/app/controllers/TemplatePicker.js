angular.module("easyFeedback")
.controller("TemplatePicker", function ($scope, $timeout) {
    $scope.adding_template = false;
    $scope.on_editor = function (editor) {
        editor.setReadOnly(true);

        $scope.new_template = function () {
            $scope.adding_template = true;
            editor.setReadOnly(false);
        };

        $scope.cancel_adding = function () {
            $scope.adding_template = false;
            editor.setReadOnly(true);
        };
    };
});