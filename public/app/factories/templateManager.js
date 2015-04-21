angular.module("easyFeedback")
.factory("TemplateManager", function ($http, $q) {
    var parsed_current = null;  // using null to indicate not yet fetched
    /**
     * Parse a raw template into normal Markdown
     * @param {string} raw_template - The template to parse. Different lines
     * are separated by \n
     * @return {Object} An object that has two properties, text, anchors that
     * contains the parsed text and positions for making the anchors. anchors
     * contain two properties total and entry.
     */
    // TODO: one total only, one line per entry, total and entry can't be on
    // the same line
    // this regex is for detecting a number or a number being inputted
    var num_input_pattern = /(\d+|\.\d+|\d+\.?\d+|\d+\.)?/.source;
    function parse (raw_template) {
        var str_array = raw_template.split("\n");
        var total_anchors = [];
        var entry_anchors = [];
        for (var i = 0; i < str_array.length; i++) {
            // re objects are created here since exec replies on their state
            var total_re = /\$total/g;
            var entry_re = /\$entry/g;
            var line = str_array[i];
            var match = total_re.exec(line);
            if (match) {
                total_anchors.push([i, match.index]);
                str_array[i] = str_array[i].replace(total_re, "");
            }
            match = entry_re.exec(line);
            if (match) {
                var guard = "";
                var anchor_info = [i, match.index];
                str_array[i] = str_array[i].replace(entry_re, "");
                guard = ["^",
                         XRegExp.escape(str_array[i].substr(0, match.index)),
                         num_input_pattern,
                         XRegExp.escape(str_array[i].substr(match.index)),
                         "$"].join("");
                // trading space for speed here. Each line can't be that long
                anchor_info.guard = new RegExp(guard);
                entry_anchors.push(anchor_info);
            }
        }
        return {
            raw: raw_template,
            text: str_array.join("\n"),
            anchors: {
                total: total_anchors,
                entry: entry_anchors,
            }
        };
    }
    /**
     * Return the current template in parsed form. Call to this function will
     * throw if the manager has not fetch the current template
     * @return {Object} An object that would be a return value of parse
     */
    function get_parsed_current () {
        if (!parsed_current) {
            throw Error("Current template not fetched/parsed");
        }
        return parsed_current;
    }
    /**
     * Fetch the current template
     * @return {Promise} A promise that resolves when the fetching has finished
     */
    function fetch_current () {
        return $http.get("/get_current_template").then(function (response) {
            parsed_current = parse(response.data.current_template);
            return parsed_current;
        });
    }
    /**
     * Fetch all the templates
     * @return {Promise} A promise that resolves with wtih an object that has
     * the structure:
     *   {
     *     current: number,
     *     list: [string]
     *   }
     */
    function fetch_all () {
        return $http.get("/user/all_templates").then(function (response) {
            return response.data.template_list;
        });
    }

    /*
      update the current template in use and inform the server about the change
      @param {string} raw_template - the new template
      @return {promise} the request promise for informing the server
    */
    function update_current (raw_template) {
        parsed_current = parse(raw_template);
        return $http.put("/change_current_template", {
            new_template: raw_template
        });
    }

    /*
      Inform the server about new prefered template
    */
    function update_prefered (prefered) {
        return $http.post("/user/new_prefered_template", {
            new_prefered: prefered
        });
    }

    function send_new_template_entry (template_entry) {
        return $http.post("/user/new_template_entry", {
            new_entry: template_entry
        });
    }

    return {
        parse: parse,
        get_parsed_current: get_parsed_current,
        fetch_current: fetch_current,
        fetch_all: fetch_all,
        update_current: update_current,
        update_prefered: update_prefered,
        send_new_template_entry: send_new_template_entry
    };
});