// found on stackoverflow 15518772
angular.module("easyFeedback")
.directive('focusInput', function($timeout) {
    return function(scope, element, attr) {
        scope.$watch(attr.focusInput, function(value){
            if (value){
                $timeout(function () {
                    element[0].select();
                });
            }
        });

    };
});