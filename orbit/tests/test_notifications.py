"""Tests for orbit.notifications.

Verifies the doc_event hooks fan out Notification Log rows correctly.
"""

import frappe
from frappe.tests.utils import FrappeTestCase


PREFIX = "PW notif "
TEST_USERS = ("notif-alice@example.com", "notif-bob@example.com")


def _cleanup() -> None:
	# Delete by recipient — simpler and more robust than matching on subject text.
	rows = frappe.get_all(
		"Notification Log",
		filters={"for_user": ["in", TEST_USERS]},
		pluck="name",
	)
	for n in rows:
		frappe.delete_doc("Notification Log", n, force=True, ignore_permissions=True)
	frappe.db.commit()


def _ensure_user(email: str, full_name: str) -> str:
	if frappe.db.exists("User", email):
		return email
	u = frappe.new_doc("User")
	u.email = email
	u.first_name = full_name
	u.send_welcome_email = 0
	u.insert(ignore_permissions=True)
	return email


def _ensure_workspace() -> str:
	from orbit.tests.seed import ensure_default_workspace

	return ensure_default_workspace()


def _ensure_project() -> str:
	from orbit.orbit.doctype.orbit_workflow_state.orbit_workflow_state import (
		seed_default_states_for_project,
	)

	ws = _ensure_workspace()
	name = frappe.db.exists("Project", {"project_name": f"{PREFIX} project"})
	if not name:
		p = frappe.new_doc("Project")
		p.project_name = f"{PREFIX} project"
		# A workspace is required for after_insert to seed workflow states.
		p.orbit_workspace = ws
		p.orbit_identifier = "PWNTF"
		p.insert(ignore_permissions=True)
		name = p.name
	# Guarantee default workflow states exist — the state-change test needs
	# them, and older/stale projects may predate the seeding hook. Idempotent.
	seed_default_states_for_project(name)
	return name


def _make_task(subject: str, **kwargs) -> str:
	t = frappe.new_doc("Task")
	t.subject = subject
	t.project = _ensure_project()
	for k, v in kwargs.items():
		setattr(t, k, v)
	t.insert(ignore_permissions=True)
	return t.name


def _notifs_for(user: str, subject_like: str | None = None) -> list[dict]:
	filters = {"for_user": user}
	if subject_like:
		filters["subject"] = ["like", f"%{subject_like}%"]
	return frappe.get_all(
		"Notification Log",
		filters=filters,
		fields=["name", "subject", "type", "document_type", "document_name", "read"],
		order_by="creation desc",
	)


class TestOrbitNotifications(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		_cleanup()
		cls.alice = _ensure_user("notif-alice@example.com", "Alice Notif")
		cls.bob = _ensure_user("notif-bob@example.com", "Bob Notif")
		cls.actor = "Administrator"

	@classmethod
	def tearDownClass(cls):
		_cleanup()
		super().tearDownClass()

	def setUp(self):
		_cleanup()
		frappe.set_user(self.actor)

	# ------------------------------------------------------------------ helpers

	def _alice_notifs(self, like=None):
		return _notifs_for(self.alice, like)

	def _bob_notifs(self, like=None):
		return _notifs_for(self.bob, like)

	# ------------------------------------------------------------------ tests

	def test_reporter_notified_on_task_creation(self):
		_make_task(f"{PREFIX} reporter notify", orbit_reporter=self.alice)
		hits = self._alice_notifs("reporter")
		self.assertTrue(hits, "Reporter should get a notification on creation")
		self.assertEqual(hits[0]["type"], "Assignment")

	def test_no_self_notification_for_reporter(self):
		# Actor IS the reporter → should not notify themselves.
		_make_task(f"{PREFIX} self reporter", orbit_reporter=self.actor)
		hits = _notifs_for(self.actor, "self reporter")
		self.assertEqual(hits, [])

	def test_state_change_notifies_assignees(self):
		name = _make_task(f"{PREFIX} state change", orbit_reporter=self.alice)
		_cleanup()
		# Now move the state.
		t = frappe.get_doc("Task", name)
		# Prefer the project's first non-default state.
		states = frappe.get_all(
			"Orbit Workflow State",
			filters={"project": t.project},
			pluck="name",
			limit=2,
		)
		new_state = next((s for s in states if s != t.orbit_workflow_state), states[0])
		t.orbit_workflow_state = new_state
		t.save(ignore_permissions=True)

		hits = self._alice_notifs("moved")
		self.assertTrue(hits, "Reporter should be notified of state change")

	def test_mention_in_description_notifies(self):
		desc = (
			f'Hello <span data-type="mention" data-id="{self.bob}" '
			f'data-label="Bob">@Bob</span>'
		)
		_make_task(f"{PREFIX} mention", description=desc)
		hits = self._bob_notifs("mentioned")
		self.assertTrue(hits, "Mentioned user should get a Mention notification")
		self.assertEqual(hits[0]["type"], "Mention")

	def test_comment_on_task_notifies_watchers(self):
		name = _make_task(
			f"{PREFIX} comment notify", orbit_reporter=self.alice
		)
		_cleanup()
		# Add a comment as actor — should notify Alice (the reporter).
		c = frappe.new_doc("Comment")
		c.comment_type = "Comment"
		c.reference_doctype = "Task"
		c.reference_name = name
		c.content = "Testing comment fan-out"
		c.comment_email = self.actor
		c.insert(ignore_permissions=True)

		hits = self._alice_notifs("commented")
		self.assertTrue(hits, "Reporter should get a comment notification")

	def test_comment_with_mention_only_notifies_once(self):
		name = _make_task(
			f"{PREFIX} comment mention", orbit_reporter=self.bob
		)
		_cleanup()
		c = frappe.new_doc("Comment")
		c.comment_type = "Comment"
		c.reference_doctype = "Task"
		c.reference_name = name
		c.content = (
			f'Hey <span data-type="mention" data-id="{self.bob}" '
			f'data-label="Bob">@Bob</span> what do you think?'
		)
		c.comment_email = self.actor
		c.insert(ignore_permissions=True)

		hits = self._bob_notifs()
		self.assertEqual(
			len(hits),
			1,
			"Mentioned user should get exactly one notification, not both mention + comment",
		)
		self.assertEqual(hits[0]["type"], "Mention")

	def test_get_unread_count_and_mark_read(self):
		from orbit.notifications import get_unread_count, mark_read

		_make_task(f"{PREFIX} unread", orbit_reporter=self.alice)
		hits = self._alice_notifs("reporter")
		self.assertEqual(len(hits), 1)

		frappe.set_user(self.alice)
		try:
			self.assertGreaterEqual(get_unread_count(), 1)
			n = hits[0]["name"]
			self.assertEqual(mark_read(name=n), 1)
			# Second call returns 0 (idempotent).
			self.assertEqual(mark_read(name=n), 0)
		finally:
			frappe.set_user(self.actor)
