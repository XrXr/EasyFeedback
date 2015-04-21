angular.module("easyFeedback", ["ngDialog", "angularFileUpload", "ngAnimate"]).
config(function ($httpProvider, $animateProvider) {
    $httpProvider.interceptors.push("GradingSessionIdInterceptor");
    $animateProvider.classNameFilter(/back-drop/);
}).
run(function (LoginManager) {
    LoginManager.synchronize_login_status();
});