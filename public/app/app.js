angular.module("easyFeedback", ["ngDialog", "angularFileUpload", "ngAnimate"]).
config(function ($httpProvider, $animateProvider) {
    $httpProvider.interceptors.push("GradingSessionIdInterceptor");
    $animateProvider.classNameFilter(/back-drop/);
}).
run(function (LoginManager, $rootScope) {
    LoginManager.synchronize_login_status();
    document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") {
            $rootScope.$broadcast("escape_pressed");
        }
    });
});