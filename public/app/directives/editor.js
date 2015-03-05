angular.module("easyFeedback")
.directive("editor", function () {
    return {
        restrict: 'E',
        link: link
    };
    function link (scope, elem, attrs) {
        var editor = ace.edit(elem[0]);
        scope.editor = editor;  // TODO: allow for a call back when loaded
        editor.setShowPrintMargin(false);
        editor.getSession().setMode("ace/mode/markdown");
    }
});