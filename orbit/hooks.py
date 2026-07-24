app_name = "orbit"
app_title = "Orbit"
app_publisher = "erpera"
app_description = "Modern project management for Frappe"
app_email = "ino@erpera.io"
app_license = "mit"
app_icon_url = "/assets/orbit/images/logo.svg"
app_icon_title = "Orbit"
app_icon_route = "/orbit"

# Apps
# ------------------

# Orbit extends ERPNext's Project and Task doctypes (module "Projects") with
# custom fields, so ERPNext must be installed first.
required_apps = ["erpnext"]

add_to_apps_screen = [
	{
		"name": "orbit",
		"logo": "/assets/orbit/images/logo.svg",
		"title": "Orbit",
		"route": "/orbit",
	}
]

# Website routes
# --------------
# Send /orbit/* to the SPA entry (orbit/www/orbit.html). This enables deep links.
website_route_rules = [
	{"from_route": "/orbit/<path:app_path>", "to_route": "orbit"},
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/orbit/css/orbit.css"
# app_include_js = "/assets/orbit/js/orbit.js"

# include js, css files in header of web template
# web_include_css = "/assets/orbit/css/orbit.css"
# web_include_js = "/assets/orbit/js/orbit.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "orbit/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "orbit/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "orbit.utils.jinja_methods",
# 	"filters": "orbit.utils.jinja_filters"
# }

# Installation
# ------------

after_install = "orbit.setup.custom_fields.ensure_custom_fields"

after_migrate = ["orbit.setup.custom_fields.ensure_custom_fields"]

# Guard CRM's global Comment on_update hook: it crashes when the Comment is
# on a non-CRM doctype (e.g. an Orbit Task). Patches once per worker.
before_request = ["orbit.overrides.crm_comment_guard.apply"]

# Uninstallation
# ------------

# before_uninstall = "orbit.uninstall.before_uninstall"
# after_uninstall = "orbit.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "orbit.utils.before_app_install"
# after_app_install = "orbit.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "orbit.utils.before_app_uninstall"
# after_app_uninstall = "orbit.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "orbit.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Project": {
		"validate": "orbit.overrides.project.validate",
		"after_insert": "orbit.overrides.project.after_insert",
		"on_trash": "orbit.overrides.project.on_trash",
	},
	"Task": {
		"validate": "orbit.overrides.task.validate",
		"after_insert": [
			"orbit.overrides.task.after_insert",
			"orbit.notifications.on_task_after_insert",
		],
		"on_update": "orbit.notifications.on_task_update",
	},
	"Comment": {
		"on_update": "orbit.notifications.on_comment_update",
	},
	"Orbit Page": {
		"validate": "orbit.overrides.page.validate",
	},
	"Orbit Workspace": {
		"after_insert": "orbit.overrides.workspace.after_insert",
	},
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"orbit.tasks.all"
# 	],
# 	"daily": [
# 		"orbit.tasks.daily"
# 	],
# 	"hourly": [
# 		"orbit.tasks.hourly"
# 	],
# 	"weekly": [
# 		"orbit.tasks.weekly"
# 	],
# 	"monthly": [
# 		"orbit.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "orbit.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "orbit.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "orbit.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "orbit.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["orbit.utils.before_request"]
# after_request = ["orbit.utils.after_request"]

# Job Events
# ----------
# before_job = ["orbit.utils.before_job"]
# after_job = ["orbit.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"orbit.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

