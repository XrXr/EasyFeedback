angular.module("easyFeedback")
.directive("onCtrlG", function () {
    return {
        restrict: "AE",
        link: link
    };
    function link (scope, elem, attrs) {
        elem[0].addEventListener("keydown", function (ev) {
            // 71 is the keycode for g
            if (ev.keyCode === 71 && ev.ctrlKey) {
                ev.preventDefault();
                ev.stopPropagation();
                scope.$eval(attrs.onCtrlG)();
            }
        }, true);
    }
});