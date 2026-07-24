"""Idempotent seed helpers for local dev and CI test runs.

Run via:
    bench --site <site> execute 'frappe.get_attr("orbit.tests.seed.create_test_user")()'

The `cleanup_test_workspaces` method is whitelisted for Playwright test hooks.
It is guarded behind developer_mode so it cannot be invoked in production.
"""

import frappe
from frappe import _


ORBIT_TESTER_EMAIL = "orbit-tester@example.com"
ORBIT_TESTER_PASSWORD = "orbit-test-5!Xq"
ORBIT_TESTER_FULL_NAME = "Orbit Tester"
ORBIT_TESTER_ROLES = ("System Manager", "Projects User", "Projects Manager")


def ensure_system_manager_comment_perm() -> None:
	"""Ensure the System Manager role has read on Comment.

	On this shared bench, the Comment doctype's default DocPerm table has been
	overridden by a Custom DocPerm entry (for `FSM Dispatcher`). Once a Custom
	DocPerm exists, Frappe ignores the built-in DocPerm rows — meaning no other
	role can read/write Comment unless we add them explicitly. This helper
	restores Read access for System Manager so the Orbit Tester (who has that
	role) can list comments on a Task. Idempotent.
	"""
	existing = frappe.db.exists(
		"Custom DocPerm",
		{"parent": "Comment", "role": "System Manager", "permlevel": 0},
	)
	if existing:
		return
	p = frappe.new_doc("Custom DocPerm")
	p.parent = "Comment"
	p.parenttype = "DocType"
	p.parentfield = "permissions"
	p.role = "System Manager"
	p.permlevel = 0
	p.read = 1
	p.write = 1
	p.create = 1
	p.delete = 1
	p.share = 1
	p.export = 1
	p.report = 1
	p.insert(ignore_permissions=True)
	frappe.clear_cache()
	frappe.db.commit()


def create_test_user() -> str:
	"""Create (or reset) the Orbit test user. Returns the user's name."""
	if frappe.db.exists("User", ORBIT_TESTER_EMAIL):
		user = frappe.get_doc("User", ORBIT_TESTER_EMAIL)
	else:
		user = frappe.new_doc("User")
		user.email = ORBIT_TESTER_EMAIL
		user.first_name = "Orbit"
		user.last_name = "Tester"
		user.send_welcome_email = 0
		user.enabled = 1
		user.user_type = "System User"
		user.insert(ignore_permissions=True)

	user.full_name = ORBIT_TESTER_FULL_NAME
	user.enabled = 1
	user.user_type = "System User"

	existing_roles = {r.role for r in user.get("roles", [])}
	for role in ORBIT_TESTER_ROLES:
		if role not in existing_roles:
			user.append("roles", {"role": role})

	user.save(ignore_permissions=True)

	from frappe.utils.password import update_password

	update_password(ORBIT_TESTER_EMAIL, ORBIT_TESTER_PASSWORD)

	# Patch Comment permissions if this site's Custom DocPerm setup strips
	# System Manager's access — see helper doc for details.
	ensure_system_manager_comment_perm()

	frappe.db.commit()
	return user.name


DEFAULT_WORKSPACE_SLUG = "default"
DEFAULT_WORKSPACE_NAME = "My Team"


@frappe.whitelist()
def ensure_states_for_all_projects() -> int:
	"""Seed default workflow states for every project that's missing them.

	Useful for projects created before the after_insert hook was wired up.
	Returns the number of projects that received fresh seeds.
	"""
	from orbit.orbit.doctype.orbit_workflow_state.orbit_workflow_state import (
		seed_default_states_for_project,
	)

	projects = frappe.get_all(
		"Project",
		filters={"orbit_workspace": ["is", "set"]},
		pluck="name",
	)
	seeded = 0
	for name in projects:
		existing = frappe.db.count("Orbit Workflow State", {"project": name})
		if existing == 0:
			seed_default_states_for_project(name)
			seeded += 1
	frappe.db.commit()
	return seeded


@frappe.whitelist()
def ensure_types_for_all_workspaces() -> int:
	"""Seed default task types for every workspace that's missing them.

	Useful for workspaces created before the after_insert hook was wired up.
	Returns the number of workspaces that received fresh seeds.
	"""
	from orbit.orbit.doctype.orbit_task_type.orbit_task_type import (
		seed_default_types_for_workspace,
	)

	workspaces = frappe.get_all("Orbit Workspace", pluck="name")
	seeded = 0
	for name in workspaces:
		existing = frappe.db.count("Orbit Task Type", {"workspace": name})
		if existing == 0:
			seed_default_types_for_workspace(name)
			seeded += 1
	frappe.db.commit()
	return seeded


def ensure_default_workspace() -> str:
	"""Create the default workspace if the site has none. Idempotent.

	Also ensures default task types exist for the workspace (covers the case
	where the workspace existed before the after_insert hook was wired up).
	"""
	from orbit.orbit.doctype.orbit_task_type.orbit_task_type import (
		seed_default_types_for_workspace,
	)

	if not frappe.db.exists("Orbit Workspace", DEFAULT_WORKSPACE_SLUG):
		ws = frappe.new_doc("Orbit Workspace")
		ws.workspace_name = DEFAULT_WORKSPACE_NAME
		ws.slug = DEFAULT_WORKSPACE_SLUG
		ws.insert(ignore_permissions=True)

	# Idempotent — no-op if types already exist.
	seed_default_types_for_workspace(DEFAULT_WORKSPACE_SLUG)
	frappe.db.commit()
	return DEFAULT_WORKSPACE_SLUG


@frappe.whitelist(allow_guest=False)
def cleanup_test_tasks(prefix: str = "PW ") -> int:
	"""Delete Task rows whose subject OR display_id starts with the given prefix.

	Aggressive clean handles orphaned tasks left behind when a parent
	Project was deleted without cascade (Frappe doesn't cascade Tasks).
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	if not prefix or len(prefix) < 2:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	display_prefix = prefix.strip().upper().replace(" ", "")
	matched: set[str] = set()
	matched.update(
		frappe.get_all("Task", filters={"subject": ["like", f"{prefix}%"]}, pluck="name")
	)
	matched.update(
		frappe.get_all(
			"Task",
			filters={"orbit_display_id": ["like", f"{display_prefix}%"]},
			pluck="name",
		)
	)
	for name in matched:
		try:
			frappe.delete_doc("Task", name, ignore_permissions=True, force=True)
		except Exception:
			# Orphaned tasks whose project vanished can trip the on_delete hook.
			# Fall back to a raw SQL delete — safe for test cleanup only.
			try:
				frappe.db.sql("DELETE FROM tabTask WHERE name = %s", (name,))
			except Exception:
				continue
	frappe.db.commit()
	return len(matched)


@frappe.whitelist(allow_guest=False)
def seed_test_project(project_name: str, identifier: str, workspace: str = "default") -> str:
	"""Create a Project for Playwright tests. GET-callable, developer_mode only."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	ensure_default_workspace()
	if not workspace:
		workspace = DEFAULT_WORKSPACE_SLUG
	project = frappe.new_doc("Project")
	project.project_name = project_name
	project.orbit_identifier = identifier.upper()
	project.orbit_workspace = workspace
	project.insert(ignore_permissions=True)
	frappe.db.commit()
	return project.name


@frappe.whitelist(allow_guest=False)
def cleanup_test_projects(prefix: str = "PW ") -> int:
	"""Delete Project rows whose project_name starts with the given prefix.

	Same guards as cleanup_test_workspaces — developer_mode only, non-trivial prefix.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	if not prefix or len(prefix) < 2:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	names = frappe.get_all(
		"Project",
		filters={"project_name": ["like", f"{prefix}%"]},
		pluck="name",
	)
	for name in names:
		frappe.delete_doc("Project", name, ignore_permissions=True, force=True)
	frappe.db.commit()
	return len(names)


@frappe.whitelist(allow_guest=False)
def seed_test_page(
	title: str,
	project: str,
	parent_page: str | None = None,
	content: str = "",
) -> str:
	"""Create an Orbit Page for Playwright tests. GET-callable, developer_mode only."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	page = frappe.new_doc("Orbit Page")
	page.title = title
	page.project = project
	if parent_page:
		page.parent_page = parent_page
	if content:
		page.content = content
	page.insert(ignore_permissions=True)
	frappe.db.commit()
	return page.name


@frappe.whitelist(allow_guest=False)
def cleanup_test_pages(prefix: str = "PW ") -> int:
	"""Delete Orbit Page rows whose title starts with the given prefix.

	Also mops up orphaned pages (pages whose project no longer exists in
	the Project table) — these accumulate when prior test runs delete the
	Project without cascading to its pages.

	Developer-mode guarded. Nulls parent_page first to break any chain
	before deleting, so we can delete in any order.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	if not prefix or len(prefix) < 2:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	matched: set[str] = set()
	matched.update(
		frappe.get_all(
			"Orbit Page",
			filters={"title": ["like", f"{prefix}%"]},
			pluck="name",
		)
	)
	# Orphan sweep — pages whose project no longer exists.
	# Safe to delete because they can only come from test runs that didn't
	# cascade-delete pages after wiping their project.
	project_names = set(frappe.get_all("Project", pluck="name"))
	for p in frappe.get_all("Orbit Page", fields=["name", "project"]):
		if p.project and p.project not in project_names:
			matched.add(p.name)

	for name in matched:
		frappe.db.set_value("Orbit Page", name, "parent_page", None)
	for name in matched:
		frappe.delete_doc("Orbit Page", name, ignore_permissions=True, force=True)
	frappe.db.commit()
	return len(matched)


@frappe.whitelist(allow_guest=False)
def cleanup_test_workspaces(prefix: str = "pw-") -> int:
	"""Delete all Orbit Workspace rows whose slug starts with the given prefix.

	Exposed as a GET-callable whitelisted method so Playwright tests can reset
	state between runs without wrestling with CSRF on REST DELETE.
	Guarded behind developer_mode — refuses to run in production.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))

	if not prefix or len(prefix) < 2:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	names = frappe.get_all(
		"Orbit Workspace",
		filters={"slug": ["like", f"{prefix}%"]},
		pluck="name",
	)
	for name in names:
		frappe.delete_doc("Orbit Workspace", name, ignore_permissions=True, force=True)
	frappe.db.commit()
	return len(names)


@frappe.whitelist(allow_guest=False)
def seed_task_state_change(task: str, state: str) -> str:
	"""Set a task's workflow state AND force a Version record.

	Useful in Playwright tests for the Transitions tab — setting the state via
	set_value doesn't always trigger on_change → make_version fast enough for
	the UI to observe it, so we write the Version row directly.
	Guarded behind developer_mode.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	import json

	doc = frappe.get_doc("Task", task)
	old = doc.orbit_workflow_state
	if old == state:
		return "noop"
	doc.orbit_workflow_state = state
	doc.save(ignore_permissions=True)
	# Force-insert a Version so the UI can observe it regardless of the
	# on_change hook ordering.
	v = frappe.new_doc("Version")
	v.ref_doctype = "Task"
	v.docname = task
	v.data = json.dumps({"changed": [["orbit_workflow_state", old, state]]})
	v.insert(ignore_permissions=True)
	frappe.db.commit()
	return v.name


@frappe.whitelist(allow_guest=False)
def seed_task_version(task: str, field: str, old_value: str = "", new_value: str = "") -> str:
	"""Insert a Version record documenting a single field change on a Task.

	Used by Playwright specs that need to force a Version without going through
	the Task on_change pipeline (which can race the UI). Developer-mode only.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	import json

	v = frappe.new_doc("Version")
	v.ref_doctype = "Task"
	v.docname = task
	v.data = json.dumps({"changed": [[field, old_value, new_value]]})
	v.insert(ignore_permissions=True)
	frappe.db.commit()
	return v.name


@frappe.whitelist(allow_guest=False)
def seed_task_comment(task: str, content: str) -> str:
	"""Post a comment on a Task for Playwright tests.

	GET-callable, developer_mode only. Avoids the CSRF dance of posting to
	add_comment directly from Playwright.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	comment = frappe.new_doc("Comment")
	comment.comment_type = "Comment"
	comment.reference_doctype = "Task"
	comment.reference_name = task
	comment.content = content
	comment.insert(ignore_permissions=True)
	frappe.db.commit()
	return comment.name


@frappe.whitelist(allow_guest=False)
def cleanup_test_files(prefix: str = "pw-test-") -> int:
	"""Delete File rows whose file_name starts with the given prefix.

	Developer-mode guarded. Refuses prefixes shorter than 4 chars to avoid
	sweeping unrelated files.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	if not prefix or len(prefix) < 4:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	names = frappe.get_all(
		"File",
		filters={"file_name": ["like", f"{prefix}%"]},
		pluck="name",
	)
	for name in names:
		try:
			frappe.delete_doc("File", name, ignore_permissions=True, force=True)
		except Exception:
			# Best-effort — orphaned File rows can race with disk deletion
			continue
	frappe.db.commit()
	return len(names)


@frappe.whitelist(allow_guest=False)
def seed_test_todo(
	description: str,
	allocated_to: str = "",
	reference_type: str = "",
	reference_name: str = "",
	status: str = "Open",
	priority: str = "Medium",
) -> str:
	"""Create a ToDo for Playwright tests. GET-callable, developer_mode only.

	Used by inbox.spec.ts to seed deterministic triage items for the current
	tester. If allocated_to is omitted, uses the current session user.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	todo = frappe.new_doc("ToDo")
	todo.description = description
	todo.allocated_to = allocated_to or frappe.session.user
	if reference_type:
		todo.reference_type = reference_type
	if reference_name:
		todo.reference_name = reference_name
	todo.status = status
	todo.priority = priority
	todo.insert(ignore_permissions=True)
	frappe.db.commit()
	return todo.name


@frappe.whitelist(allow_guest=False)
def cleanup_test_todos(prefix: str = "PW ") -> int:
	"""Delete ToDo rows whose description contains the given prefix, plus any
	ToDo allocated to the tester (includes the auto-created assignment ToDos
	from `frappe.desk.form.assign_to.add` which don't carry our PW prefix).
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	if not prefix or len(prefix) < 2:
		frappe.throw(_("Refusing to clean with a too-short prefix."))

	names = set(
		frappe.get_all(
			"ToDo",
			filters={"description": ["like", f"%{prefix}%"]},
			pluck="name",
		)
	)
	names.update(
		frappe.get_all(
			"ToDo",
			filters={"allocated_to": ORBIT_TESTER_EMAIL},
			pluck="name",
		)
	)
	for name in names:
		frappe.delete_doc("ToDo", name, ignore_permissions=True, force=True)
	frappe.db.commit()
	return len(names)


@frappe.whitelist(allow_guest=False)
def set_task_field(task: str, fieldname: str, value: str) -> str:
	"""Set a single Task field from Playwright. GET-callable, developer_mode only.

	Whitelisted fields only — avoids becoming a generic write-anywhere API.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	allowed = {
		"orbit_workflow_state",
		"exp_end_date",
		"exp_start_date",
		"priority",
		"subject",
		"status",
	}
	if fieldname not in allowed:
		frappe.throw(_("Refusing to set non-allowed field: {0}").format(fieldname))
	frappe.db.set_value("Task", task, fieldname, value)
	frappe.db.commit()
	return task


@frappe.whitelist(allow_guest=False)
def get_task_state(task: str) -> str:
	"""Return the orbit_workflow_state of a Task. GET-callable."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	return frappe.db.get_value("Task", task, "orbit_workflow_state") or ""


@frappe.whitelist(allow_guest=False)
def list_project_states(project: str) -> list:
	"""Return Orbit Workflow State rows for a project. GET-callable."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	return frappe.get_all(
		"Orbit Workflow State",
		filters={"project": project},
		fields=["name", "state_name", "position", "is_default"],
		order_by="position asc",
	)


@frappe.whitelist(allow_guest=False)
def seed_test_task(
	project: str,
	subject: str,
	task_type_name: str = "",
	workspace: str = "default",
) -> str:
	"""Create a Task for Playwright tests. GET-callable, developer_mode only.

	If task_type_name is given (e.g. "Query"), looks up the Orbit Task Type
	with that name in the given workspace and links the task to it. Otherwise
	the task's validate hook will pick the workspace default.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	task = frappe.new_doc("Task")
	task.subject = subject
	task.project = project
	if task_type_name:
		tt = frappe.db.get_value(
			"Orbit Task Type",
			{
				"workspace": workspace or DEFAULT_WORKSPACE_SLUG,
				"type_name": task_type_name,
			},
			"name",
		)
		if tt:
			task.orbit_task_type = tt
	task.insert(ignore_permissions=True)
	frappe.db.commit()
	return task.name


@frappe.whitelist(allow_guest=False)
def cleanup_notification_logs(prefix: str = "PW notif") -> int:
	"""Delete Notification Log rows whose subject starts with `prefix`, plus
	any leaked notifications for the tester user (which our own doc_event
	hooks create as a side-effect of seed_test_task, state changes, etc.).
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test cleanup is only available in developer mode."))
	prefix = (prefix or "").strip()
	if len(prefix) < 4:
		frappe.throw(_("Refuse to cleanup with prefix shorter than 4 chars."))
	rows = set(
		frappe.get_all(
			"Notification Log",
			filters={"subject": ["like", f"{prefix}%"]},
			pluck="name",
		)
	)
	# Also clear any notifications addressed to the tester user — they're
	# created by orbit.notifications hooks and leak across test cases.
	rows.update(
		frappe.get_all(
			"Notification Log",
			filters={"for_user": ORBIT_TESTER_EMAIL},
			pluck="name",
		)
	)
	for n in rows:
		frappe.delete_doc("Notification Log", n, force=True, ignore_permissions=True)
	frappe.db.commit()
	return len(rows)


@frappe.whitelist(allow_guest=False)
def seed_notification(
	for_user: str,
	subject: str,
	type_: str = "Alert",
	document_type: str = "Task",
	document_name: str = "",
) -> str:
	"""Insert a Notification Log row for `for_user`. Dev-mode only."""
	if not frappe.conf.developer_mode:
		frappe.throw(_("Test seed is only available in developer mode."))
	doc = frappe.new_doc("Notification Log")
	doc.subject = subject
	doc.for_user = for_user
	doc.type = type_
	doc.document_type = document_type
	doc.document_name = document_name
	doc.from_user = "Administrator"
	doc.email_content = subject
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc.name
