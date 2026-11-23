"""A milestone is a goal-based checkpoint with an optional target date.

Shared validation helpers for both Orbit Milestone and Orbit Module live here
so the two stay consistent.
"""

import frappe
from frappe.model.document import Document
from frappe.utils import getdate


class OrbitMilestone(Document):
	def validate(self) -> None:
		self.milestone_name = (self.milestone_name or "").strip()
		validate_unique_name_in_project(self, "milestone_name", "Milestone")

	def before_insert(self) -> None:
		if self.external_id and not self.imported_at:
			self.imported_at = frappe.utils.now_datetime()
		if self.position is None or self.position == 0:
			from orbit.orbit.doctype.orbit_module.orbit_module import next_position

			self.position = next_position("Orbit Milestone", self.project)

	def on_trash(self) -> None:
		clear_task_links("orbit_milestone", self.name)


# --- shared helpers -------------------------------------------------------


def validate_unique_name_in_project(doc, fieldname: str, label: str) -> None:
	value = doc.get(fieldname)
	if not value:
		frappe.throw(f"{label} name is required.")
	if not doc.project:
		return
	conflict = frappe.db.exists(
		doc.doctype,
		{
			"project": doc.project,
			fieldname: value,
			"name": ["!=", doc.name or ""],
		},
	)
	if conflict:
		frappe.throw(f"A {label.lower()} called '{value}' already exists in this project.")


def validate_target_after_start(doc) -> None:
	if doc.get("start_date") and doc.get("target_date"):
		if getdate(doc.target_date) < getdate(doc.start_date):
			frappe.throw("Target date cannot be before the start date.")


def clear_task_links(fieldname: str, value: str) -> None:
	"""Null out a Task link field pointing at a doc about to be deleted.

	Runs from on_trash, which fires before Frappe's check_if_doc_is_linked, so
	the delete goes through without cascading into the tasks themselves.
	"""
	for name in frappe.get_all("Task", filters={fieldname: value}, pluck="name"):
		frappe.db.set_value("Task", name, fieldname, None, update_modified=False)
