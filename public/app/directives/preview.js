angular.module("easyFeedback")
.directive("preview", function () {
    return {
        restrict: 'E',
        link: link
    };
    function link (scope, elem, attrs) {
        scope.$on("mainEditorChange", function (_, raw_markdown) {
            elem.html(marked(raw_markdown));
        });
    }
});
