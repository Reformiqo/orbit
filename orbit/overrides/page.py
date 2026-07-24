"""Validation hooks for Orbit Page.

Lives under overrides/ so backend tests can import without triggering
Frappe's auto test-record resolution (see doctype-patterns for the rationale).
"""

import frappe


def validate(doc, method=None):
	"""Called on Orbit Page.validate via doc_events."""
	_validate_parent_same_project(doc)
	_validate_no_cycles(doc)


def _validate_parent_same_project(doc) -> None:
	if not doc.get("parent_page"):
		return
	parent_project = frappe.db.get_value("Orbit Page", doc.parent_page, "project")
	if not parent_project:
		frappe.throw(f"Parent page {doc.parent_page} does not exist.")
	if parent_project != doc.project:
		frappe.throw(
			"Parent page must belong to the same project as this page "
			f"(parent is in '{parent_project}', this page is in '{doc.project}')."
		)


def _validate_no_cycles(doc) -> None:
	"""Walk the parent chain; refuse if it loops back to this doc."""
	if not doc.get("parent_page"):
		return
	# A brand-new doc's name can match parent_page if someone hand-crafts it,
	# but hash-autonamed pages won't have a name before insert. Still guard.
	if doc.name and doc.parent_page == doc.name:
		frappe.throw("A page cannot be its own parent.")

	visited: set[str] = set()
	current = doc.parent_page
	while current:
		if current in visited:
			frappe.throw("Parent page chain contains a cycle.")
		visited.add(current)
		if doc.name and current == doc.name:
			frappe.throw("Parent page chain cannot include this page (cycle).")
		current = frappe.db.get_value("Orbit Page", current, "parent_page")
