"""Test-suite bootstrap.

Orbit builds on ERPNext's Project/Task. `Project.company` is mandatory and is
auto-filled from the global default company — which a fresh test site lacks.
`bench run-tests --app orbit` only runs Orbit's `before_tests` (not ERPNext's),
so we run ERPNext's own setup to create a Company + default company.

ERPNext's before_tests function has moved between versions, so we resolve it
through ERPNext's hook rather than a fixed import path, and fall back to a
direct setup if a Company still doesn't exist. Idempotent.
"""

import frappe


def before_tests() -> None:
	frappe.clear_cache()
	for method in frappe.get_hooks("before_tests", app_name="erpnext") or []:
		try:
			frappe.get_attr(method)()
		except Exception:
			frappe.log_error(title="orbit before_tests: erpnext hook failed")

	if not frappe.db.a_row_exists("Company"):
		_setup_company()

	frappe.db.commit()


def _setup_company() -> None:
	"""Run Frappe's setup wizard to create a Company + default company."""
	from frappe.desk.page.setup_wizard.setup_wizard import setup_complete
	from frappe.utils import now_datetime

	year = now_datetime().year
	setup_complete(
		{
			"currency": "USD",
			"full_name": "Test User",
			"company_name": "Test Company",
			"timezone": "America/New_York",
			"company_abbr": "TC",
			"industry": "Manufacturing",
			"country": "United States",
			"fy_start_date": f"{year}-01-01",
			"fy_end_date": f"{year}-12-31",
			"language": "english",
			"company_tagline": "Testing",
			"email": "test@example.com",
			"password": "test",
			"chart_of_accounts": "Standard",
		}
	)
