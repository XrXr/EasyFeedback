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
        scope.selection_changed = function (i, old) {
            var well = elem.children()[0];
            var inner = elem.children().children();
            if (inner[i]) {
                var old_selected =
                    angular.isDefined(old) ? old : scope.selected;
                inner[old_selected].classList.remove(selectClass);
                inner[i].classList.add(selectClass);
                scope.onChange()(i);
                scope.selected = i;

                var target = inner[i].getBoundingClientRect();
                var well_rect = well.getBoundingClientRect();
                // scroll the selection to the top if not visible
                if (target.y < well_rect.y ||
                    target.y > well_rect.y + well_rect.height) {
                    well.scrollBy(0, target.y - well_rect.y);
                }
            }
        };
        scope.$watch("selected", scope.selection_changed);
    }
});