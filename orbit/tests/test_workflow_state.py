import frappe
from frappe.tests import IntegrationTestCase

from orbit.tests.seed import ensure_default_workspace


TEST_PROJECT = "Orbit WFS Test Project"


class TestOrbitWorkflowState(IntegrationTestCase):
	# Skip auto test-record generation — our setUp creates what we need.
	# Without this, Frappe follows Link fields and tries to generate test
	# records for Project → HD Ticket (missing on this site), failing setUpClass.
	doctype = None

	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		self._clean()
		if not frappe.db.exists("Project", {"project_name": TEST_PROJECT}):
			p = frappe.new_doc("Project")
			p.project_name = TEST_PROJECT
			p.orbit_workspace = "default"
			p.orbit_identifier = "WFSTEST"
			p.insert(ignore_permissions=True)
		self.project = frappe.get_value("Project", {"project_name": TEST_PROJECT})

	def tearDown(self) -> None:
		self._clean()
		frappe.db.delete("Project", {"project_name": TEST_PROJECT})

	def _clean(self) -> None:
		# Pre-created projects get 5 seeded states via after_insert; clean them.
		project_name = frappe.db.get_value("Project", {"project_name": TEST_PROJECT})
		if project_name:
			frappe.db.delete("Orbit Workflow State", {"project": project_name})

	def _make(self, **overrides):
		data = {
			"doctype": "Orbit Workflow State",
			"project": self.project,
			"state_name": "Custom State",
			"status_group": "Unstarted",
			"color": "#333333",
			"position": 100,
		}
		data.update(overrides)
		return frappe.get_doc(data).insert(ignore_permissions=True)

	def test_create_minimal(self) -> None:
		s = self._make()
		self.assertEqual(s.state_name, "Custom State")
		self.assertEqual(s.project, self.project)

	def test_only_one_default_per_project(self) -> None:
		a = self._make(state_name="A", is_default=1, position=1)
		b = self._make(state_name="B", is_default=1, position=2)
		a.reload()
		self.assertFalse(a.is_default)
		self.assertTrue(b.is_default)

	def test_default_seed_creates_five_states(self) -> None:
		from orbit.orbit.doctype.orbit_workflow_state.orbit_workflow_state import (
			seed_default_states_for_project,
		)

		seed_default_states_for_project(self.project)
		states = frappe.get_all(
			"Orbit Workflow State",
			filters={"project": self.project},
			fields=["state_name", "status_group", "is_default"],
			order_by="position asc",
		)
		self.assertEqual(len(states), 5)
		names = [s.state_name for s in states]
		self.assertEqual(names, ["Backlog", "Todo", "In Progress", "Done", "Cancelled"])
		defaults = [s for s in states if s.is_default]
		self.assertEqual(len(defaults), 1)
		self.assertEqual(defaults[0].state_name, "Todo")

	def test_seed_is_idempotent(self) -> None:
		from orbit.orbit.doctype.orbit_workflow_state.orbit_workflow_state import (
			seed_default_states_for_project,
		)

		seed_default_states_for_project(self.project)
		seed_default_states_for_project(self.project)
		count = frappe.db.count("Orbit Workflow State", {"project": self.project})
		self.assertEqual(count, 5)
