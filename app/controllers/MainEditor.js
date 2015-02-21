angular.module("easyFeedback")
.controller("MainEditor", function ($scope, $timeout, $rootScope, Util, TemplateManager, ngDialog) {
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
    $timeout(wait_for_editor, 0);
    window.ngDialog = ngDialog;
    ngDialog.open({ template: "partials/templatePicker.html", class: "ngdialog-theme-default" });
    function wait_for_editor () {
        var editor = $scope.editor;
        var session = editor.getSession();
        var doc = session.getDocument();
        editor.on("change", function () {
            $rootScope.$emit("mainEditorChange", editor.getValue());
        });
        var raw_template = 'Grade: $total/25\n\n- Q1: $entry/5\n- Q2: $entry/5\n- Q3: $entry/5\n- Q4: $entry/5\n- Q5: $entry/5';
        var parsed = TemplateManager.parse(raw_template);
        session.setValue(parsed.text);
        $scope.anchor_list = parsed.anchors.entry.map(function (e) {
            return doc.createAnchor(e[0], e[1]);
        });
        var total_anchor = doc.createAnchor.apply(doc, parsed.anchors.total[0]);
        editor.on("change", function update_total () {
            $timeout(function () {
                var total = 0;
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
        });
    }
});