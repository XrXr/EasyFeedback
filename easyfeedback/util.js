/*
  Get a predefined feedback template object
*/
function predefined_templates () {
    return [
        {title: "A4A",
         text: "Grade: $total/25\n\n- Q1: $entry/10\n- Q2: $entry/15\n"},
        {title: "AAS", text: "dummy"},
        {title: "A3S", text: "cats"}
    ];
}

/*
  Return true if a student is considered "graded"
*/
function is_graded (student) {
    var grade = student.grade;
    return typeof grade == "number";
}

module.exports = {
    predefined_templates: predefined_templates,
    is_graded: is_graded
};