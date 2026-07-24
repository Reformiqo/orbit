import re

import frappe
from frappe.model.document import Document


SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$|^[a-z0-9]$")


class OrbitWorkspace(Document):
	def before_validate(self) -> None:
		if self.slug:
			self.slug = self.slug.strip().lower()
		if self.name and isinstance(self.name, str):
			self.name = self.name.strip().lower()

	def validate(self) -> None:
		if not self.slug or not SLUG_PATTERN.match(self.slug):
			frappe.throw(
				"Slug must be 1–40 characters, lowercase letters, digits, or hyphens, "
				"and cannot start or end with a hyphen."
			)

	def before_insert(self) -> None:
		if self.external_id and not self.imported_at:
			self.imported_at = frappe.utils.now_datetime()
