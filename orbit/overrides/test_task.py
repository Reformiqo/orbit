import frappe
from frappe.tests import IntegrationTestCase

from orbit.tests.seed import ensure_default_workspace


TEST_PROJECT = "Orbit Task Test Project"
TEST_SUBJECT_PREFIX = "Orbit Test Task "


class TestOrbitTaskExtensions(IntegrationTestCase):
	doctype = None

	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		self._clean_tasks()
		if not frappe.db.exists("Project", {"project_name": TEST_PROJECT}):
			p = frappe.new_doc("Project")
			p.project_name = TEST_PROJECT
			p.orbit_workspace = "default"
			p.orbit_identifier = "TTEST"
			p.insert(ignore_permissions=True)
		self.project = frappe.get_value("Project", {"project_name": TEST_PROJECT})

	def tearDown(self) -> None:
		self._clean_tasks()
		frappe.db.delete("Orbit Workflow State", {"project": self.project})
		frappe.db.delete("Project", {"project_name": TEST_PROJECT})

	def _clean_tasks(self) -> None:
		frappe.db.delete("Task", {"subject": ["like", f"{TEST_SUBJECT_PREFIX}%"]})

	def _make(self, **overrides):
		data = {
			"doctype": "Task",
			"subject": f"{TEST_SUBJECT_PREFIX}Alpha",
			"project": self.project,
		}
		data.update(overrides)
		return frappe.get_doc(data).insert(ignore_permissions=True)

	def test_display_id_auto_assigned(self) -> None:
		t = self._make()
		self.assertEqual(t.orbit_display_id, "TTEST-T1")

	def test_display_id_increments_per_project(self) -> None:
		self._make(subject=f"{TEST_SUBJECT_PREFIX}A")
		self._make(subject=f"{TEST_SUBJECT_PREFIX}B")
		third = self._make(subject=f"{TEST_SUBJECT_PREFIX}C")
		self.assertEqual(third.orbit_display_id, "TTEST-T3")

	def test_default_workflow_state_picked_on_create(self) -> None:
		# Project.after_insert seeded 5 states — "Todo" is default.
		t = self._make()
		self.assertIsNotNone(t.orbit_workflow_state)
		state_name = frappe.db.get_value(
			"Orbit Workflow State", t.orbit_workflow_state, "state_name"
		)
		self.assertEqual(state_name, "Todo")

	def test_explicit_workflow_state_respected(self) -> None:
		backlog = frappe.db.get_value(
			"Orbit Workflow State",
			{"project": self.project, "state_name": "Backlog"},
			"name",
		)
		t = self._make(
			subject=f"{TEST_SUBJECT_PREFIX}Explicit",
			orbit_workflow_state=backlog,
		)
		self.assertEqual(t.orbit_workflow_state, backlog)

	def test_imported_at_set_when_external_id_present(self) -> None:
		t = self._make(
			subject=f"{TEST_SUBJECT_PREFIX}Imported",
			orbit_external_id="zoho-task-1",
			orbit_external_source="zoho_projects",
		)
		self.assertIsNotNone(t.orbit_imported_at)
