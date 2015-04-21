angular.module("easyFeedback").
controller("TemplatePicker", function ($scope, $timeout, TemplateManager,
                                       $rootScope, LoginManager, $window) {
    $scope.template_entries = [];
    $scope.adding_template = false;
    $scope.loading = true;
    $scope.template_title_invalid = false;
    $scope.ns = {
        new_template_title : ""
    };

    $scope.on_editor = function (editor) {
        var session = editor.getSession();
        var current_selected;
        var logged_in = !!LoginManager.get_logged_in_user();
        editor.setReadOnly(logged_in);

        if (logged_in) {
            TemplateManager.fetch_all().then(show_templates);
        } else {
            editor.on("change", render_temporary_template);
            $timeout(function () {
                render_template(TemplateManager.get_parsed_current().raw);
            }, 0);
        }

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
            TemplateManager.send_new_template_entry(new_template).
                success(finish_adding);

            function finish_adding () {
                $scope.template_entries.push(new_template);
                $scope.loading = false;
                $scope.cancel_adding();
            }
        };

        $scope.template_selected = function (i) {
            // nothing is selected on start up if the current template is not
            // in the list. see show_templates
            if (angular.isUndefined(current_selected)) {
                if (!$window.confirm(
                    "The template in use for this session is not in the " +
                    "list. Selecting a different template would discard the " +
                    "current template permanenetly. Are you sure?")) {
                    return;
                }
            }
            var raw_template = $scope.template_entries[i].text;
            current_selected = i;
            render_template(raw_template);
            // TODO: this is fire and forget, maybe add spinner?
            TemplateManager.update_current(raw_template);
            TemplateManager.update_prefered(i);
            $rootScope.$emit("reset_editor");
        };

        // only for non logged in users
        $scope.update_current_template = function () {
            TemplateManager.update_current(session.getValue());
            $rootScope.$emit("reset_editor");
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

        function show_templates (template_entries) {
            $scope.loading = false;
            $scope.template_entries = template_entries;
            var template_in_use = TemplateManager.get_parsed_current();

            var should_select;
            for (var i = 0; i < template_entries.length; i++) {
                if (template_entries[i].text === template_in_use.raw) {
                    should_select = i;
                    break;
                }
            }
            // the current template in use is in the list
            if (angular.isDefined(should_select)) {
                current_selected = should_select;
            }
            render_template(template_in_use.text);
        }
    };
});