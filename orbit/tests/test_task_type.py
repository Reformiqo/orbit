import frappe
from frappe.tests import IntegrationTestCase

from orbit.tests.seed import ensure_default_workspace


TEST_WORKSPACE_SLUG = "test-tt-ws"


class TestOrbitTaskType(IntegrationTestCase):
	# Skip auto test-record generation — our setUp creates what we need.
	doctype = None

	@classmethod
	def setUpClass(cls) -> None:
		super().setUpClass()
		ensure_default_workspace()

	def setUp(self) -> None:
		if not frappe.db.exists("Orbit Workspace", TEST_WORKSPACE_SLUG):
			ws = frappe.new_doc("Orbit Workspace")
			ws.workspace_name = "Test TT Workspace"
			ws.slug = TEST_WORKSPACE_SLUG
			ws.insert(ignore_permissions=True)
		# Workspace after_insert hook seeds 5 default task types (T/B/S/Q/E).
		# Wipe them AFTER creation so tests start with an empty type list.
		self._clean()
		self.workspace = TEST_WORKSPACE_SLUG

	def tearDown(self) -> None:
		self._clean()
		frappe.db.delete("Orbit Workspace", {"slug": TEST_WORKSPACE_SLUG})

	def _clean(self) -> None:
		frappe.db.delete("Orbit Task Type", {"workspace": TEST_WORKSPACE_SLUG})

	def _make(self, **overrides):
		data = {
			"doctype": "Orbit Task Type",
			"workspace": self.workspace,
			"type_name": "Custom Type",
			"letter_prefix": "C",
			"color": "#123456",
			"position": 100,
		}
		data.update(overrides)
		return frappe.get_doc(data).insert(ignore_permissions=True)

	def test_create_minimal(self) -> None:
		t = self._make()
		self.assertEqual(t.type_name, "Custom Type")
		self.assertEqual(t.letter_prefix, "C")
		self.assertEqual(t.workspace, self.workspace)

	def test_letter_prefix_normalized_to_upper(self) -> None:
		t = self._make(letter_prefix="q", type_name="Query A")
		self.assertEqual(t.letter_prefix, "Q")

	def test_letter_prefix_must_be_single_letter(self) -> None:
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(letter_prefix="AB", type_name="Bad A")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(letter_prefix="1", type_name="Bad B")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(letter_prefix="", type_name="Bad C")

	def test_color_must_be_hex(self) -> None:
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(color="red", type_name="Bad Color")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(color="#12", type_name="Short Color")

	def test_type_name_unique_in_workspace(self) -> None:
		self._make(type_name="Duplicate", letter_prefix="D")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(type_name="Duplicate", letter_prefix="X")

	def test_letter_prefix_unique_in_workspace(self) -> None:
		self._make(type_name="Alpha", letter_prefix="A")
		with self.assertRaises(frappe.exceptions.ValidationError):
			self._make(type_name="Another", letter_prefix="A")

	def test_only_one_default_per_workspace(self) -> None:
		a = self._make(type_name="A", letter_prefix="A", is_default=1, position=1)
		b = self._make(type_name="B", letter_prefix="B", is_default=1, position=2)
		a.reload()
		self.assertFalse(a.is_default)
		self.assertTrue(b.is_default)

	def test_seed_creates_five_types(self) -> None:
		from orbit.orbit.doctype.orbit_task_type.orbit_task_type import (
			seed_default_types_for_workspace,
		)

		seed_default_types_for_workspace(self.workspace)
		types = frappe.get_all(
			"Orbit Task Type",
			filters={"workspace": self.workspace},
			fields=["type_name", "letter_prefix", "is_default"],
			order_by="position asc",
		)
		self.assertEqual(len(types), 5)
		names = [t.type_name for t in types]
		self.assertEqual(names, ["Task", "Bug", "Story", "Query", "Epic"])
		letters = [t.letter_prefix for t in types]
		self.assertEqual(letters, ["T", "B", "S", "Q", "E"])
		defaults = [t for t in types if t.is_default]
		self.assertEqual(len(defaults), 1)
		self.assertEqual(defaults[0].type_name, "Task")

	def test_seed_is_idempotent(self) -> None:
		from orbit.orbit.doctype.orbit_task_type.orbit_task_type import (
			seed_default_types_for_workspace,
		)

		seed_default_types_for_workspace(self.workspace)
		seed_default_types_for_workspace(self.workspace)
		count = frappe.db.count("Orbit Task Type", {"workspace": self.workspace})
		self.assertEqual(count, 5)

	def test_imported_at_set_when_external_id_present(self) -> None:
		t = self._make(
			type_name="Imported",
			letter_prefix="I",
			external_id="zoho-tt-1",
			external_source="zoho_projects",
		)
		self.assertIsNotNone(t.imported_at)
