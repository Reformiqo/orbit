import frappe
from frappe.tests import IntegrationTestCase

from orbit.api.planning import (
	get_milestones,
	get_modules,
	get_planning_overview,
	set_task_planning,
)
from orbit.tests.seed import ensure_default_workspace

TEST_PROJECT = "Orbit Planning Test Project"
OTHER_PROJECT = "Orbit Planning Other Project"


class TestOrbitPlanning(IntegrationTestCase):
	# Same reason as test_workflow_state: skip auto test-record generation, which
	# would follow Project's Link fields into doctypes missing on this site.
	doctype = None

	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		self._drop_projects()
		self.project = self._make_project(TEST_PROJECT, "PLANTST")
		self.other = self._make_project(OTHER_PROJECT, "PLANOTH")
		self.states = {
			s.state_name: s.name
			for s in frappe.get_all(
				"Orbit Workflow State",
				filters={"project": self.project},
				fields=["name", "state_name"],
			)
		}

	def tearDown(self) -> None:
		self._drop_projects()

	# --- helpers ---------------------------------------------------------

	def _drop_projects(self) -> None:
		for pname in (TEST_PROJECT, OTHER_PROJECT):
			name = frappe.db.get_value("Project", {"project_name": pname})
			if name:
				frappe.delete_doc(
					"Project", name, ignore_permissions=True, force=True, delete_permanently=True
				)

	def _make_project(self, title: str, identifier: str) -> str:
		p = frappe.new_doc("Project")
		p.project_name = title
		p.orbit_workspace = "default"
		p.orbit_identifier = identifier
		p.insert(ignore_permissions=True)
		return p.name

	def _module(self, project=None, **kw):
		doc = frappe.new_doc("Orbit Module")
		doc.project = project or self.project
		doc.module_name = kw.pop("module_name", "Billing")
		for k, v in kw.items():
			setattr(doc, k, v)
		doc.insert(ignore_permissions=True)
		return doc

	def _milestone(self, project=None, **kw):
		doc = frappe.new_doc("Orbit Milestone")
		doc.project = project or self.project
		doc.milestone_name = kw.pop("milestone_name", "Public beta")
		for k, v in kw.items():
			setattr(doc, k, v)
		doc.insert(ignore_permissions=True)
		return doc

	def _task(self, subject, state=None, project=None, **kw):
		t = frappe.new_doc("Task")
		t.subject = subject
		t.project = project or self.project
		if state:
			t.orbit_workflow_state = self.states[state]
		for k, v in kw.items():
			setattr(t, k, v)
		t.insert(ignore_permissions=True)
		return t

	# --- module / milestone validation -----------------------------------

	def test_module_name_is_unique_within_a_project(self):
		self._module(module_name="Billing")
		with self.assertRaises(frappe.ValidationError):
			self._module(module_name="Billing")

	def test_same_module_name_allowed_in_another_project(self):
		self._module(module_name="Billing")
		doc = self._module(project=self.other, module_name="Billing")
		self.assertEqual(doc.project, self.other)

	def test_module_name_is_trimmed(self):
		doc = self._module(module_name="  Onboarding  ")
		self.assertEqual(doc.module_name, "Onboarding")

	def test_target_date_before_start_date_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self._module(start_date="2026-05-10", target_date="2026-05-01")

	def test_position_autoincrements_within_project(self):
		a = self._module(module_name="A")
		b = self._module(module_name="B")
		self.assertEqual(a.position, 10)
		self.assertEqual(b.position, 20)

	def test_milestone_name_is_unique_within_a_project(self):
		self._milestone(milestone_name="v1.0")
		with self.assertRaises(frappe.ValidationError):
			self._milestone(milestone_name="v1.0")

	# --- task links -------------------------------------------------------

	def test_task_can_link_to_a_module_in_the_same_project(self):
		m = self._module()
		t = self._task("In billing", orbit_module=m.name)
		self.assertEqual(frappe.db.get_value("Task", t.name, "orbit_module"), m.name)

	def test_task_cannot_link_to_a_module_from_another_project(self):
		foreign = self._module(project=self.other, module_name="Foreign")
		with self.assertRaises(frappe.ValidationError):
			self._task("Wrong project", orbit_module=foreign.name)

	def test_task_cannot_link_to_a_milestone_from_another_project(self):
		foreign = self._milestone(project=self.other, milestone_name="Foreign MS")
		with self.assertRaises(frappe.ValidationError):
			self._task("Wrong project", orbit_milestone=foreign.name)

	def test_deleting_a_module_detaches_tasks_but_keeps_them(self):
		m = self._module()
		t = self._task("Survivor", orbit_module=m.name)
		frappe.delete_doc("Orbit Module", m.name, ignore_permissions=True)
		self.assertTrue(frappe.db.exists("Task", t.name))
		self.assertFalse(frappe.db.get_value("Task", t.name, "orbit_module"))

	def test_deleting_a_milestone_detaches_tasks_but_keeps_them(self):
		ms = self._milestone()
		t = self._task("Survivor", orbit_milestone=ms.name)
		frappe.delete_doc("Orbit Milestone", ms.name, ignore_permissions=True)
		self.assertTrue(frappe.db.exists("Task", t.name))
		self.assertFalse(frappe.db.get_value("Task", t.name, "orbit_milestone"))

	def test_deleting_the_project_cascades_modules_and_milestones(self):
		m = self._module()
		ms = self._milestone()
		frappe.delete_doc(
			"Project", self.project, ignore_permissions=True, force=True, delete_permanently=True
		)
		self.assertFalse(frappe.db.exists("Orbit Module", m.name))
		self.assertFalse(frappe.db.exists("Orbit Milestone", ms.name))

	# --- progress rollups --------------------------------------------------

	def test_module_progress_counts_by_status_group(self):
		m = self._module()
		self._task("done 1", state="Done", orbit_module=m.name)
		self._task("done 2", state="Done", orbit_module=m.name)
		self._task("doing", state="In Progress", orbit_module=m.name)
		self._task("todo", state="Todo", orbit_module=m.name)
		row = next(r for r in get_modules(self.project) if r["name"] == m.name)
		self.assertEqual(row["total"], 4)
		self.assertEqual(row["done"], 2)
		self.assertEqual(row["started"], 1)
		self.assertEqual(row["open"], 2)
		self.assertEqual(row["progress"], 50)

	def test_cancelled_tasks_are_excluded_from_the_percentage(self):
		m = self._module()
		self._task("done", state="Done", orbit_module=m.name)
		self._task("dropped", state="Cancelled", orbit_module=m.name)
		row = next(r for r in get_modules(self.project) if r["name"] == m.name)
		self.assertEqual(row["total"], 2)
		self.assertEqual(row["dropped"], 1)
		# 1 done out of 1 countable task, not 1 of 2.
		self.assertEqual(row["progress"], 100)

	def test_empty_module_reports_zero_progress_not_an_error(self):
		m = self._module()
		row = next(r for r in get_modules(self.project) if r["name"] == m.name)
		self.assertEqual(row["total"], 0)
		self.assertEqual(row["progress"], 0)

	def test_progress_ignores_tasks_from_other_projects(self):
		m = self._module()
		self._task("mine", state="Done", orbit_module=m.name)
		# A task in the other project can never point here (validation blocks it),
		# so the rollup must still report only this project's work.
		self._task("theirs", state="Done", project=self.other)
		row = next(r for r in get_modules(self.project) if r["name"] == m.name)
		self.assertEqual(row["total"], 1)

	def test_milestones_are_ordered_by_target_date(self):
		self._milestone(milestone_name="Later", target_date="2027-01-01")
		self._milestone(milestone_name="Sooner", target_date="2026-01-01")
		names = [r["milestone_name"] for r in get_milestones(self.project)]
		self.assertEqual(names, ["Sooner", "Later"])

	def test_planning_overview_returns_both_and_counts_unassigned(self):
		m = self._module()
		self._milestone()
		self._task("assigned", orbit_module=m.name)
		self._task("loose")
		data = get_planning_overview(self.project)
		self.assertEqual(len(data["modules"]), 1)
		self.assertEqual(len(data["milestones"]), 1)
		self.assertEqual(data["unassigned"]["module"], 1)
		self.assertEqual(data["unassigned"]["milestone"], 2)

	# --- bulk assignment ---------------------------------------------------

	def test_set_task_planning_assigns_in_bulk(self):
		m = self._module()
		ms = self._milestone()
		a = self._task("a")
		b = self._task("b")
		res = set_task_planning([a.name, b.name], module=m.name, milestone=ms.name)
		self.assertEqual(res["updated"], 2)
		self.assertEqual(frappe.db.get_value("Task", a.name, "orbit_module"), m.name)
		self.assertEqual(frappe.db.get_value("Task", b.name, "orbit_milestone"), ms.name)

	def test_set_task_planning_clears_with_empty_string(self):
		m = self._module()
		t = self._task("a", orbit_module=m.name)
		set_task_planning([t.name], module="")
		self.assertFalse(frappe.db.get_value("Task", t.name, "orbit_module"))

	def test_set_task_planning_leaves_omitted_fields_alone(self):
		m = self._module()
		ms = self._milestone()
		t = self._task("a", orbit_module=m.name, orbit_milestone=ms.name)
		set_task_planning([t.name], module="")
		# milestone was not passed, so it must survive
		self.assertEqual(frappe.db.get_value("Task", t.name, "orbit_milestone"), ms.name)

	def test_set_task_planning_rejects_a_cross_project_module(self):
		foreign = self._module(project=self.other, module_name="Foreign")
		t = self._task("a")
		with self.assertRaises(frappe.ValidationError):
			set_task_planning([t.name], module=foreign.name)

	def test_set_task_planning_accepts_a_json_string(self):
		m = self._module()
		t = self._task("a")
		res = set_task_planning(frappe.as_json([t.name]), module=m.name)
		self.assertEqual(res["updated"], 1)
