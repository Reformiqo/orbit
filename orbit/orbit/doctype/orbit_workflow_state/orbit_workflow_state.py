import frappe
from frappe.model.document import Document


class OrbitWorkflowState(Document):
	def validate(self) -> None:
		if self.is_default:
			self._ensure_single_default()

	def _ensure_single_default(self) -> None:
		others = frappe.get_all(
			"Orbit Workflow State",
			filters={
				"project": self.project,
				"is_default": 1,
				"name": ["!=", self.name or ""],
			},
			pluck="name",
		)
		for other in others:
			frappe.db.set_value("Orbit Workflow State", other, "is_default", 0)


DEFAULT_STATES = [
	{"state_name": "Backlog", "status_group": "Backlog", "color": "#94A3B8", "position": 10, "is_default": 0},
	{"state_name": "Todo", "status_group": "Unstarted", "color": "#64748B", "position": 20, "is_default": 1},
	{"state_name": "In Progress", "status_group": "Started", "color": "#F59E0B", "position": 30, "is_default": 0},
	{"state_name": "Done", "status_group": "Completed", "color": "#10B981", "position": 40, "is_default": 0},
	{"state_name": "Cancelled", "status_group": "Cancelled", "color": "#EF4444", "position": 50, "is_default": 0},
]


def seed_default_states_for_project(project_name: str) -> None:
	"""Create the 5 default workflow states for a project. Idempotent."""
	existing = frappe.get_all(
		"Orbit Workflow State",
		filters={"project": project_name},
		pluck="name",
	)
	if existing:
		return
	for spec in DEFAULT_STATES:
		doc = frappe.new_doc("Orbit Workflow State")
		doc.project = project_name
		for k, v in spec.items():
			setattr(doc, k, v)
		doc.insert(ignore_permissions=True)
