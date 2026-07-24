"""Custom fields Orbit adds to existing Frappe/ERPNext doctypes.

Idempotent — safe to call on install, migrate, and in tests.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


TASK_CUSTOM_FIELDS = {
	"Task": [
		{
			"fieldname": "orbit_section_break",
			"fieldtype": "Section Break",
			"label": "Orbit",
			"collapsible": 1,
			"insert_after": "subject",
		},
		{
			"fieldname": "orbit_workflow_state",
			"fieldtype": "Link",
			"options": "Orbit Workflow State",
			"label": "Workflow State",
			"insert_after": "orbit_section_break",
		},
		{
			"fieldname": "orbit_task_type",
			"fieldtype": "Link",
			"options": "Orbit Task Type",
			"label": "Task Type",
			"description": "Task subtype (Task/Bug/Story/Query/Epic) from this workspace's types.",
			"insert_after": "orbit_workflow_state",
		},
		{
			"fieldname": "orbit_display_id",
			"fieldtype": "Data",
			"label": "Display ID",
			"description": "Human-friendly task ID like PROJ-T12. Auto-generated.",
			"read_only": 1,
			"length": 30,
			"insert_after": "orbit_task_type",
		},
		{
			"fieldname": "orbit_reporter",
			"fieldtype": "Link",
			"options": "User",
			"label": "Reporter",
			"description": "Who raised this task. Separate from assignee.",
			"insert_after": "orbit_display_id",
		},
		{
			"fieldname": "orbit_column_break_1",
			"fieldtype": "Column Break",
			"insert_after": "orbit_reporter",
		},
		{
			"fieldname": "orbit_external_id",
			"fieldtype": "Data",
			"label": "External ID",
			"insert_after": "orbit_column_break_1",
		},
		{
			"fieldname": "orbit_external_source",
			"fieldtype": "Select",
			"options": "\nzoho_projects\njira\nlinear\ncsv",
			"label": "External Source",
			"insert_after": "orbit_external_id",
		},
		{
			"fieldname": "orbit_external_url",
			"fieldtype": "Data",
			"label": "External URL",
			"insert_after": "orbit_external_source",
		},
		{
			"fieldname": "orbit_imported_at",
			"fieldtype": "Datetime",
			"label": "Imported At",
			"read_only": 1,
			"insert_after": "orbit_external_url",
		},
		{
			"fieldname": "orbit_labels",
			"fieldtype": "Small Text",
			"label": "Labels",
			"description": "Comma-separated label names attached to this task.",
			"insert_after": "orbit_imported_at",
		},
		{
			"fieldname": "orbit_parent_task",
			"fieldtype": "Link",
			"options": "Task",
			"label": "Parent Task",
			"insert_after": "orbit_labels",
		},
		{
			"fieldname": "orbit_blocked_by",
			"fieldtype": "Small Text",
			"label": "Blocked By",
			"description": "Comma-separated Task names that must close before this one.",
			"insert_after": "orbit_parent_task",
		},
	],
}


PROJECT_CUSTOM_FIELDS = {
	"Project": [
		{
			"fieldname": "orbit_section_break",
			"fieldtype": "Section Break",
			"label": "Orbit",
			"collapsible": 1,
			"insert_after": "project_name",
		},
		{
			"fieldname": "orbit_workspace",
			"fieldtype": "Link",
			"options": "Orbit Workspace",
			"label": "Workspace",
			"insert_after": "orbit_section_break",
		},
		{
			"fieldname": "orbit_identifier",
			"fieldtype": "Data",
			"label": "Identifier",
			"description": (
				"Short prefix for task IDs, e.g. ACME. Uppercase letters and digits, "
				"2–10 characters, starting with a letter."
			),
			"length": 10,
			"insert_after": "orbit_workspace",
		},
		{
			"fieldname": "orbit_column_break_1",
			"fieldtype": "Column Break",
			"insert_after": "orbit_identifier",
		},
		{
			"fieldname": "orbit_external_id",
			"fieldtype": "Data",
			"label": "External ID",
			"insert_after": "orbit_column_break_1",
		},
		{
			"fieldname": "orbit_external_source",
			"fieldtype": "Select",
			"options": "\nzoho_projects\njira\nlinear\ncsv",
			"label": "External Source",
			"insert_after": "orbit_external_id",
		},
		{
			"fieldname": "orbit_external_url",
			"fieldtype": "Data",
			"label": "External URL",
			"insert_after": "orbit_external_source",
		},
		{
			"fieldname": "orbit_imported_at",
			"fieldtype": "Datetime",
			"label": "Imported At",
			"read_only": 1,
			"insert_after": "orbit_external_url",
		},
	],
}


def ensure_custom_fields() -> None:
	"""Apply all Orbit custom fields. Called from after_install and after_migrate."""
	create_custom_fields(PROJECT_CUSTOM_FIELDS, update=True)
	create_custom_fields(TASK_CUSTOM_FIELDS, update=True)
