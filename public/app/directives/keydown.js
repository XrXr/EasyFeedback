/*
  A directive for registering keyDown listeners on an element. The keydown
  attribute should be set to an object that is a mapping from key combination
  to callback. The keys in the mapping must be either a possible value of
  keydownevent.key, or that with "ctrl+" infront.
*/
angular.module("easyFeedback")
.directive("keydown", function () {
    return {
        priority: 3,
        restrict: "A",
        link: link
    };

    function link (scope, elem, attrs) {
        var callbacks = scope.$eval(attrs.keydown);
        elem[0].addEventListener("keydown", function (ev) {
            var key = ev.key;
            if (ev.ctrlKey) {
                key = "ctrl+" + key;
            }
            if (Object.hasOwnProperty.call(callbacks, key)) {
                callbacks[key]();
                ev.preventDefault();
                ev.stopPropagation();
            }
        }, true);
    }
});