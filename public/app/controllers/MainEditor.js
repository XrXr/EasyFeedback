angular.module("easyFeedback")
.controller("MainEditor",
            function ($scope, $timeout, $rootScope, Util, TemplateManager,
                      ngDialog, FeedbackStorage) {
    $scope.anchor_list = [];
    $scope.jump_to_next = function () {
        var editor = $scope.editor;
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
        editor.selection.setSelectionRange(
            Util.extract_numrange(target_line, selected.row, selected.column));
    };
    $scope.advance = function () {
        var total_anchor = $scope.total_anchor;
        var session = $scope.editor.getSession();
        var target_line = session.getLine(total_anchor.row);
        var total = Util.extract_num(target_line, total_anchor.column);
        $rootScope.$emit("students_skipped",
            FeedbackStorage.advance($scope.editor.getValue(), total));
        reset_editor();
    };
    var update_total_fn;
    $timeout(wait_for_editor, 0);
    // ngDialog.open({ template: "app/partials/templatePicker.html", className: "ngdialog-theme-default template-modal" });
    function wait_for_editor () {
        var editor = $scope.editor;
        var session = editor.getSession();
        var doc = session.getDocument();
        editor.on("change", function () {
            $rootScope.$emit("mainEditorChange", editor.getValue());
        });
        reset_editor();
        update_total_fn = function update_total () {
            $timeout(function () {
                var total = 0;
                var total_anchor = $scope.total_anchor;
                $scope.anchor_list.forEach(function (anchor) {
                    total += Util.extract_num(session.getLine(anchor.row),
                                              anchor.column);
                });
                var target_line = session.getLine(total_anchor.row);
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
    }

    function reset_editor (first) {
        var editor = $scope.editor;
        var session = editor.getSession();
        var doc = session.getDocument();
        var raw_template = 'Grade: $total/25\n\n- Q1: $entry/2\n- Q2: $entry/2\n- Q3: $entry/3\n- Q4: $entry/2\n- Q5: $entry/4\n- Q6: $entry/6\n- Q7: $entry/6\n\nGraded by Alan Wu';
        var parsed = TemplateManager.parse(raw_template);
        editor.off("change", update_total_fn);
        session.setValue(parsed.text);
        $scope.anchor_list = parsed.anchors.entry.map(function (e) {
            return doc.createAnchor(e[0], e[1]);
        });
        $scope.total_anchor =
            doc.createAnchor.apply(doc, parsed.anchors.total[0]);
        if (update_total_fn) {
            editor.on("change", update_total_fn);
        }
        return $scope.total_anchor;
    }
});