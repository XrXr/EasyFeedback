angular.module("easyFeedback")
.directive("onTab", function () {
    return {
        restrict: "AE",
        link: link
    };
    function link (scope, elem, attrs) {
        elem[0].addEventListener("keydown", function (ev) {
            if (ev.keyCode !== 9) {  // this is the keycode for tab
                return;
            }
            ev.preventDefault();
            ev.stopPropagation();
            scope.$eval(attrs.onTab)();
        }, true);
    }
});