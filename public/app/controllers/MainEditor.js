angular.module("easyFeedback").
controller("MainEditor", function ($scope, $timeout, $rootScope, Util,
                                   TemplateManager, FeedbackStorage) {
    $scope.anchor_list = [];

    $scope.on_editor = function (editor) {
        var session = editor.getSession();
        var doc = session.getDocument();
        var Range = ace.require("ace/range").Range;

        editor.on("change", emit_change);
        $rootScope.$on("reset_editor", reset_editor);
        $rootScope.$on("replace_current_line", replace_current_line);
        $rootScope.$on("view_feedback", view_feedback);
        $rootScope.$on("focus_editor", focus_editor);
        $rootScope.$on("commit_feedback", commit_feedback);
        $rootScope.$on("commit_and_advance", commit_and_advance);
        // initialize the editor after fetching the current template
        // TODO: some notice about loading the template
        TemplateManager.fetch_current().then(initialize_editor);
        // make the hotkey mapping object
        $scope.hotkeys = {
            "Tab": jump_to_next_anchor,
            "ctrl+g": commit_and_advance
        };
        for (var i = 1; i < 10; i++) {
            var key = "ctrl+" + i;
            $scope.hotkeys[key] = get_common_feedback.bind(null, i - 1);
        }

        function initialize_editor () {
            editor.on("change", update_total);
            reset_editor();
            // the first reset doesn't fire the event with the value properly
            $timeout(emit_change, 0);
        }

        // match a line that doesn't start with '-' and end with '(-num)'
        var deduction = /^(?!\s*-\s*).*(?:\(-(\d+)\))$/;
        // TODO: protect from selecting entire anchor line(s) and deleting
        function update_total (delta) {
            $timeout(function () {
                // protect anchor lines
                delta = delta.data;
                var row_changed = delta.range.start.row;
                var changed_line = session.getLine(row_changed);
                $scope.anchor_list.forEach(function (anchor) {
                    if (anchor.ace_anchor.row === row_changed) {
                        if (!anchor.guard.test(changed_line) ||
                            (delta.action === "removeText" &&
                            changed_line === delta.text)) {
                            return no_update(function () {
                                session.getUndoManager().undo(true);
                            });
                        }
                    }

                });
                // update the total
                var total = 0;
                var total_anchor = $scope.total_anchor.ace_anchor;
                $scope.anchor_list.forEach(function (anchor) {
                    anchor = anchor.ace_anchor;
                    total += Util.extract_num(session.getLine(anchor.row),
                                              anchor.column);
                });
                var total_line = session.getLine(total_anchor.row);
                var total_lines = session.getLength();
                for (var i = 0; i < total_lines; i++) {
                    var line = session.getLine(i);
                    var match = deduction.exec(line);
                    if (match) {
                        // This will always work due to the regex
                        total -= Number(match[1]);
                    }
                }
                // negative grade doesn't make sense
                total = Math.max(0, total);
                var current_total_string = Util.
                    extract_num_string(total_line, total_anchor.column);
                if (total == Number(current_total_string) &&
                    current_total_string !== "") {
                    return;
                }

                no_update(function () {
                    session.replace(Util.extract_numrange(total_line,
                        total_anchor.row, total_anchor.column), String(total));
                    $timeout(function () {  // a hack to correct Ace undo
                        session.getUndoManager().$undoStack.pop();
                    }, 0);
                });
            }, 0);
        }

        // execute a function without triggering the update_total handler
        function no_update (fn) {
            editor.off("change", update_total);
            fn();
            editor.on("change", update_total);
        }

        function emit_change () {
            $rootScope.$emit("mainEditorChange", editor.getValue());
        }

        function extract_info () {
            var total = $scope.total_anchor.ace_anchor;
            var target_line = session.getLine(total.row);
            var total_grade = Util.extract_num(target_line, total.column);
            var feedback_text = editor.getValue();
            var anchors = deconstruct_anchors($scope.anchor_list,
                                              [$scope.total_anchor]);
            return {
                text: feedback_text,
                total_grade: total_grade,
                anchors: anchors
            };
        }

        function commit_and_advance () {
            var info = extract_info();
            FeedbackStorage.advance(info.text, info.total_grade, info.anchors);
            reset_editor();
        }

        function jump_to_next_anchor () {
            var anchor_list = $scope.anchor_list;
            var loc = editor.getCursorPosition();
            var row = loc.row;
            var column = loc.column;
            var selected = anchor_list[0];
            for (var i = 0; i < anchor_list.length; i++) {
                if (anchor_list[i].ace_anchor.row > row) {
                    selected = anchor_list[i];
                    break;
                }
            }
            selected = selected.ace_anchor;
            var target_line = editor.getSession().getLine(selected.row);
            editor.selection.setSelectionRange(Util.extract_numrange(
                target_line, selected.row, selected.column));
        }

        function reset_editor () {
            var parsed = TemplateManager.get_parsed_current();
            no_update(function () {
                session.setValue(parsed.text);
                var anchors = make_anchors(parsed.anchors, doc);
                $scope.anchor_list = anchors[0];
                $scope.total_anchor = anchors[1];
            });
            return $scope.total_anchor;
        }

        // this function along with the replace_current_line handler, implement
        // the hotkeys for inserting common feedback. This function sends an
        // event to the other editor that has the common feedback. The other
        // edtior then sends a replace_current_line event back, depending on
        // whether there is something in lineno.
        function get_common_feedback (lineno) {
            $rootScope.$broadcast("get_common_feedback", lineno);
        }

        function replace_current_line (_, new_line) {
            var row = editor.getCursorPosition().row;
            var illegal = $scope.anchor_list.some(function (a) {
                return a.ace_anchor.row === row;
            });
            if (illegal) {
                return;
            }
            doc.removeLines(row, row);
            doc.insertLines(row, [new_line]);
            var len = new_line.length;
            // put cursor at the end of the new line
            editor.selection.setSelectionRange(new Range(row, len, row, len));
        }

        function view_feedback (_, student) {
            var anchors = student.anchors;
            var feedback = student.feedback;
            if (!FeedbackStorage.is_graded(student) || !anchors) {
                return reset_editor();
            }
            no_update(function () {
                session.setValue(feedback);
                var real_anchors = make_anchors(anchors, doc);
                $scope.anchor_list = real_anchors[0];
                $scope.total_anchor = real_anchors[1];
            });
        }

        function focus_editor () {
            editor.focus();
            jump_to_next_anchor();
        }

        function commit_feedback () {
            var info = extract_info();
            FeedbackStorage.commit_feedback(info.text, info.total_grade,
                                            info.anchors);
        }
    };

    function make_anchors (anchors, doc) {
        var entries = anchors.entry.map(function (e) {
            return {
                ace_anchor: doc.createAnchor(e[0], e[1]),
                guard: e.guard
            };
        });
        var total;
        if (anchors.total[0]) {
            total = {
                ace_anchor: doc.createAnchor.apply(doc, anchors.total[0])
            };
        }
        return [entries, total];
    }

    function deconstruct_anchors (entry_anchors, total_anchors) {
        var entry = entry_anchors.map(deconstruct);
        var total = total_anchors.map(deconstruct);
        return {
            entry: entry,
            total: total
        };

        function deconstruct (a) {
            var info = [a.ace_anchor.row, a.ace_anchor.column];
            info.guard = a.guard;
            return info;
        }
    }
});