angular.module("easyFeedback")
.directive("editor", function () {
    return {
        restrict: 'E',
        link: link
    };
    function link (scope, elem, attrs) {
        var editor = ace.edit(elem[0]);
        var session = editor.getSession();
        editor.setShowPrintMargin(false);
        session.setMode("ace/mode/markdown");
        session.setUseWrapMode(true);
        var callback = scope.$eval(attrs.callback);
        if (callback) {
            callback(editor);
        }
    }
});