import frappe
from frappe.model.document import Document


class OrbitPage(Document):
	def before_insert(self) -> None:
		if self.external_id and not self.imported_at:
			self.imported_at = frappe.utils.now_datetime()
