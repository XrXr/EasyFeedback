/*
  Module for loading EasyFeedback app config. The module expects to find
  EasyFeedbackConfig.json in the current working directory. If the file
  is not present, default configuration is used. The config file must be
  encoded in ascii.
*/
var fs = require("fs");
var CONFIG_FILE_NAME = "EasyFeedbackConfig.json";

var default_config = {
    "backing": "memory",
};

function readConfig (cb) {
    fs.readFile(CONFIG_FILE_NAME, "ascii", function (err, data) {
        if (err) {
            return cb(null, default_config);
        }
        var config = JSON.parse(data);
        if (!("backing" in config) ||
            (config.backing === "mongodb" && !("mongo_url" in config))) {
            return cb(Error("Bad config file"));
        }
        return cb(null, config);
    });
}

module.exports.readConfig = readConfig;