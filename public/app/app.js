angular.module("easyFeedback", ["ngDialog", "angularFileUpload"]).
config(function ($httpProvider) {
    $httpProvider.interceptors.push("GradingSessionIdInterceptor");
}).
run(function (LoginManager) {
    LoginManager.synchronize_login_status();
});