angular.module("easyFeedback")
.factory("FeedbackStorage", function ($http) {
    var current_index = 0;
    var students = [];
    return {
        update_data: function (new_data, new_index) {
            students = new_data;
            current_index = 0;
            if (!angular.isUndefined(new_index) && new_index > 0 &&
                new_index < new_data.length) {
                current_index = new_index;
            }
        },
        advance: function (feedback, grade) {
            var student = students[current_index];
            student.feedback = feedback;
            student.grade = grade;
            $http.post("/new_feedback", {
                student: student,
                new_index: current_index
            });  // TODO: add mechanism for request status
                 // TODO: send over index
            if (current_index + 1 < students.length) {
                current_index++;
            }
        },
        get_current: function () {
            return students[current_index];
        },
        get_total: function () {
            return students.length;
        },
        get_index: function () {
            return current_index;
        }
    };
});