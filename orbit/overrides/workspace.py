"""Orbit hooks into Orbit Workspace doctype via doc_events in hooks.py."""


def after_insert(doc, method=None) -> None:
	"""Seed default task types for new workspaces."""
	from orbit.orbit.doctype.orbit_task_type.orbit_task_type import (
		seed_default_types_for_workspace,
	)

	seed_default_types_for_workspace(doc.name)
