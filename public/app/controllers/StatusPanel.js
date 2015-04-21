angular.module("easyFeedback")
.controller("StatusPanel", function ($scope, ngDialog, SessionManager,
                                     $rootScope) {
    $scope.storage = SessionManager;
    $scope.skipped_students = [];

    $scope.upload_modal = function () {
        ngDialog.open({
            template: "app/partials/worksheetUpload.html",
            controller: "WorksheetUpload"
        }).closePromise.then(update_data);
    };

    $scope.render_worksheet_url = function () {
        var id = SessionManager.get_session_id();
        return "/render_worksheet" + (id ? "?id=" + id : "");
    };

    // TODO: add warning about imported csv don't have tab jumps
    $scope.view_feedback = function (student_index) {
        var student = SessionManager.students[student_index];
        SessionManager.current_index = student_index;
        $rootScope.$emit("view_feedback", student);
    };

    $scope.student_status = function (student) {
        if (student.not_submitted) {
            return "Not Submitted";
        }
        if (SessionManager.is_graded(student)) {
            return "Graded";
        }
        return "Needs Grading";
    };

    $scope.commit_feedback = emit_and_focus.bind(null, "commit_feedback");
    $scope.commit_and_advance = emit_and_focus.bind(null,
                                                    "commit_and_advance");
    $scope.reset_editor = emit_and_focus.bind(null, "reset_editor");

    function emit_and_focus (event_name) {
        $rootScope.$emit(event_name);
        $rootScope.$emit("focus_editor");
    }

    update_data();
    function update_data () {
        //  TODO: add loading spinner
        SessionManager.fetch_current_session().then(function(data) {
            $scope.error_message = "";
            if (data.error) {
                $scope.error_message = data.error;
                return;
            }
            $scope.view_feedback(SessionManager.current_index);
        }, function (res) {
            console.error(res);
            $scope.error_message = "An internal error has occoured";
        });
    }
})
.controller("WorksheetUpload", function ($scope, $upload,
                                         GradingSessionIdInterceptor) {
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
        }).success(function (res) {
            $scope.closeThisDialog();
        });  //TODO: handle error
        $scope.upload_mode = true;
    };
});