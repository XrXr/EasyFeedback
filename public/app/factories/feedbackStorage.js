angular.module("easyFeedback")
.factory("FeedbackStorage", function ($http) {
    var current_index = 0;
    var students = [];
    return {
        update_data: function (new_data) {
            students = new_data;
            current_index = 0;
        },
        advance: function (feedback, grade) {
            var student = students[current_index];
            student.feedback = feedback;
            student.grade = grade;
            $http.post("/new_feedback", {
                student: student,
                index: current_index
            });  // TODO: add mechanism for request status
                 // TODO: send over index
            current_index++;
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