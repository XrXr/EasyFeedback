angular.module("easyFeedback")
.controller("TemplatePicker", function ($scope, $timeout, TemplateManager,
                                        $http, $rootScope) {
    $scope.adding_template = false;
    $scope.loading = true;
    $scope.template_title_invalid = false;
    $scope.ns = {
        new_template_title : ""
    };

    $scope.on_editor = function (editor) {
        var session = editor.getSession();
        editor.setReadOnly(true);

        TemplateManager.fetch_all().then(show_templates);
        var current_selected = null;

        $scope.input_class = function () {
            return $scope.template_title_invalid ? "has-error" : "";
        };

        $scope.is_current = function (i) {
            return i === current_selected;
        };

        $scope.new_template = function () {
            session.setValue("");
            $scope.adding_template = true;
            $scope.template_title_invalid = false;
            $scope.$broadcast("mainEditorChange", "");
            editor.setReadOnly(false);
            editor.on("change", render_temporary_template);
        };

        $scope.cancel_adding = function () {
            if (current_selected !== null) {
                $scope.template_selected(current_selected);
            } else {
                session.setValue("");
            }
            $scope.adding_template = false;
            editor.setReadOnly(true);
            editor.off("change", render_temporary_template);
        };

        $scope.create_new_template = function () {
            var title = $scope.ns.new_template_title;
            var new_template = {
                title: title,
                text: session.getValue()
            };
            if (angular.isUndefined(title) || title.length === 0) {
                $scope.template_title_invalid = true;
                return;
            }
            $scope.loading = true;
            $scope.template_title_invalid = false;
            editor.setReadOnly(true);
            $http.put("/new_template", {
                new_template: new_template
            }).success(function () {
                $scope.templates.push(new_template);
                $scope.loading = false;
                $scope.cancel_adding();
            });
        };

        $scope.template_selected = function (i) {
            var raw_template = $scope.templates[i].text;
            current_selected = i;
            TemplateManager.update_current(raw_template);
            render_template(raw_template);
            $rootScope.$emit("reset_editor");
            inform_server(i);
        };

        function render_temporary_template () {
            var raw_template = session.getValue();
            $scope.$broadcast("mainEditorChange",
                              TemplateManager.parse(raw_template).text);
        }

        function render_template (raw_template) {
            var parsed = TemplateManager.parse(raw_template);
            session.setValue(raw_template);
            $scope.$broadcast("mainEditorChange", parsed.text);
        }

        function inform_server (i) {
            $http.put("/change_current_template", {new_current: i});
        }

        function show_templates (templates) {
            $scope.loading = false;
            $scope.templates = templates.list;
            current_selected = templates.current;
            render_template(templates.list[templates.current].text);
        }
    };
});