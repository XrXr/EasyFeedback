angular.module("easyFeedback")
.controller("StatusPanel", function ($scope, ngDialog, $http,
                                     FeedbackStorage, $rootScope) {
    $scope.storage = FeedbackStorage;
    $scope.skipped_students = [];
    $scope.upload_modal = function () {
        ngDialog.open({
            template: "app/partials/worksheetUpload.html",
            controller: "WorksheetUpload"
        }).closePromise.then(update_data);
    };
    $scope.render_worksheet = function () {
        var link = document.createElement('a');
        link.href = '/render_worksheet';
        var e = document.createEvent('MouseEvents');
        e.initEvent('click', true, true);
        link.dispatchEvent(e);
    };
    // TODO: add warning about imported csv don't have tab jumps
    $scope.view_feedback = function (student_index) {
        var student = FeedbackStorage.students[student_index];
        FeedbackStorage.current_index = student_index;
        $rootScope.$emit("view_feedback", student);
    };
    $rootScope.$on("students_skipped", function (_, students) {
        $scope.skipped_students = students;
    });
    update_data();
    function update_data () {
        //  TODO: add loading spinner
        $http.get("/get_status").success(function(data, status) {
            console.log(data)
            $scope.error_message = "";
            if (data.error) {
                $scope.error_message = data.error;
                return;
            }
            $scope.skipped_students = FeedbackStorage.update_data(
                                        data.student_list, data.last_index);
        }).error(function (data) {
            console.log(data)
            $scope.error_message = "An internal error has occoured";
        });
    }
})
.controller("WorksheetUpload", function ($scope, $upload, $rootScope) {
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