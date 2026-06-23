# Spec: Authentication
_Status: blocked — pending supervisor decision_

---

## Decision Required

Does the reporting form require users to log in before submitting?

---

## Options

### Option A — No auth (current state)
Anyone with the URL can submit. Simple, no backend needed.
- Good for: open field surveys, public reporting
- Risk: spam submissions, no accountability

### Option B — Shared password / access code
A single passcode gates access to the form.
- Good for: small internal teams, simple to implement
- Implementation: check code on load, store in sessionStorage

### Option C — Institutional SSO (Google / University)
Login via Google OAuth (jiayuanj@umich.edu domain) or university SSO.
- Good for: controlled team access, audit trail of who submitted what
- Requires: OAuth setup (Google Cloud Console), backend or Vercel edge function for token validation

### Option D — KoboToolbox account required
Users must have a KoboToolbox account and be added to the project.
- Good for: tight integration with KoboToolbox permissions model
- Downside: friction for field researchers

---

## Recommendation

For **demo**: Option A (no auth) — simplest, focus is on UX.
For **production**: Option C (Google OAuth, restrict to @umich.edu) — most appropriate for a university research project.

---

## Questions for supervisor

1. Who are the submitters? (lab members only? external collaborators?)
2. Is traceability required? (know who submitted each record)
3. Should different people have different permissions? (submit-only vs. view-all)
