var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var typeis = require("typeis");

router.post('/upload_worksheet', function(req, res) {
    var form = new multiparty.Form();
    var file = {};
    form.on('file', function(name, val){
        val.name = val.originalFilename;
        val.type = val.headers['content-type'] || null;
        file = val;
        console.log(file);
    });
    form.on('error', function(err){
        res.render("error", {message: "jojo"});
    });
    form.on("close", function () {
        res.json({meow: file.name});
    });
    form.parse(req);
});
module.exports = router;
