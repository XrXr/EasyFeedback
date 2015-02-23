var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var babyparse = require("babyparse");
var fs = require("fs");
var worksheet = require("../easyfeedback/worksheet");

router.post("/upload_worksheet", function(req, res) {
    var form = new multiparty.Form();
    form.on('file', function(name, val){
        val.name = val.originalFilename;
        val.type = val.headers['content-type'] || null;
        req.session.worksheet = val;
        res.status(200).end();
    });
    form.on('error', function(err){
        res.json(error("Bad file"));
    });
    form.parse(req);
});

router.get("/get_status", function (req, res) {
    if (!req.session.worksheet) {
        return res.json(error("No worksheet uploaded"));
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
            return res.json(error("Internal error"));
        }
        var parsed = babyparse.parse(data, {skipEmptyLines: true});
        var csv = parsed.data;
        if (!worksheet.validate(csv) || parsed.errors.length > 0) {
            return res.json(error("Bad worksheet"));
        }
        var student_list = csv.map(function (row) {
            return {
                name: row[1],
                // the first column always start with "Participant ", the rest
                // is the student number
                student_number: row[0].slice(12)
            };
        });
        student_list.shift();  // the first line does not contain any info
        req.session.student_list = student_list;
        return res.json({student_list: student_list});
    }
});

/**
  Make an object to send to the client about a particular error
*/
function error (str) {
    return {
        error: str
    };
}

module.exports = router;
