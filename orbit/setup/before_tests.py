"""Test-suite bootstrap.

Orbit builds on ERPNext's Project/Task. `Project.company` is mandatory and is
auto-filled from the global default company — which a fresh test site lacks.
`bench run-tests --app orbit` only runs Orbit's `before_tests` (not ERPNext's),
so we delegate to ERPNext's setup here to create a Company + default company.
Idempotent: ERPNext skips setup when a Company already exists.
"""

import frappe


def before_tests() -> None:
	frappe.clear_cache()
	from erpnext.setup.utils import before_tests as erpnext_before_tests

	erpnext_before_tests()
	frappe.db.commit()
