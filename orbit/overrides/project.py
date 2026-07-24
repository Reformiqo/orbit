"""Orbit hooks into Frappe's Project doctype via doc_events in hooks.py.

We do NOT fork Project — we extend it with custom fields (see
orbit.setup.custom_fields) and add validation here.
"""

import re

import frappe


IDENTIFIER_PATTERN = re.compile(r"^[A-Z][A-Z0-9]{1,9}$")


def validate(doc, method=None):
	"""Called on Project.validate via doc_events."""
	_normalize_identifier(doc)
	_validate_identifier_pattern(doc)
	_validate_identifier_unique_in_workspace(doc)
	_set_imported_at(doc)


def after_insert(doc, method=None):
	"""Seed default workflow states for new Orbit projects."""
	if not doc.get("orbit_workspace"):
		return
	from orbit.orbit.doctype.orbit_workflow_state.orbit_workflow_state import (
		seed_default_states_for_project,
	)

	seed_default_states_for_project(doc.name)


def _normalize_identifier(doc):
	if doc.get("orbit_identifier"):
		doc.orbit_identifier = doc.orbit_identifier.strip().upper()


def _validate_identifier_pattern(doc):
	identifier = doc.get("orbit_identifier")
	if not identifier:
		return
	if not IDENTIFIER_PATTERN.match(identifier):
		frappe.throw(
			"Identifier must be 2–10 characters, uppercase letters or digits, "
			"starting with a letter (e.g. ACME, PROJ1)."
		)


def _validate_identifier_unique_in_workspace(doc):
	identifier = doc.get("orbit_identifier")
	workspace = doc.get("orbit_workspace")
	if not identifier or not workspace:
		return
	conflict = frappe.db.exists(
		"Project",
		{
			"orbit_workspace": workspace,
			"orbit_identifier": identifier,
			"name": ["!=", doc.name or ""],
		},
	)
	if conflict:
		frappe.throw(
			f"Identifier '{identifier}' is already in use in this workspace "
			f"(Project {conflict})."
		)


def _set_imported_at(doc):
	if doc.get("orbit_external_id") and not doc.get("orbit_imported_at"):
		doc.orbit_imported_at = frappe.utils.now_datetime()


def on_trash(doc, method=None):
	"""Cascade-delete docs that link to the Project so the delete isn't
	blocked by Frappe's link-check (runs BEFORE check_if_doc_is_linked).

	Covers:

	- Orbit Workflow State / Orbit Task Type / Orbit Page (our own Link Task)
	- Task (Frappe's built-in) + its ToDos / Comments / Notification Logs

	Tests (and the SettingsTab UI) previously had to clean these in the
	client; centralising it here makes both paths reliable.
	"""
	project = doc.name

	# Orbit children — direct Link fields to Project.
	for doctype, field in (
		("Orbit Workflow State", "project"),
		("Orbit Page", "project"),
	):
		for name in frappe.get_all(doctype, filters={field: project}, pluck="name"):
			frappe.delete_doc(
				doctype, name, ignore_permissions=True, force=True, delete_permanently=True
			)

	# Tasks belong to Project via Task.project. Kill each Task's ToDos /
	# Comments / Notification Logs first, then the Task itself.
	tasks = frappe.get_all("Task", filters={"project": project}, pluck="name")
	for task_name in tasks:
		for linked_doctype, filters in (
			(
				"ToDo",
				{"reference_type": "Task", "reference_name": task_name},
			),
			(
				"Comment",
				{"reference_doctype": "Task", "reference_name": task_name},
			),
			(
				"Notification Log",
				{"document_type": "Task", "document_name": task_name},
			),
		):
			for n in frappe.get_all(linked_doctype, filters=filters, pluck="name"):
				frappe.delete_doc(
					linked_doctype,
					n,
					ignore_permissions=True,
					force=True,
					delete_permanently=True,
				)
		frappe.delete_doc(
			"Task", task_name, ignore_permissions=True, force=True, delete_permanently=True
		)
