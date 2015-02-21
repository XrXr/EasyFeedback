angular.module("easyFeedback")
.controller("StatusPanel", function ($scope, ngDialog) {
    $scope.upload_modal = function () {
        ngDialog.open({
            template: "app/partials/worksheetUpload.html",
            controller: "WorksheetUpload"
        });
    };
})
.controller("WorksheetUpload", function ($scope) {
    $scope.text = "Drag and drop worksheet here or click to select file";
    $scope.upload_mode = false;
    $scope.current_status = "Uploading worksheet...";
    $scope.upload_percentage = (function () {
        var style = {width: "0%"};
        return function (new_val) {
            if (angular.isDefined(new_val)) {
                style.width = new_val + "%";
            }
            return style;
        };
    })();
    $scope.upload_percentage(80);
    $scope.file_dropped = function (files, _, rejected_files) {
        if (rejected_files.length > 0) {
            $scope.text = "Worksheet must be a csv file";
            return;
        }
        var upload = files[0];
        $scope.upload_mode = true;
    };
});