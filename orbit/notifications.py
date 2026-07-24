"""Orbit notification fan-out.

Drops Notification Log rows + publishes a realtime event so the SPA can
update unread counts without a full refresh.

Triggers:
- Task on_update     → state / priority / due-date / assignee changes
- Task after_insert  → notify reporter (when actor != reporter)
- Comment on_update  → new comment on a Task; @ mentions in any Task or
                       Orbit Page comment
"""

from __future__ import annotations

import re

import frappe
from frappe.utils import get_fullname

# Apply the CRM Comment guard at module import so it runs in any worker /
# test context that loads our notification hooks (before_request only fires
# for HTTP, not test runners or background jobs).
try:
	from orbit.overrides.crm_comment_guard import apply as _apply_crm_guard

	_apply_crm_guard()
except Exception:
	pass

_MENTION_RE = re.compile(
	r'<span[^>]*data-type=["\']mention["\'][^>]*data-id=["\']([^"\']+)["\']'
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _actor() -> str:
	return frappe.session.user or "Administrator"


def _task_assignees(task) -> list[str]:
	raw = task.get("_assign") or "[]"
	try:
		return list(frappe.parse_json(raw) or [])
	except Exception:
		return []


def _task_recipients(task, exclude: set[str] | None = None) -> list[str]:
	"""Assignees + reporter + owner, deduped, minus the actor."""
	exclude = exclude or set()
	exclude.add(_actor())
	exclude.add("Guest")
	people: set[str] = set()
	people.update(_task_assignees(task))
	if task.get("orbit_reporter"):
		people.add(task.orbit_reporter)
	if task.get("owner"):
		people.add(task.owner)
	return [p for p in people if p and p not in exclude]


def _extract_mention_emails(html: str | None) -> list[str]:
	if not html:
		return []
	return list({m for m in _MENTION_RE.findall(html) if m})


def _push(
	*,
	for_user: str,
	subject: str,
	doctype: str,
	docname: str,
	type_: str = "Alert",
	email_content: str | None = None,
) -> None:
	"""Insert a Notification Log row + emit realtime ping.

	Inserted as Administrator so users notify each other regardless of
	their write perms on Notification Log.
	"""
	if not for_user or for_user == _actor():
		return

	doc = frappe.new_doc("Notification Log")
	doc.update(
		{
			"subject": subject,
			"for_user": for_user,
			"type": type_,
			"document_type": doctype,
			"document_name": docname,
			"from_user": _actor(),
			"email_content": email_content or subject,
		}
	)
	doc.insert(ignore_permissions=True)

	try:
		frappe.publish_realtime(
			event="orbit:notification",
			message={
				"name": doc.name,
				"subject": subject,
				"document_type": doctype,
				"document_name": docname,
				"type": type_,
			},
			user=for_user,
		)
	except Exception:
		# Realtime is best-effort; never break the parent transaction.
		pass


def _task_link(task) -> str:
	display = task.get("orbit_display_id") or task.name
	return f"<b>{frappe.utils.escape_html(display)}</b>"


# ---------------------------------------------------------------------------
# Task hooks
# ---------------------------------------------------------------------------


def on_task_after_insert(doc, method=None) -> None:
	# When a reporter is set and is not the actor, notify them.
	if doc.get("orbit_reporter") and doc.orbit_reporter != _actor():
		_push(
			for_user=doc.orbit_reporter,
			subject=f"You were set as reporter on {_task_link(doc)}",
			doctype="Task",
			docname=doc.name,
			type_="Assignment",
		)

	# Notify any mentioned users in description.
	for email in _extract_mention_emails(doc.get("description")):
		_push(
			for_user=email,
			subject=f"{get_fullname(_actor())} mentioned you in {_task_link(doc)}",
			doctype="Task",
			docname=doc.name,
			type_="Mention",
		)


def on_task_update(doc, method=None) -> None:
	"""Detect interesting changes and notify recipients.

	Frappe sets `doc._doc_before_save` to the prior state during on_update,
	which lets us diff scalar fields. If the row was just inserted in the
	same transaction (no before-state), we skip — after_insert handles it.
	"""
	before = getattr(doc, "_doc_before_save", None)
	if not before:
		return

	link = _task_link(doc)
	actor_name = get_fullname(_actor())

	# State change.
	if doc.get("orbit_workflow_state") != before.get("orbit_workflow_state"):
		new = doc.get("orbit_workflow_state") or "—"
		old = before.get("orbit_workflow_state") or "—"
		for u in _task_recipients(doc):
			_push(
				for_user=u,
				subject=f"{actor_name} moved {link} from <b>{frappe.utils.escape_html(old)}</b> to <b>{frappe.utils.escape_html(new)}</b>",
				doctype="Task",
				docname=doc.name,
				type_="Alert",
			)

	# Priority change.
	if doc.get("priority") != before.get("priority"):
		new = doc.get("priority") or "—"
		for u in _task_recipients(doc):
			_push(
				for_user=u,
				subject=f"{actor_name} set priority to <b>{frappe.utils.escape_html(new)}</b> on {link}",
				doctype="Task",
				docname=doc.name,
				type_="Alert",
			)

	# Due date change.
	if doc.get("exp_end_date") != before.get("exp_end_date"):
		new = doc.get("exp_end_date") or "—"
		for u in _task_recipients(doc):
			_push(
				for_user=u,
				subject=f"{actor_name} changed due date to <b>{new}</b> on {link}",
				doctype="Task",
				docname=doc.name,
				type_="Alert",
			)

	# Reporter change.
	if doc.get("orbit_reporter") != before.get("orbit_reporter"):
		new_reporter = doc.get("orbit_reporter")
		if new_reporter and new_reporter != _actor():
			_push(
				for_user=new_reporter,
				subject=f"{actor_name} set you as reporter on {link}",
				doctype="Task",
				docname=doc.name,
				type_="Assignment",
			)

	# New mentions in description.
	old_mentions = set(_extract_mention_emails(before.get("description")))
	new_mentions = set(_extract_mention_emails(doc.get("description")))
	for email in new_mentions - old_mentions:
		_push(
			for_user=email,
			subject=f"{actor_name} mentioned you in {link}",
			doctype="Task",
			docname=doc.name,
			type_="Mention",
		)


# ---------------------------------------------------------------------------
# Comment hooks
# ---------------------------------------------------------------------------


def on_comment_update(doc, method=None) -> None:
	"""Notify task watchers + mentioned users when a comment lands.

	Only fires for first-insert (not edits): we look at `doc.flags.in_insert`
	so editing an old comment doesn't re-notify everybody.
	"""
	if not doc.flags.get("in_insert"):
		return
	if doc.get("comment_type") != "Comment":
		return
	if doc.get("reference_doctype") != "Task":
		return

	try:
		task = frappe.get_doc("Task", doc.reference_name)
	except frappe.DoesNotExistError:
		return

	link = _task_link(task)
	actor_name = get_fullname(_actor())

	mentioned = set(_extract_mention_emails(doc.get("content")))
	for email in mentioned:
		_push(
			for_user=email,
			subject=f"{actor_name} mentioned you in a comment on {link}",
			doctype="Task",
			docname=task.name,
			type_="Mention",
		)

	# Notify task watchers, excluding anyone we already mentioned.
	for u in _task_recipients(task, exclude=mentioned):
		_push(
			for_user=u,
			subject=f"{actor_name} commented on {link}",
			doctype="Task",
			docname=task.name,
			type_="Alert",
		)


# ---------------------------------------------------------------------------
# Whitelisted helpers used by the SPA (Inbox + sidebar badge)
# ---------------------------------------------------------------------------


@frappe.whitelist()
def get_unread_count() -> int:
	"""Unread Notification Log count for the current user."""
	user = frappe.session.user
	if user == "Guest":
		return 0
	return frappe.db.count(
		"Notification Log", filters={"for_user": user, "read": 0}
	)


@frappe.whitelist()
def list_inbox(limit: int = 50) -> list[dict]:
	"""Notification Log entries for the current user, newest first."""
	user = frappe.session.user
	if user == "Guest":
		return []
	rows = frappe.get_all(
		"Notification Log",
		filters={"for_user": user},
		fields=[
			"name",
			"subject",
			"type",
			"document_type",
			"document_name",
			"from_user",
			"read",
			"creation",
		],
		order_by="creation desc",
		limit=int(limit),
	)
	return rows


@frappe.whitelist()
def mark_read(name: str | None = None, all: bool = False) -> int:
	"""Mark a single Notification Log row as read, or all of them.

	Returns the number of rows updated.
	"""
	user = frappe.session.user
	if user == "Guest":
		return 0

	if all or frappe.utils.cint(all):
		updated = frappe.db.sql(
			"""UPDATE `tabNotification Log`
			   SET `read` = 1
			   WHERE `for_user` = %s AND `read` = 0""",
			(user,),
		)
		frappe.db.commit()
		return frappe.db.count(
			"Notification Log", filters={"for_user": user, "read": 1}
		)

	if not name:
		return 0

	row = frappe.db.get_value(
		"Notification Log", name, ["for_user", "read"], as_dict=True
	)
	if not row or row.for_user != user:
		return 0
	if row.read:
		return 0
	frappe.db.set_value("Notification Log", name, "read", 1)
	frappe.db.commit()
	return 1
