var FEEDBACK_COLUMN = 9;
var GRADE_COLUMN = 4;
var STATUS_COLUMN = 3;

var first_row =
    ["Identifier", "Full name", "Email address", "Status", "Grade",
     "Maximum Grade","Grade can be changed","Last modified (submission)",
     "Last modified (grade)","Feedback comments"];
/**
  Check if a parsed csv file is a valid worksheet
  @param {array} csv_arr - The parsed csv file
  @return {bool} true if the parsed file is a valid worksheet
 */
function validate (csv_arr) {
    if (csv_arr[0].join("") !== first_row.join("")) {
        return false;
    }
    for (var i = 0; i < csv_arr.length; i++) {
        if (csv_arr[i].length !== 10) {
            return false;
        }
    }
    return true;
}

module.exports = {
    validate: validate,
    first_row: first_row,
    FEEDBACK_COLUMN: FEEDBACK_COLUMN,
    GRADE_COLUMN: GRADE_COLUMN,
    STATUS_COLUMN: STATUS_COLUMN
};