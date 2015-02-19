angular.module("easyFeedback")
.controller("MainEditor", function ($scope, $timeout, $rootScope, Util) {
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
    function wait_for_editor () {
        var editor = $scope.editor;
        var session = editor.getSession();
        var doc = session.getDocument();
        editor.on("change", function () {
            $rootScope.$emit("mainEditorChange", editor.getValue());
        });
        editor.setValue("This is a\nVery interesting\narticle\nabout my\nsad\nife", -1);
        var total_anchor = doc.createAnchor(0, 0);
        editor.on("change", function update_total () {
            $timeout(function () {
                var total = 0;
                $scope.anchor_list.forEach(function (anchor) {
                    total += Util.extract_num(session.getLine(anchor.row),
                                              anchor.column);
                });
                var target_line = session.getLine(total_anchor.row);
                editor.off("change", update_total);
                doc.replace(Util.extract_numrange(target_line, total_anchor.row, total_anchor.column), String(total));
                editor.on("change", update_total);
            }, 0);
        });
        $scope.anchor_list.push(doc.createAnchor(0, 4));
        $scope.anchor_list.push(doc.createAnchor(1, 4));
        $scope.anchor_list.push(doc.createAnchor(2, 5));
        $scope.anchor_list.push(doc.createAnchor(4, 3));
    }
});