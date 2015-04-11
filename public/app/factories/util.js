angular.module("easyFeedback")
.factory("Util", function () {
    var Range = ace.require("ace/range").Range;

    /**
     * Create an Ace Range object that box a number sequence in str, ending at
     * `column`. If a number sequence is not present, the range would be empty
     * @param {number} row - The row of the range object
     * @param {number} column - The column of the range object, also the
     * supposed the index that is 1 after the last character in the number
     * string sequence
     * @return {Object} Ace range object
     */
    function extract_numrange (str, row, column) {
        return new Range(row, column - extract_num_string(str, column).length,
                         row, column);
    }

    /**
     * Attempt to extract a number from str, ending at `column`. If a number
     * sequence is not present, 0 is returned
     * @param {number} column - An index that is supposedly one after the last
     * character in the number string sequence
     * @return {number} The number found, or 0
     */
    function extract_num (str, column) {
        return Number(extract_num_string(str, column));
    }

    /**
     * Attempt to extract a number string from str, ending at `column`.
     * If a number sequence is not present, empty string is returned
     * @param {number} column - An index that is supposedly one after the last
     * character in the number string sequence
     * @return {string} The numeric string
     */
    var num_regex = /(\d+|\.\d+|\d+\.?\d+)$/;
    function extract_num_string (str, column) {
        str = str.slice(0, column);
        var result = num_regex.exec(str);
        if (result) {
            return result[1];  // first match group
        }
        return "";
    }

    return {
        extract_numrange : extract_numrange,
        extract_num: extract_num,
        extract_num_string: extract_num_string,
    };
});