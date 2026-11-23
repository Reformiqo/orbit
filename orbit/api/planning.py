"""Read and write endpoints for Modules and Milestones.

Progress is derived from each task's Orbit Workflow State status_group, not
from ERPNext's Task.status, because Orbit lets a project define its own states.
"""

import frappe

MODULE_FIELDS = (
	"name",
	"module_name",
	"project",
	"status",
	"lead",
	"description",
	"start_date",
	"target_date",
	"color",
	"position",
)

MILESTONE_FIELDS = (
	"name",
	"milestone_name",
	"project",
	"status",
	"lead",
	"description",
	"target_date",
	"color",
	"position",
)

DONE_GROUPS = ("Completed",)
DROPPED_GROUPS = ("Cancelled",)


def _require_project(project: str) -> None:
	if not project:
		frappe.throw("project is required")
	if not frappe.db.exists("Project", project):
		frappe.throw(f"Project {project} not found")
	if not frappe.has_permission("Project", doc=project):
		frappe.throw("Not permitted", frappe.PermissionError)


def _counts_by_bucket(project: str, fieldname: str) -> dict:
	"""{bucket_name: {total, done, dropped, started, open}} for one link field."""
	rows = frappe.db.sql(
		"""
		select t.`{field}` as bucket,
		       coalesce(s.status_group, 'Unstarted') as status_group,
		       count(*) as c
		from `tabTask` t
		left join `tabOrbit Workflow State` s on s.name = t.orbit_workflow_state
		where t.project = %(project)s and t.`{field}` is not null and t.`{field}` != ''
		group by t.`{field}`, status_group
		""".format(field=fieldname),
		{"project": project},
		as_dict=True,
	)
	out = {}
	for r in rows:
		b = out.setdefault(
			r.bucket, {"total": 0, "done": 0, "dropped": 0, "started": 0, "open": 0}
		)
		b["total"] += r.c
		if r.status_group in DONE_GROUPS:
			b["done"] += r.c
		elif r.status_group in DROPPED_GROUPS:
			b["dropped"] += r.c
		elif r.status_group == "Started":
			b["started"] += r.c
			b["open"] += r.c
		else:
			b["open"] += r.c
	return out


def _decorate(rows, counts) -> list:
	for r in rows:
		c = counts.get(r["name"], {"total": 0, "done": 0, "dropped": 0, "started": 0, "open": 0})
		r.update(c)
		countable = c["total"] - c["dropped"]
		r["progress"] = round(c["done"] * 100.0 / countable) if countable else 0
	return rows


@frappe.whitelist()
def get_modules(project: str) -> list:
	"""Modules for a project, each with task counts and a progress percentage."""
	_require_project(project)
	rows = frappe.get_all(
		"Orbit Module",
		filters={"project": project},
		fields=list(MODULE_FIELDS),
		order_by="position asc, creation asc",
		limit_page_length=0,
	)
	return _decorate(rows, _counts_by_bucket(project, "orbit_module"))


@frappe.whitelist()
def get_milestones(project: str) -> list:
	"""Milestones for a project, each with task counts and a progress percentage."""
	_require_project(project)
	rows = frappe.get_all(
		"Orbit Milestone",
		filters={"project": project},
		fields=list(MILESTONE_FIELDS),
		order_by="target_date asc, position asc, creation asc",
		limit_page_length=0,
	)
	return _decorate(rows, _counts_by_bucket(project, "orbit_milestone"))


@frappe.whitelist()
def get_planning_overview(project: str) -> dict:
	"""Modules, milestones and the count of tasks in neither, in one round trip."""
	_require_project(project)
	unassigned_module = frappe.db.count(
		"Task", {"project": project, "orbit_module": ["in", [None, ""]]}
	)
	unassigned_milestone = frappe.db.count(
		"Task", {"project": project, "orbit_milestone": ["in", [None, ""]]}
	)
	return {
		"modules": get_modules(project),
		"milestones": get_milestones(project),
		"unassigned": {
			"module": unassigned_module,
			"milestone": unassigned_milestone,
		},
	}


@frappe.whitelist()
def set_task_planning(tasks, module=None, milestone=None) -> dict:
	"""Bulk-assign tasks to a module and/or milestone.

	Pass an empty string to clear a field; omit it to leave it untouched.
	Each task is saved through the normal path so the same-project validation
	in orbit.overrides.task runs.
	"""
	if isinstance(tasks, str):
		tasks = frappe.parse_json(tasks)
	if not tasks:
		return {"updated": 0}

	updated = 0
	for name in tasks:
		doc = frappe.get_doc("Task", name)
		doc.check_permission("write")
		changed = False
		if module is not None and doc.orbit_module != (module or None):
			doc.orbit_module = module or None
			changed = True
		if milestone is not None and doc.orbit_milestone != (milestone or None):
			doc.orbit_milestone = milestone or None
			changed = True
		if changed:
			doc.save()
			updated += 1
	return {"updated": updated}
