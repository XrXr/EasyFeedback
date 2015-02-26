var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var babyparse = require("babyparse");
var fs = require("fs");
var worksheet = require("../easyfeedback/worksheet");
var marked = require("marked");

router.post("/upload_worksheet", function(req, res) {
    var form = new multiparty.Form();
    form.on('file', function(name, val){
        val.name = val.originalFilename;
        val.type = val.headers['content-type'] || null;
        req.session.worksheet = val;
        res.status(200).end();
    });
    form.on('error', function(err){
        send_error(res, "Bad file");
    });
    form.parse(req);
});


router.get("/get_status", function (req, res) {
    if (!req.session.worksheet) {
        return send_error(res, "No worksheet uploaded");
    }
    if (!req.session.marking_list) {
        return fs.readFile(req.session.worksheet.path,
            { encoding: "utf-8" }, parse_csv);
    }
    if (req.session.student_list) {
        return res.json({student_list: req.session.student_list});
    }

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
        var student_list = csv.map(function (row) {
            return {
                name: row[1],
                // the first column always start with "Participant ", the rest
                // is the student number
                student_number: row[0].slice(12)
            };
        });
        req.session.student_list = student_list;
        req.session.orignal_csv = csv;
        // TODO: delete the file
        return res.json({student_list: student_list});
    }
});

router.post("/new_feedback", function (req, res) {
    var student = req.body.student;
    var index = req.body.index;
    if (!req.session.student_list) {
        return send_error(res, "Update without list");
    }
    if (!student) {
        res.status(400);
        return send_error(res, "Bad request");
    }
    //  TODO: add error checking here
    req.session.student_list[index].feedback = student.feedback;
    req.session.student_list[index].grade = student.grade;
    req.session.orignal_csv[index][9] = student.feedback;
    req.session.orignal_csv[index][4] = student.grade;
    res.type('html').end();
});

router.get("/render_worksheet", function (req, res) {
    var csv = req.session.orignal_csv;
    if (!csv) {
        return send_error(res, "Render without list");
    }
    var rendered_list = csv.map(function (row) {
        var new_row = row.slice();
        new_row[9] = marked(new_row[9]);
        return new_row;
    });
    rendered_list.unshift(worksheet.first_row);  // add the first row
    res.attachment("worksheet.csv");
    res.send(babyparse.unparse(rendered_list));
});

/**
  Send a error message through a res object using JSON
*/
function send_error (res, message) {
    res.json({error: message});
}

module.exports = router;
