angular.module("easyFeedback")
.factory("Util", function () {
    var Range = ace.require("ace/range").Range;
    return {
        extract_numrange : extract_numrange,
        extract_num: extract_num
    };

    function extract_numrange (str, row, column) {
        return new Range(row, column - extract_numlength(str, column), row, column);
    }

    function extract_num (str, column) {
        return Number(
            str.slice(column - extract_numlength(str, column), column));
    }

    function extract_numlength (str, column) {
        var number_length = 0;
        for (var i = column - 1; i >= 0; i--) {
            if (Number.isNaN(Number.parseFloat(str[i]))) {
                break;
            }
            number_length++;
        }
        console.log(str, number_length, column)
        return number_length;
    }
});