"""Orbit hooks into Frappe's Task doctype via doc_events in hooks.py."""

import frappe


def validate(doc, method=None) -> None:
	_default_task_type(doc)
	_default_workflow_state(doc)
	_default_reporter(doc)
	_set_imported_at(doc)


def _default_reporter(doc) -> None:
	"""If reporter isn't set, default to the current session user.

	Covers the common case: the person creating the task is the reporter
	unless they explicitly pick someone else.
	"""
	if doc.get("orbit_reporter"):
		return
	user = frappe.session.user
	if user and user != "Guest":
		doc.orbit_reporter = user


def after_insert(doc, method=None) -> None:
	_assign_display_id(doc)


def _default_workflow_state(doc) -> None:
	"""If no workflow state is set, pick the project's default."""
	if doc.get("orbit_workflow_state") or not doc.get("project"):
		return
	default = frappe.db.get_value(
		"Orbit Workflow State",
		{"project": doc.project, "is_default": 1},
		"name",
	)
	if default:
		doc.orbit_workflow_state = default


def _default_task_type(doc) -> None:
	"""If no task type is set, pick the workspace's default type."""
	if doc.get("orbit_task_type") or not doc.get("project"):
		return
	workspace = frappe.db.get_value("Project", doc.project, "orbit_workspace")
	if not workspace:
		return
	default = frappe.db.get_value(
		"Orbit Task Type",
		{"workspace": workspace, "is_default": 1},
		"name",
	)
	if default:
		doc.orbit_task_type = default


def _set_imported_at(doc) -> None:
	if doc.get("orbit_external_id") and not doc.get("orbit_imported_at"):
		doc.orbit_imported_at = frappe.utils.now_datetime()


def _assign_display_id(doc) -> None:
	"""Set orbit_display_id like PROJ-T12 based on the project's identifier.

	Counter is scoped per project + letter prefix. Prefix letter comes from
	the task's Orbit Task Type. Falls back to 'T' for backward compat when
	no task_type is set (e.g. pre-existing tasks).
	"""
	if doc.get("orbit_display_id") or not doc.get("project"):
		return
	identifier = frappe.db.get_value("Project", doc.project, "orbit_identifier")
	if not identifier:
		return
	letter = _letter_for_task(doc)
	prefix = f"{identifier}-{letter}"

	# Find the highest existing counter for this project + letter.
	existing = frappe.get_all(
		"Task",
		filters={
			"project": doc.project,
			"orbit_display_id": ["like", f"{prefix}%"],
		},
		pluck="orbit_display_id",
	)
	highest = 0
	for did in existing:
		try:
			n = int(did[len(prefix):])
			highest = max(highest, n)
		except (ValueError, TypeError):
			continue
	counter = highest + 1

	display_id = f"{prefix}{counter}"
	frappe.db.set_value("Task", doc.name, "orbit_display_id", display_id)
	doc.orbit_display_id = display_id


def _letter_for_task(doc) -> str:
	"""Derive the ID-prefix letter from the task's Orbit Task Type.

	Falls back to 'T' for backward compatibility when no type is set.
	"""
	task_type = doc.get("orbit_task_type")
	if task_type:
		letter = frappe.db.get_value("Orbit Task Type", task_type, "letter_prefix")
		if letter:
			return letter
	return "T"
