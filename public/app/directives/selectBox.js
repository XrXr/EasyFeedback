angular.module("easyFeedback")
.directive("selectBox", function () {
    return {
        restrict: "E",
        link: link,
        templateUrl: "app/partials/selectBox.html",
        scope: {onChange: "&", statusFn: "&", selected: "=", content: "&"}
    };
    function link (scope, elem, attrs) {
        scope.bindProperty = attrs.bindProperty;
        scope.elems = scope.content();
        var selectClass = attrs.selectClass;
        scope.optionClicked = function (i, old) {
            var inner = elem.children().children();
            if (inner[i]) {
                var old_selected =
                    angular.isDefined(old) ? old : scope.selected;
                inner[old_selected].classList.remove(selectClass);
                inner[i].classList.add(selectClass);
                scope.onChange()(i);
                scope.selected = i;
            }
        };
        scope.$watch("selected", scope.optionClicked);
        elem.ready(function () {
            scope.optionClicked(0);
        });
    }
});