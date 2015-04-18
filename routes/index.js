var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var babyparse = require("babyparse");
var fs = require("fs");
var worksheet = require("../easyfeedback/worksheet");
var marked = require("marked");
var storage = require("../easyfeedback/storageMan");
var default_retrieve = storage.default_retrieve;
var default_commit = storage.default_commit;

var FEEDBACK_COLUMN = worksheet.FEEDBACK_COLUMN;
var GRADE_COLUMN = worksheet.GRADE_COLUMN;

router.post("/upload_worksheet", function(req, res) {
    var form = new multiparty.Form();
    form.on('error', function(err) {
        send_error(res, "Bad file");
    });
    form.on('file', function(name, val){
        val.name = val.originalFilename;
        val.type = val.headers['content-type'] || null;
        req.session.cookie.maxAge = 3600000 * 24;  // a day
        default_commit(req.session, {
            worksheet: val,
            last_index: 0
        }, function (err) {
            if (err) {
                return send_error(res, "Internal error");
            }
            end_request(res);
        });
    });
    form.parse(req);
});


router.get("/get_status", function (req, res) {
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, "Internal error");
        }
        if (!store.worksheet) {
            return send_error(res, "No worksheet uploaded");
        }
        if (store.student_list) {
            return res.json({
                student_list: store.student_list,
                last_index: store.last_index
            });
        }
        var tmp_file_path = store.worksheet.path;
        return fs.readFile(tmp_file_path, "utf-8", parse_csv);

        function parse_csv (err, data) {
            if (err) {
                return send_error(res, "Internal error");
            }
            var parsed = babyparse.parse(data, {skipEmptyLines: true});
            var csv = parsed.data;
            if (!worksheet.validate(csv) || parsed.errors.length > 0) {
                return send_error(res, "Bad worksheet");
            }
            csv.shift();   // the first line does not contain any info
            store.csv = csv;
            var submitted = /Submitted for grading/g;
            var student_list = csv.map(function (row, index) {
                var student = {
                    name: row[1],
                    // the first column always start with "Participant ", the rest
                    // is the student number
                    student_number: row[0].slice(12),
                    feedback: row[9],
                    grade: row[4]
                };
                if (row[3].search(submitted) === -1) {
                    student.not_submitted = true;
                    student.grade = 0;
                    store.csv[index][4] = 0;
                }
                return student;
            });
            store.student_list = student_list;
            fs.unlink(tmp_file_path);  // remove the temporary file
            default_commit(req.session, store, function (err) {
                if (err) {
                    return send_error(res, "Internal error");
                }
                res.json({student_list: student_list});
            });
        }
    });
});

// from StackOverflow 18082
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

router.put("/change_current_template", function (req, res) {
    // TODO: if (!req.session.templates)
    if (isNumber(req.body.new_current)) {
        default_retrieve(req.session, function (err, store) {
            if (err) {
                return send_error(res, "Internal error");
            }
            store.templates.current = Number(req.body.new_current);
            default_commit(req.session, store, function () {
                if (err) {
                    return send_error(res, "Internal error");
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
            return send_error(res, "Internal error");
        }
        store.templates.list.push(req.body.new_template);
        default_commit(req.session, store, function () {
            if (err) {
                return send_error(res, "Internal error");
            }
            end_request(res);
        });
    });
});

router.get("/get_current_template", function (req, res) {
    // TODO: these initialization should be moved after implementing login
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, "Internal error");
        }
        if (!store.templates) {
            store.templates = get_predefined_templates();
            return default_commit(req.session, store, function (err) {
                if (err) {
                    return send_error(res, "Internal error");
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
            return send_error(res, "Internal error");
        }
        res.json({templates: store.templates});
    });
});

router.post("/new_feedback", function (req, res) {
    var student = req.body.student;
    var index = req.body.student_index;
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, "Internal error");
        }
        if (!store.student_list) {
            return send_error(res, "Update without list");
        }
        if (!student) {
            res.status(400);
            return send_error(res, "Bad request");
        }
        //  TODO: add validation here
        store.last_index = req.body.new_index;
        store.student_list[index].feedback = student.feedback;
        store.student_list[index].grade = student.grade;
        store.student_list[index].anchors = student.anchors;
        store.csv[index][FEEDBACK_COLUMN] = student.feedback;
        store.csv[index][GRADE_COLUMN] = student.grade;
        default_commit(req.session, store, function (err) {
            if (err) {
                return send_error(res, "Internal error");
            }
            end_request(res);
        });
    });
});

router.get("/render_worksheet", function (req, res) {
    default_retrieve(req.session, function (err, store) {
        if (err) {
            return send_error(res, "Internal error");
        }
        var csv = store.csv;
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
});

/**
  Send a error message through a res object using JSON
*/
function send_error (res, message) {
    res.json({error: message});
}
/**
  End a request and send nothing
*/
function end_request (res) {
    res.type("text/plain").end();
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

module.exports = router;
