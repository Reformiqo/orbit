import re

import frappe
from frappe.model.document import Document


LETTER_PATTERN = re.compile(r"^[A-Z]$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$")


class OrbitTaskType(Document):
	def before_validate(self) -> None:
		if self.letter_prefix:
			self.letter_prefix = self.letter_prefix.strip().upper()
		if self.color:
			self.color = self.color.strip()
		if self.type_name:
			self.type_name = self.type_name.strip()

	def validate(self) -> None:
		self._validate_letter_prefix()
		self._validate_color()
		self._validate_unique_type_name()
		self._validate_unique_letter_prefix()
		if self.is_default:
			self._ensure_single_default()

	def before_insert(self) -> None:
		if self.external_id and not self.imported_at:
			self.imported_at = frappe.utils.now_datetime()

	def _validate_letter_prefix(self) -> None:
		if not self.letter_prefix or not LETTER_PATTERN.match(self.letter_prefix):
			frappe.throw(
				"Letter Prefix must be a single uppercase letter A–Z."
			)

	def _validate_color(self) -> None:
		if not self.color or not HEX_COLOR_PATTERN.match(self.color):
			frappe.throw(
				"Color must be a hex value like #64748B."
			)

	def _validate_unique_type_name(self) -> None:
		if not self.workspace or not self.type_name:
			return
		conflict = frappe.db.exists(
			"Orbit Task Type",
			{
				"workspace": self.workspace,
				"type_name": self.type_name,
				"name": ["!=", self.name or ""],
			},
		)
		if conflict:
			frappe.throw(
				f"A task type named '{self.type_name}' already exists in this workspace."
			)

	def _validate_unique_letter_prefix(self) -> None:
		if not self.workspace or not self.letter_prefix:
			return
		conflict = frappe.db.exists(
			"Orbit Task Type",
			{
				"workspace": self.workspace,
				"letter_prefix": self.letter_prefix,
				"name": ["!=", self.name or ""],
			},
		)
		if conflict:
			frappe.throw(
				f"Letter prefix '{self.letter_prefix}' is already used by "
				f"another task type in this workspace."
			)

	def _ensure_single_default(self) -> None:
		others = frappe.get_all(
			"Orbit Task Type",
			filters={
				"workspace": self.workspace,
				"is_default": 1,
				"name": ["!=", self.name or ""],
			},
			pluck="name",
		)
		for other in others:
			frappe.db.set_value("Orbit Task Type", other, "is_default", 0)


DEFAULT_TYPES = [
	{"type_name": "Task", "letter_prefix": "T", "color": "#64748B", "icon": "check-square", "position": 10, "is_default": 1},
	{"type_name": "Bug", "letter_prefix": "B", "color": "#EF4444", "icon": "bug", "position": 20, "is_default": 0},
	{"type_name": "Story", "letter_prefix": "S", "color": "#10B981", "icon": "bookmark", "position": 30, "is_default": 0},
	{"type_name": "Query", "letter_prefix": "Q", "color": "#8B5CF6", "icon": "help-circle", "position": 40, "is_default": 0},
	{"type_name": "Epic", "letter_prefix": "E", "color": "#3B82F6", "icon": "zap", "position": 50, "is_default": 0},
]


def seed_default_types_for_workspace(workspace_name: str) -> None:
	"""Create the 5 default task types for a workspace. Idempotent."""
	if not workspace_name:
		return
	existing = frappe.get_all(
		"Orbit Task Type",
		filters={"workspace": workspace_name},
		pluck="name",
	)
	if existing:
		return
	for spec in DEFAULT_TYPES:
		doc = frappe.new_doc("Orbit Task Type")
		doc.workspace = workspace_name
		for k, v in spec.items():
			setattr(doc, k, v)
		doc.insert(ignore_permissions=True)
