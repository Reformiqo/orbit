import frappe
from frappe.tests import IntegrationTestCase

from orbit.tests.seed import ensure_default_workspace


TEST_PROJECT_PREFIX = "Orbit Test Project "


class TestOrbitProject(IntegrationTestCase):
	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		self._clean()

	def tearDown(self) -> None:
		self._clean()

	def _clean(self) -> None:
		frappe.db.delete(
			"Project",
			{"project_name": ["like", f"{TEST_PROJECT_PREFIX}%"]},
		)

	def _make(self, **overrides) -> "frappe.model.document.Document":
		data = {
			"doctype": "Project",
			"project_name": f"{TEST_PROJECT_PREFIX}Alpha",
			"orbit_workspace": "default",
			"orbit_identifier": "ALPHA",
		}
		data.update(overrides)
		return frappe.get_doc(data).insert(ignore_permissions=True)

	def test_minimal_create(self) -> None:
		p = self._make()
		self.assertEqual(p.orbit_identifier, "ALPHA")
		self.assertEqual(p.orbit_workspace, "default")

	def test_identifier_is_uppercased(self) -> None:
		p = self._make(
			project_name=f"{TEST_PROJECT_PREFIX}Two",
			orbit_identifier="acme",
		)
		self.assertEqual(p.orbit_identifier, "ACME")

	def test_identifier_rejects_invalid_patterns(self) -> None:
		bad = [
			("1BAD", "starts with digit"),
			("A", "too short"),
			("ABCDEFGHIJK", "too long (11 chars)"),
			("HAS-HYPHEN", "contains hyphen"),
			("has lower", "contains space and lowercase"),
		]
		for value, reason in bad:
			with self.subTest(reason=reason, value=value):
				with self.assertRaises(frappe.exceptions.ValidationError):
					self._make(
						project_name=f"{TEST_PROJECT_PREFIX}Bad {reason}",
						orbit_identifier=value,
					)

	def test_identifier_unique_within_workspace(self) -> None:
		self._make(
			project_name=f"{TEST_PROJECT_PREFIX}Conflict1",
			orbit_identifier="CONF",
		)
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(
				project_name=f"{TEST_PROJECT_PREFIX}Conflict2",
				orbit_identifier="CONF",
			)

	def test_identifier_unique_scope_is_workspace_not_global(self) -> None:
		"""Same identifier can exist in different workspaces."""
		# Create a second workspace for this test
		second = "orbit-test-second"
		if not frappe.db.exists("Orbit Workspace", second):
			ws = frappe.new_doc("Orbit Workspace")
			ws.workspace_name = "Second"
			ws.slug = second
			ws.insert(ignore_permissions=True)

		try:
			self._make(
				project_name=f"{TEST_PROJECT_PREFIX}Same1",
				orbit_identifier="SAME",
				orbit_workspace="default",
			)
			# Must NOT raise — different workspace
			self._make(
				project_name=f"{TEST_PROJECT_PREFIX}Same2",
				orbit_identifier="SAME",
				orbit_workspace=second,
			)
		finally:
			frappe.db.delete("Project", {"project_name": f"{TEST_PROJECT_PREFIX}Same2"})
			frappe.delete_doc("Orbit Workspace", second, ignore_permissions=True, force=True)

	def test_imported_at_set_when_external_id_given(self) -> None:
		p = self._make(
			project_name=f"{TEST_PROJECT_PREFIX}Imported",
			orbit_identifier="IMP",
			orbit_external_id="zoho-123",
			orbit_external_source="zoho_projects",
		)
		self.assertIsNotNone(p.orbit_imported_at)

	def test_imported_at_not_set_without_external_id(self) -> None:
		p = self._make(
			project_name=f"{TEST_PROJECT_PREFIX}Native",
			orbit_identifier="NAT",
		)
		self.assertIsNone(p.orbit_imported_at)
