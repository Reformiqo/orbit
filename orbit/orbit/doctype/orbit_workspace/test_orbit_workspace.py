import frappe
from frappe.tests import IntegrationTestCase


class TestOrbitWorkspace(IntegrationTestCase):
	def setUp(self) -> None:
		frappe.db.delete("Orbit Workspace", {"slug": ["like", "test-%"]})

	def tearDown(self) -> None:
		frappe.db.delete("Orbit Workspace", {"slug": ["like", "test-%"]})

	def _make(self, **overrides) -> "frappe.model.document.Document":
		data = {
			"doctype": "Orbit Workspace",
			"workspace_name": "Test Workspace",
			"slug": "test-basic",
		}
		data.update(overrides)
		return frappe.get_doc(data).insert()

	def test_create_minimal(self) -> None:
		ws = self._make()
		self.assertEqual(ws.name, "test-basic")
		self.assertEqual(ws.workspace_name, "Test Workspace")

	def test_slug_is_lowercased_on_save(self) -> None:
		ws = self._make(slug="Test-MixedCase")
		self.assertEqual(ws.slug, "test-mixedcase")
		self.assertEqual(ws.name, "test-mixedcase")

	def test_slug_must_be_url_safe(self) -> None:
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(slug="has spaces")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(slug="-leading-hyphen")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(slug="trailing-hyphen-")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(slug="WithUpperBeforeNormalize!")

	def test_slug_is_unique(self) -> None:
		self._make(slug="test-dup")
		with self.assertRaises(frappe.exceptions.DuplicateEntryError):
			self._make(slug="test-dup")

	def test_optional_fields(self) -> None:
		ws = self._make(
			slug="test-full",
			icon="🚀",
			description="A test workspace",
		)
		self.assertEqual(ws.icon, "🚀")
		self.assertEqual(ws.description, "A test workspace")

	def test_imported_at_set_when_external_id_given(self) -> None:
		ws = self._make(
			slug="test-imported",
			external_id="zoho-123",
			external_source="zoho_projects",
			external_url="https://projects.zoho.in/foo",
		)
		self.assertIsNotNone(ws.imported_at)
		self.assertEqual(ws.external_source, "zoho_projects")

	def test_imported_at_not_set_without_external_id(self) -> None:
		ws = self._make(slug="test-native")
		self.assertIsNone(ws.imported_at)
