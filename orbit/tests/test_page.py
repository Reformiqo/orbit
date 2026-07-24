import frappe
from frappe.tests import IntegrationTestCase

from orbit.tests.seed import ensure_default_workspace


TEST_PROJECT_A = "Orbit Page Test Project A"
TEST_PROJECT_B = "Orbit Page Test Project B"


class TestOrbitPage(IntegrationTestCase):
	# Avoid Frappe's auto test-record generation chasing Link fields into
	# missing doctypes (e.g. Project → HD Ticket on this bench).
	doctype = None

	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		self._clean()
		if not frappe.db.exists("Project", {"project_name": TEST_PROJECT_A}):
			p = frappe.new_doc("Project")
			p.project_name = TEST_PROJECT_A
			p.orbit_workspace = "default"
			p.orbit_identifier = "PGA"
			p.insert(ignore_permissions=True)
		if not frappe.db.exists("Project", {"project_name": TEST_PROJECT_B}):
			p = frappe.new_doc("Project")
			p.project_name = TEST_PROJECT_B
			p.orbit_workspace = "default"
			p.orbit_identifier = "PGB"
			p.insert(ignore_permissions=True)
		self.project_a = frappe.db.get_value("Project", {"project_name": TEST_PROJECT_A})
		self.project_b = frappe.db.get_value("Project", {"project_name": TEST_PROJECT_B})

	def tearDown(self) -> None:
		self._clean()
		frappe.db.delete("Project", {"project_name": TEST_PROJECT_A})
		frappe.db.delete("Project", {"project_name": TEST_PROJECT_B})

	def _clean(self) -> None:
		for project_name in (TEST_PROJECT_A, TEST_PROJECT_B):
			proj = frappe.db.get_value("Project", {"project_name": project_name})
			if not proj:
				continue
			# Break parent chain before deleting to avoid FK issues.
			names = frappe.get_all(
				"Orbit Page",
				filters={"project": proj},
				pluck="name",
			)
			for n in names:
				frappe.db.set_value("Orbit Page", n, "parent_page", None)
			for n in names:
				frappe.delete_doc("Orbit Page", n, ignore_permissions=True, force=True)

	def _make(self, **overrides):
		data = {
			"doctype": "Orbit Page",
			"title": "Test Page",
			"project": self.project_a,
		}
		data.update(overrides)
		return frappe.get_doc(data).insert(ignore_permissions=True)

	def test_create_minimal(self) -> None:
		p = self._make()
		self.assertEqual(p.title, "Test Page")
		self.assertEqual(p.project, self.project_a)
		self.assertFalse(p.is_archived)
		self.assertIsNone(p.parent_page)

	def test_title_required(self) -> None:
		with self.assertRaises(frappe.exceptions.MandatoryError):
			self._make(title=None)

	def test_project_required(self) -> None:
		with self.assertRaises(frappe.exceptions.MandatoryError):
			self._make(project=None)

	def test_nested_page_same_project(self) -> None:
		parent = self._make(title="Parent")
		child = self._make(title="Child", parent_page=parent.name)
		self.assertEqual(child.parent_page, parent.name)
		self.assertEqual(child.project, parent.project)

	def test_parent_must_be_same_project(self) -> None:
		parent = self._make(title="Parent", project=self.project_a)
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(
				title="Wrong project child",
				project=self.project_b,
				parent_page=parent.name,
			)

	def test_cycle_prevention_self_parent(self) -> None:
		p = self._make(title="Cycle self")
		p.parent_page = p.name
		with self.assertRaises(frappe.exceptions.ValidationError):
			p.save(ignore_permissions=True)

	def test_cycle_prevention_chain(self) -> None:
		a = self._make(title="A")
		b = self._make(title="B", parent_page=a.name)
		c = self._make(title="C", parent_page=b.name)
		# Try to make A a child of C — completes a cycle A→B→C→A
		a.parent_page = c.name
		with self.assertRaises(frappe.exceptions.ValidationError):
			a.save(ignore_permissions=True)

	def test_archive(self) -> None:
		p = self._make(title="To archive")
		self.assertFalse(p.is_archived)
		p.is_archived = 1
		p.save(ignore_permissions=True)
		p.reload()
		self.assertTrue(p.is_archived)

	def test_imported_at_set_when_external_id_given(self) -> None:
		p = self._make(
			title="Imported",
			external_id="zoho-9001",
			external_source="zoho_projects",
		)
		self.assertIsNotNone(p.imported_at)

	def test_imported_at_not_set_without_external_id(self) -> None:
		p = self._make(title="Native")
		self.assertIsNone(p.imported_at)

	def test_content_stored_as_html(self) -> None:
		html = "<h2>Hello</h2><p>World with <strong>bold</strong>.</p>"
		p = self._make(title="With content", content=html)
		p.reload()
		self.assertEqual(p.content, html)
