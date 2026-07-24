import frappe

_patched = False

_CRM_DOCTYPES = {
	"CRM Lead",
	"CRM Deal",
	"CRM Organization",
	"CRM Contact",
	"CRM Task",
	"CRM Call Log",
}


def apply():
	"""Guard crm.api.comment.notify_mentions so it no-ops on non-CRM refs.

	CRM's built-in on_update hook for Comment crashes when the Comment is on
	a non-CRM doctype (e.g. an Orbit Task) because it dereferences
	`reference_doc.organization` / `lead_name`. Wrap it once per worker.
	"""
	global _patched
	if _patched:
		return
	try:
		from crm.api import comment as _crm_comment
	except Exception:
		_patched = True
		return

	_original = _crm_comment.notify_mentions

	def _guarded(doc):
		ref = getattr(doc, "reference_doctype", None)
		if ref not in _CRM_DOCTYPES:
			return
		return _original(doc)

	_crm_comment.notify_mentions = _guarded
	_patched = True
