angular.module("easyFeedback")
.directive("editor", function () {
    return {
        restrict: 'E',
        link: link
    };
    function link (scope, elem, attrs) {
        var editor = ace.edit(elem[0]);
        editor.setShowPrintMargin(false);
        editor.getSession().setMode("ace/mode/markdown");
        var callback = scope.$eval(attrs.callback);
        if (callback) {
            callback(editor);
        }
    }
});