angular.module("easyFeedback")
.directive("editor", function () {
    return {
        restrict: 'E',
        link: link
    };
    function link (scope, elem, attrs) {
        var editor = ace.edit(elem[0]);
        scope.editor = editor;
        editor.setShowPrintMargin(false);
        editor.getSession().setMode("ace/mode/markdown");
    }
});