angular.module("easyFeedback")
.controller("MainEditor", function ($scope, $timeout, $rootScope, Util,
                                    TemplateManager, FeedbackStorage) {
    $scope.anchor_list = [];
    var update_total_fn;
    $rootScope.$on("view_feedback", function (_, student) {
        console.log(student)
        var anchors = student.anchors;
        var feedback = student.feedback;
        if (!FeedbackStorage.is_graded(student) || !anchors) {
            return reset_editor();
        }
        var editor = $scope.editor;
        var session = editor.getSession();
        var doc = session.getDocument();
        editor.off("change", update_total_fn);
        session.setValue(feedback);
        var real_anchors = make_anchors(anchors, doc);
        $scope.anchor_list = real_anchors[0];
        $scope.total_anchor = real_anchors[1];
        editor.on("change", update_total_fn);
    });
    $scope.on_editor = function (editor) {
        var session = editor.getSession();
        var doc = session.getDocument();
        function emit_change () {
            $rootScope.$emit("mainEditorChange", editor.getValue());
        }
        editor.on("change", emit_change);
        reset_editor();
        // the first reset doesn't fire the event with the value properly
        $timeout(emit_change, 0);
        var deduction = /^(?!\s*-\s*).*(?:\(-(\d+)\))$/;
        // TODO: this is ugly as heck, pull it out
        update_total_fn = function update_total () {
            $timeout(function () {
                var total = 0;
                var total_anchor = $scope.total_anchor;
                $scope.anchor_list.forEach(function (anchor) {
                    total += Util.extract_num(session.getLine(anchor.row),
                                              anchor.column);
                });
                var target_line = session.getLine(total_anchor.row);
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
                if (Util.extract_num(target_line,
                                     total_anchor.column) === total) {
                    return;
                }
                editor.off("change", update_total);
                session.replace(Util.extract_numrange(target_line,
                    total_anchor.row, total_anchor.column), String(total));
                $timeout(function () {
                    session.getUndoManager().$undoStack.pop();
                }, 0);
                editor.on("change", update_total);
            }, 0);
        };
        editor.on("change", update_total_fn);

        $scope.advance = function () {
            var total = $scope.total_anchor;
            var target_line = session.getLine(total.row);
            var total_grade = Util.extract_num(target_line, total.column);
            var feedback_text = editor.getValue();
            var anchors = deconstruct_anchors($scope.anchor_list, [total]);
            $rootScope.$emit("students_skipped",
                FeedbackStorage.advance(feedback_text, total_grade, anchors));
            reset_editor();
        };

        $scope.jump_to_next = function () {
            var anchor_list = $scope.anchor_list;
            var loc = editor.getCursorPosition();
            var row = loc.row;
            var column = loc.column;
            var selected = anchor_list[0];
            var i;
            for (i = 0; i < anchor_list.length; i++) {
                if (anchor_list[i].row > row) {
                    selected = anchor_list[i];
                    break;
                }
            }
            var target_line = editor.getSession().getLine(selected.row);
            editor.selection.setSelectionRange(Util.extract_numrange(
                target_line, selected.row, selected.column));
        };

        function reset_editor (first) {
            var raw_template = 'Grade: $total/25\n\n- Q1: $entry/4\n- Q2: $entry/2\n- Q3: $entry/4\n- Q4: $entry/2\n- Q5: $entry/4\n- Q6: $entry/9\n\nGraded by Alan Wu';
            var parsed = TemplateManager.parse(raw_template);
            editor.off("change", update_total_fn);
            session.setValue(parsed.text);
            var anchors = make_anchors(parsed.anchors, doc);
            $scope.anchor_list = anchors[0];
            $scope.total_anchor = anchors[1];
            if (update_total_fn) {
                editor.on("change", update_total_fn);
            }
            return $scope.total_anchor;
        }
    };

    function make_anchors (anchors, doc) {
        var entries = anchors.entry.map(function (e) {
            return doc.createAnchor(e[0], e[1]);
        });
        var total = doc.createAnchor.apply(doc, anchors.total[0]);
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
            return [a.row, a.column];
        }
    }
});