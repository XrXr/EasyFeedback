angular.module("easyFeedback", ["ngDialog", "angularFileUpload"]).
config(function ($httpProvider) {
    $httpProvider.interceptors.push("GradingSessionIdInterceptor");
});