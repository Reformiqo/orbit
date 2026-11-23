"""A module is a cross-cycle bucket of tasks working toward a shared outcome.

Project-scoped, like Orbit Workflow State, because Frappe has no equivalent
concept and ERPNext's "Task Type" is global.
"""

import frappe
from frappe.model.document import Document

from orbit.orbit.doctype.orbit_milestone.orbit_milestone import (
	clear_task_links,
	validate_unique_name_in_project,
	validate_target_after_start,
)


class OrbitModule(Document):
	def validate(self) -> None:
		self.module_name = (self.module_name or "").strip()
		validate_unique_name_in_project(self, "module_name", "Module")
		validate_target_after_start(self)

	def before_insert(self) -> None:
		if self.external_id and not self.imported_at:
			self.imported_at = frappe.utils.now_datetime()
		if self.position is None or self.position == 0:
			self.position = next_position("Orbit Module", self.project)

	def on_trash(self) -> None:
		"""Detach tasks before Frappe's link check runs, so deleting a module
		never fails and never deletes the work inside it."""
		clear_task_links("orbit_module", self.name)


def next_position(doctype: str, project: str) -> int:
	highest = frappe.db.sql(
		"""select max(position) from `tab{0}` where project = %s""".format(doctype),
		(project,),
	)[0][0]
	return (highest or 0) + 10
