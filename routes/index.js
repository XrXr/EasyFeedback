var express = require("express");
var router = express.Router();
var multiparty = require("multiparty");
var babyparse = require("babyparse");
var fs = require("fs");
var worksheet = require("../easyfeedback/worksheet");
var marked = require("marked");
var FEEDBACK_COLUMN = worksheet.FEEDBACK_COLUMN;
var GRADE_COLUMN = worksheet.GRADE_COLUMN;
var STATUS_COLUMN = worksheet.STATUS_COLUMN;
var is_object = require("is-object");
// below are set by newRouter()
var default_retrieve;
var default_commit;
var storage;
var is_login;

// requests from logged in user to these routes need special care. See
// validate_request
router.put("/change_current_template", validate_request);
router.get("/get_current_template", validate_request);
router.post("/new_feedback", validate_request);
router.get("/render_worksheet", validate_request);

router.post("/upload_worksheet", function(req, res) {
    var form = new multiparty.Form();
    form.on("error", function(err) {
        send_error(res, "Bad file");
    });
    form.on("file", function(name, val) {
        var tmp_file_path = val.path;
        return fs.readFile(tmp_file_path, "utf-8", parse_csv);

        function parse_csv (err, data) {
            if (err) {
                return send_error(res, err);
            }
            var parsed = babyparse.parse(data, {skipEmptyLines: true});
            var csv = parsed.data;
            if (!worksheet.validate(csv) || parsed.errors.length > 0) {
                return send_error(res, "Bad worksheet");
            }
            csv.shift();   // the first line does not contain any info
            var submitted = /Submitted for grading/g;
            var student_list = csv.map(function (row, row_num) {
                var student = {
                    name: row[1],
                    // the first column always start with "Participant ",
                    // the rest is the student number
                    student_number: row[0].slice(12),
                    feedback: row[FEEDBACK_COLUMN],
                    grade: row[GRADE_COLUMN]
                };
                if (row[STATUS_COLUMN].search(submitted) === -1) {
                    student.not_submitted = true;
                    student.grade = 0;
                    csv[row_num][GRADE_COLUMN] = 0;
                }
                return student;
            });
            fs.unlink(tmp_file_path);  // remove the temporary file
            save_grading_session({
                csv: csv,
                student_list: student_list,
                last_index: 0
            });
        }
    });
    form.parse(req);

    function save_grading_session (grading_session) {
        if (is_login(req.session)) {
            storage.user.create_new_session(req.session, grading_session,
                                            notify_client.bind(null, res));
            return;
        }
        storage.temp_commit(req.session, grading_session,
                            notify_client.bind(null, res));
    }
});

router.get("/get_status", function (req, res, next) {
    if (is_login(req.session) && !is_good_id(req.query.id)) {
        req.query.id = storage.user.get_active_grading_sess(req.session);
    }
    next();
}, retrieve_grading_session, function (req, res) {
    var sess = req.easy_feedback.grading_session;
    if (!is_in_progress(sess)) {
        return send_error(res, "No worksheet uploaded");
    }
    return res.json({
        id: sess.id,
        student_list: sess.student_list,
        last_index: sess.last_index
    });
});

router.put("/change_current_template", function (req, res) {
    // TODO: if (!req.session.templates)
    if (isNumber(req.body.new_current)) {
        default_retrieve(req.session, function (err, store) {
            if (err) {
                return send_error(res, err);
            }
            store.templates.current = Number(req.body.new_current);
            default_commit(req.session, store, function () {
                if (err) {
                    return send_error(res, err);
                }
                end_request(res);
            });
        });
    } else {
        send_error(req, "Bad request");
    }
});

router.put("/new_template", function (req, res) {
    // TODO: if (!req.session.templates)
    var new_template = req.body.new_template;
    if (!new_template || typeof(new_template) !== "object") {
        return send_error(res, "Bad request");
    }
    if (!new_template.hasOwnProperty("title") ||
        !new_template.hasOwnProperty("text")) {
        return send_error(res, "Invalid template");
    }
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, err);
        }
        store.templates.list.push(req.body.new_template);
        default_commit(req.session, store, function () {
            if (err) {
                return send_error(res, err);
            }
            end_request(res);
        });
    });
});

router.get("/get_current_template", function (req, res) {
    // TODO: these initialization should be moved after implementing login
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, err);
        }
        if (!store.templates) {
            store.templates = get_predefined_templates();
            return default_commit(req.session, store, function (err) {
                if (err) {
                    return send_error(res, err);
                }
                var templates = store.templates;
                res.json({
                    current_template: templates.list[templates.current].text
                });
            });
        }
        var templates = store.templates;
        res.json({
            current_template: templates.list[templates.current].text
        });
    });
});

router.get("/get_all_templates", function (req, res) {
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, err);
        }
        res.json({templates: store.templates});
    });
});

router.post("/new_feedback", retrieve_grading_session);
router.post("/new_feedback", function (req, res, next) {
    var student = req.body.student;
    var index = req.body.student_index;
    var grading_session_id = req.id;
    var sess = req.easy_feedback.grading_session;
    if (!sess.student_list) {
        return send_error(res, "Update without list");
    }
    if (!student) {
        return send_error(res.status(400), "Bad request");
    }
    //  TODO: add validation here
    sess.last_index = req.body.new_index;
    sess.student_list[index].feedback = student.feedback;
    sess.student_list[index].grade = student.grade;
    sess.student_list[index].anchors = student.anchors;
    sess.csv[index][FEEDBACK_COLUMN] = student.feedback;
    sess.csv[index][GRADE_COLUMN] = student.grade;
    next();
}, commit_grading_session, end_request_m);

router.get("/render_worksheet", retrieve_grading_session, function (req, res) {
    var sess = req.easy_feedback.grading_session;
    var csv = sess.csv;
    if (!csv) {
        return send_error(res, "Nothing to render");
    }
    var rendered_list = csv.map(function (row) {
        var new_row = row.slice();
        new_row[FEEDBACK_COLUMN] = marked(new_row[FEEDBACK_COLUMN]);
        return new_row;
    });
    rendered_list.unshift(worksheet.first_row);  // add the first row
    res.attachment("worksheet.csv");
    res.send(babyparse.unparse(rendered_list));
});

router.get("/dashboard", function (req, res, next) {
    if (!is_login(req.session)) {
        return res.send("Not logged in");
    }
    next();
});

router.post("/login", function (req, res) {
    if (is_login(req.session)) {
        return send_error(res, "Already logged in");
    }
    var username = req.body.username;
    var password = req.body.password;
    storage.login(req.session, username, password, function (err, success) {
        if (err) {
            return send_error(res, err);
        }
        if (!success) {
            return res.json({success: false, reason: "bad_login"});
        }
        storage.temp_retrieve(req.session, function (err, grading_session) {
            // transfer the current grading session to the user if it is in
            // progress i.e the user uploaded a worksheet
            if (is_in_progress(grading_session)) {
                storage.user.
                    create_new_session(req.session, grading_session,
                                       notify_client.bind(null, res));
                return;
            }
            return res.json({success: true});
        });
    });
});

router.post("/register", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    storage.create_user(username, password, function (err, data) {
        if (err) {
            if (err instanceof TypeError) {
                return send_error(res.status(400), "Bad request");
            }
            return send_error(res, err);
        }
        res.json(data);
    });
});

/*
  For logged in users, their request to some routes must contain a query string
  that has an id field. This middleware will send an error to the client if
  this requirement is not met, and calls the next middleware otherwise
*/
function validate_request (req, res, next) {
    if (is_login(req.session) && !is_good_id(req.query.id)) {
        return send_error(res, "Bad request");
    }
    next();
}

/*
  Fetch the active grading session into req.easy_feedback.grading_session. This
  will take care of fetching data from a source depending on the log in status
  of the user and error handling
*/
function retrieve_grading_session (req, res, next) {
    if (is_login(req.session)) {
        storage.user.session_retrieve(req.session, req.query.id,
                                      finish_retrieve);
    } else {
        storage.temp_retrieve(req.session, finish_retrieve);
    }

    function finish_retrieve (err, grading_session) {
        if (err) {
            return send_error(err);
        }
        req.easy_feedback = {
            grading_session: grading_session || {}
        };
        next();
    }
}

/*
  Commit the new grading session req.easy_feedback.grading_session to the
  backing storage. Similar to retrieve_grading_session
*/
function commit_grading_session (req, res, next) {
    var to_commit = req.easy_feedback.grading_session;
    if (is_login(req.session)) {
        storage.user.session_update(req.session, req.query.id, to_commit,
                                    finish_commit);
    } else {
        storage.temp_commit(req.session, to_commit, finish_commit);
    }

    function finish_commit (err, grading_session) {
        if (err) {
            return send_error(err);
        }
        next();
    }
}

/**
  Send a error message through a res object using JSON
*/
function send_error (res, message_or_error) {
    if (typeof message_or_error === "string") {
        return res.json({error: message_or_error});
    }
    console.error(message_or_error.stack);
    return send_error(res, "Internal error");
}

function notify_client (res, err) {
    if (err) {
        return send_error(res, err);
    }
    res.json({success: true});
}

// from StackOverflow 18082
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function is_good_id (id) {
    return id && typeof id === "string";
}

/**
  End a request and send nothing just end is not good because it sets res.type
  to xml and empty string is not valid xml
*/
function end_request (res) {
    res.type("text/plain").end();
}

// Middleware that ends a request
function end_request_m (_, res) {
    end_request(res);
}

/*
  Get a predefined feedback template object
*/
function get_predefined_templates () {
    return {
        current: 0,
        list: [
            {title: "A4A",
             text: "Grade: $total/25\n\n- Q1: $entry/10\n- Q2: $entry/15\n"},
            {title: "AAS", text: "dummy"},
            {title: "A3S", text: "cats"}
        ]
    };
}

function is_in_progress (grading_session) {
    var sess = grading_session;
    return is_object(sess) && Array.isArray(sess.csv) &&
           Array.isArray(sess.student_list) &&
           typeof sess.last_index === "number";
}

/*
  Module users call this function to get the route object. Since storageMan
  does some async operations on initialization and the router depends on that,
  we delay the export by asking the user to pass in a callback.
*/
function newRouter (cb) {
    require("../easyfeedback/storageMan")(function (err, storage_) {
        if (err) {
            throw err;
        }
        storage = storage_;
        default_commit = storage.default_commit;
        default_retrieve = storage.default_retrieve;
        is_login = storage.is_login;
        var user = require("./user");
        router.use("/user", user(storage));
        return cb(null, router);
    });
}

module.exports = newRouter;
