angular.module("easyFeedback")
.factory("TemplateManager", function () {
    return {
        parse : parse
    };
    /**
     * Parse a raw template into normal Markdown
     * @param {string} raw_template - The template to parse. Different lines
     * are separated by \n
     * @return {Object} An object that has two properties, text, anchors that
     * contains the parsed text and positions for making the anchors. anchors
     * contain two properties total and entry.
     */
    function parse (raw_template) {
        var str_array = raw_template.split("\n");
        var i;
        var total_anchors = [];
        var entry_anchors = [];
        for (i = 0; i < str_array.length; i++) {
            // re objects are created here since exec replies on their state
            var total_re = /\$total/g;
            var entry_re = /\$entry/g;
            var line = str_array[i];
            var match;
            while ((match = total_re.exec(line)) !== null) {
                total_anchors.push([i, match.index]);
            }
            while ((match = entry_re.exec(line)) !== null) {
                entry_anchors.push([i, match.index]);
            }
            str_array[i] = str_array[i].replace(total_re, "");
            str_array[i] = str_array[i].replace(entry_re, "");
        }
        return {
            text: str_array.join("\n"),
            anchors: {
                total: total_anchors,
                entry: entry_anchors,
            }
        };
    }
});