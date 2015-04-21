var express = require("express");
var router = express.Router();
var user_router = express.Router();
var multiparty = require("multiparty");
var babyparse = require("babyparse");
var fs = require("fs");
var worksheet = require("../easyfeedback/worksheet");
var marked = require("marked");
var utils = require("../easyfeedback/utils");
var predefined_templates = utils.predefined_templates;

var FEEDBACK_COLUMN = worksheet.FEEDBACK_COLUMN;
var GRADE_COLUMN = worksheet.GRADE_COLUMN;
var STATUS_COLUMN = worksheet.STATUS_COLUMN;
var is_object = require("is-object");
// below are set by newRouter()
var storage;
var is_login;

router.post("/upload_worksheet", function (req, res, next) {
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

    // insert the correct template into the session
    function save_grading_session (grading_session) {
        if (is_login(req.session)) {
            req.easy_feedback = {  // so we can use in the next middleware
                _new_session: grading_session
            };
            return next();
        }
        grading_session.template = predefined_templates()[0].text;
        storage.temp_commit(req.session, grading_session,
                            notify_client.bind(null, res));
    }
}, retrieve_user_data, function (req, res, next) {
    var grading_session = req.easy_feedback._new_session;
    var user_data = req.easy_feedback.user_data;
    var prefered_template = user_data.prefered_template;
    var template_entry = user_data.template_list[prefered_template];
    grading_session.template = template_entry.text;
    storage.user.create_new_session(req.session, grading_session,
                                    set_active_session);

    function set_active_session (err, id) {
        if (err) {
            return send_error(res, err);
        }
        user_data.active_session = id;
        req.easy_feedback.new_session_id = id;
        next();
    }
}, commit_user_data, function (req, res) {
    res.json({success: true, id: req.easy_feedback.new_session_id});
});

router.get("/get_status", ensure_grading_session_id);
router.get("/get_status", retrieve_grading_session, function (req, res) {
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

router.get("/login_status", function (req, res) {
    var status = {
        logged_in: false
    };
    if (storage.is_login(req.session)) {
        status.logged_in = true;
        status.username = storage.get_username(req.session);
    }
    res.json(status);
});


router.put("/change_current_template", validate_request);
router.put("/change_current_template", function (req, res, next) {
    var new_template = req.body.new_template;
    if (!new_template || typeof new_template !== "string") {
        return send_error(res, "Bad request");
    }
    next();
}, retrieve_grading_session, function (req, res, next) {
    var new_template = req.body.new_template;
    req.easy_feedback.grading_session.template = new_template;
    next();
}, commit_grading_session, end_request_m);

router.get("/get_current_template", ensure_grading_session_id,
                                    retrieve_grading_session);
router.get("/get_current_template", function (req, res) {
    // a session not in progress is given a predefined template
    var sess = req.easy_feedback.grading_session;
    if (!is_in_progress(sess)) {
        return res.json({
            current_template: predefined_templates()[0].text
        });
    }
    res.json({
        current_template: sess.template
    });
});

router.post("/new_feedback", validate_request, retrieve_grading_session);
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

router.get("/render_worksheet", validate_request);
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
            console.log(grading_session.template)
            if (is_in_progress(grading_session)) {
                storage.user.create_new_session(req.session, grading_session,
                                                change_active_session);
                return;
            }
            return res.json({success: true});
        });
    });

    function change_active_session (err, new_session_id) {
        if (err) {
            return send_error(res, "Failed to create session");
        }
        storage.user.data_retrieve(req.session, function (err, user_data) {
            if (err) {
                return send_error(res, err);
            }
            user_data.active_session = new_session_id;
            res.json({success: true});
        });
    }
});

router.post("/register", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    storage.create_user(username, password, function (err, data) {
        if (err) {
            return send_error(res, err);
        }
        res.json(data);
    });
});

// routes in user_router are only for logged in users
user_router.use(authenticated_only);

user_router.post("/new_template_entry", function (req, res, next) {
    var new_entry = req.body.new_entry;
    if (!new_entry || typeof(new_entry) !== "object") {
        return send_error(res, "Bad request");
    }
    if (!new_entry.hasOwnProperty("title") ||
        !new_entry.hasOwnProperty("text")) {
        return send_error(res, "Invalid template");
    }
    req.easy_feedback = {
        new_entry: new_entry
    };
    next();
}, retrieve_user_data, function (req, res, next) {
    var user_data = req.easy_feedback.user_data;
    user_data.template_list.push(req.easy_feedback.new_entry);
    next();
}, commit_user_data, function (req, res) {
    end_request(res);
});

user_router.post("/new_prefered_template", function (req, res, next) {
    var new_prefered = req.body.new_prefered;
    if (!isNumber(new_prefered)) {
        return send_error(res, "Bad request");
    }
    next();
}, retrieve_user_data, function (req, _, next) {
    var user_data = req.easy_feedback.user_data;
    user_data.prefered_template = req.body.new_prefered;
    next();
}, commit_user_data, end_request_m);

user_router.get("/all_templates", retrieve_user_data, function (req, res) {
    var user_data = req.easy_feedback.user_data;
    res.json({
        template_list: user_data.template_list,
        prefered: user_data.prefered_template
    });
});

user_router.get("/dashboard", function (req, res, next) {
    req.easy_feedback = {
        user_data: "mojo"
    };
    next();
}, commit_user_data, function (req, _, next) {
    delete req.easy_feedback;
    next();
}, retrieve_user_data, function (req, res) {
    console.log(req.easy_feedback);
    res.send("you've reached your destination!");
});

router.use("/user", user_router);

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

    function finish_commit (err) {
        if (err) {
            return send_error(err);
        }
        next();
    }
}

/*
  Send an error message if user is not logged in
*/
function authenticated_only (req, res, next) {
    if (!is_login(req.session)) {
        return send_error(res, "Not logged in");
    }
    next();
}

// Fetch the data associated with the logged in user into
// req.easy_feedback.user_data
function retrieve_user_data (req, res, next) {
    storage.user.data_retrieve(req.session, function (err, data) {
        if (err) {
            return send_error(res, err);
        }
        if (!req.easy_feedback) {
            req.easy_feedback = {};
        }
        req.easy_feedback.user_data = data;
        next();
    });
}

// if a valid id is in req.query.id is present, or user is not logged in,
// call next middleware, else retrieve the active session id for the logged in
// user and put that in req.query.id.
function ensure_grading_session_id (req, res, next) {
    if (is_login(req.session) && !is_good_id(req.query.id)) {
        return retrieve_user_data(req, res, function () {
            req.query.id = req.easy_feedback.user_data.active_session;
            next();
        });
    }
    next();
}

/*
  Commit the data in req.easy_feedback.user_data into persistent storage
*/
function commit_user_data (req, res, next) {
    // letting this throw when easy_feedback doesn't exist. It would be an
    // internal error in that case
    var to_send = req.easy_feedback.user_data;
    storage.user.data_commit(req.session, to_send, function (err, status) {
        if (err) {
            return send_error(res, err);
        }
        next();
    });
}

/**
  Send a error message through a res object using JSON
*/
function send_error (res, message_or_error) {
    if (typeof message_or_error === "string") {
        return res.json({error: message_or_error});
    }
    console.error(message_or_error.stack);
    return send_error(res.status(500), "Internal error");
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
        is_login = storage.is_login;
        var user = require("./user");
        router.use("/user", user(storage));
        return cb(null, router);
    });
}

module.exports = newRouter;
