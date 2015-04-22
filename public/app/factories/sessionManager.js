// Store and manage grading session info. The core of the application
angular.module("easyFeedback").
factory("SessionManager", function ($http, GradingSessionIdInterceptor) {
    var total_submitted = 0;
    var total_graded = 0;
    var current_index = 0;
    var students = [];
    var raw_session_obj;  // the raw response from the server
    return {
        fetch_current_session: function () {
            return $http.get("/get_status").then(function (res) {
                var data = res.data;
                if (data.error) {
                    return data;
                }
                raw_session_obj = data;
                GradingSessionIdInterceptor.set_grading_session_id(data.id);
                update_stored_session(data.student_list, data.last_index);
                return data;
            });
        },
        /**
          Advance the current student index and send feedback to the server
          @param {string} feedback - The student's feedback to send
          @param {number} grade - The student's grade
        */
        advance: function (feedback, grade, anchors) {
            var old_current_index = current_index;
            update_feedback(current_index, feedback, grade, anchors);
            maybe_advance_index();  // TODO: case of last student not submitted
            skip_until_valid();
            post_feedback(old_current_index, current_index);
        },
        /**
          Update feedback of the current student and send the updated feedback
          to the server
        */
        commit_feedback: function (feedback, grade, anchors) {
            update_feedback(current_index, feedback, grade, anchors);
            post_feedback(current_index, current_index);
        },
        /**
          Attempt to rename the by sending a request to the server. The locally
          stored session name will be changed if the server acknowledges the
          change
          @param {string} new_name - the name to rename the current session to
          @return {promise} resolves to a boolean indicating whether the change
            was successful
        */
        rename_session: function (new_name) {
            return $http.put("/rename_session", {
                new_name: new_name
            }).success(function () {
                raw_session_obj.name = new_name;
            });
        },
        get_current: function () {
            return students[current_index];
        },
        get_total: function () {
            return students.length;
        },
        get_total_graded: function () {
            return total_graded;
        },
        get_total_submitted: function () {
            return total_submitted;
        },
        get_session_id: function () {
            // sometimes this is called before any fetching
            return raw_session_obj ? raw_session_obj.id : "";
        },
        get_session_name: function () {
            return raw_session_obj.name;
        },
        // whether there is a session right now
        has_session: function () {
            return !!raw_session_obj;
        },
        get students () {
            return students;
        },
        get current_index () {
            return current_index;
        },
        set current_index (i) {
            current_index = i;
        },
        is_graded: is_graded
    };

    // Replace the currently stored grading session with a new one
    function update_stored_session (new_data, new_index) {
        students = new_data;
        current_index = 0;
        if (angular.isDefined(new_index) && new_index >= 0 &&
            new_index < new_data.length) {
            current_index = new_index;
        }
        total_graded = 0;
        total_submitted = 0;
        for (var i = 0; i < students.length; i++) {
            var current_student = students[i];
            if (current_student.not_submitted) {
                continue;
            }
            if (is_graded(current_student)) {
                total_graded++;
            }
            total_submitted++;
        }
        return skip_until_valid();
    }

    // update the feedback of a student locally
    function update_feedback (student_index, feedback, grade, anchors) {
        var target = students[student_index];
        if (!is_graded(target)) {
            // only increment when it was not graded before
            total_graded++;
        }
        target.feedback = feedback;
        target.grade = grade;
        target.anchors = anchors;
    }

    // send feedback to the server
    function post_feedback (student_index, new_index) {
        var to_send = students[student_index];
        $http.post("/new_feedback", {
            student: to_send,
            student_index: student_index,
            new_index: new_index,
        });  // TODO: add mechanism for request status
    }

    function maybe_advance_index () {
        if (current_index + 1 < students.length) {
            current_index++;
        }
    }

    function Skipped (student, reason) {
        return {
            student: student,
            reason: reason
        };
    }

    function skip_until_valid () {
        var skipped = [];
        while (current_index !== students.length - 1) {
            var current_student = students[current_index];
            var skip_obj = null;
            if (current_student.not_submitted) {
                skip_obj = Skipped(current_student, "no submission");
            } else if (is_graded(current_student)) {
                skip_obj = Skipped(current_student, "already graded");
            }
            if (skip_obj === null) {
                break;
            }
            skipped.push(skip_obj);
            maybe_advance_index();
        }
        return skipped;
    }

    function is_graded (student) {
        var grade = student.grade;
        return angular.isDefined(grade) && grade !== "";
    }
});