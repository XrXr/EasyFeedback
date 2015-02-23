angular.module("easyFeedback")
.controller("StatusPanel", function ($scope, ngDialog, $http) {
    $scope.upload_modal = function () {
        ngDialog.open({
            template: "app/partials/worksheetUpload.html",
            controller: "WorksheetUpload"
        }).closePromise.then(update_data);
    };
    update_data();
    function update_data () {
        $http.get("/get_status").success(function(data, status) {
            console.log(data)
            $scope.error_message = "";
            if (data.error) {
                $scope.error_message = data.error;
                return;
            }
            $scope.student_list = data.student_list;
            // this callback will be called asynchronously
            // when the response is available
        }).error(function (data) {
            console.log(data)
            $scope.show_error = "An internal error has occoured";
        });
    }
})
.controller("WorksheetUpload", function ($scope, $upload) {
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
    $scope.file_dropped = function (files, _, rejected_files) {
        if (rejected_files.length > 0) {
            $scope.text = "Worksheet must be a csv file";
            return;
        }
        var upload = files[0];
        $upload.upload({
            url: "/upload_worksheet",
            file: upload
        }).progress(function (evt) {
            $scope.upload_percentage(100.0 * evt.loaded / evt.total);
        }).success(function () {
            $scope.closeThisDialog();
        });  //TODO: handle error
        $scope.upload_mode = true;
    };
});