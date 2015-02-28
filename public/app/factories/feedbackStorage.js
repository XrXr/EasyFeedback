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
        /**
          Advance the current student index and send feedback to the server
          @param {string} feedback - The student's feedback to send
          @param {number} grade - The student's grade
          @return {array} array of students skipped due to no submission
        */
        advance: function (feedback, grade) {
            var to_send = students[current_index];
            to_send.feedback = feedback;
            to_send.grade = grade;
            maybe_advance_index();
            var skipped = [];
            while (students[current_index].not_submitted &&
                   current_index !== students.length - 1) {
                skipped.push(students[current_index]);
                maybe_advance_index();
            }
            $http.post("/new_feedback", {
                student: to_send,
                new_index: current_index
            });  // TODO: add mechanism for request status
            return skipped;
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
    function maybe_advance_index () {
        if (current_index + 1 < students.length) {
            current_index++;
        }
    }
});