/*
  The entire purpose of this controller is responding to the
  get_common_feedback event from the main editor
*/
angular.module("easyFeedback").
controller("NoteEditor", function ($scope, $rootScope) {
    $scope.on_editor = function (editor) {
        var session = editor.getSession();
        $scope.$on("get_common_feedback", function (_, lineno) {
            var line_content = session.getLine(lineno);
            if (line_content) {
                $rootScope.$emit("replace_current_line", line_content);
            }
        });
    };
});
