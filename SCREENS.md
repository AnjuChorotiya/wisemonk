# wisemonk — Screen Docs

Purpose and flow for each onboarding screen in this repo. Live app:
`https://anjuchorotiya.github.io/wisemonk/`.

---

## Onboarding index

**Purpose:** Landing page that lets a user pick which onboarding flow to preview.

**Flow:**
1. Shows two cards — **Organization onboarding** (KYC + MSA for the client entity) and **Employee onboarding** (identity/docs/bank for the onboarded employee).
2. Selecting a card routes to `/onboarding/organization` or `/onboarding/employee`.

---

## Organization onboarding

**Purpose:** Onboard a **client company** — collect KYC, build the business profile, and capture e-signature on the Master Service Agreement so payroll/EOR can begin. A 7-step wizard grouped into 3 stages, with a progress rail, a contextual "Need help?" panel, and a save-and-exit guard.

**Flow (3 stages · 7 steps):**

- **Stage 1 — KYC**
  1. **Tell us about your organization** — legal name, country of operation, entity type (drives tax routing + contract structure).
  2. **Let's set up your business** — registered business address.
  3. **Billing, tax & ownership** — ownership/UBO verification, tax ID, and billing details.
  4. **Compliance declaration** — AML/CFT, sanctions, and PEP attestations.
- **Stage 2 — Business Profile**
  5. **Your presence in India** — local entity/operating presence details.
  6. **Data & regulation** — sensitive-data categories (PII, health, financial, biometric, minors) and applicable regulators (RBI, SEBI, FCA, SEC, HIPAA, GDPR, PDPA). Sets background-check depth and contract clauses.
- **Stage 3 — Sign MSA**
  7. **Our partnership terms** — review and e-sign the Master Service Agreement.

**Notes:** Step is reflected in the URL (deep-linkable). Each step validates before advancing; "Need help?" opens a step-specific help panel; closing prompts a save-and-exit confirmation.

---

## Employee onboarding

**Purpose:** Add an individual employee under an onboarded client and send them an onboarding invite. A 5-step wizard; on the final step it sends the invite and returns to the index with a confirmation.

**Flow (5 steps):**
1. **Employee details** — name, gender, and personal identity fields. *("This information will ensure they receive the access and onboarding instructions.")*
2. **Employment details** — role, work arrangement (Remote / Hybrid / On-site), and engagement specifics.
3. **Compensation details** — salary and pay structure.
4. **Additional details** — **benefits** (health insurance, ESOP/equity, etc.); either/both/skip — can also be set later from the dashboard.
5. **Engagement model** — confirm the engagement model, then **Send invite**.

**Notes:** Progress is saved to local storage so a return visit resumes where you left off; on submit the saved draft is cleared, an "Invite sent" confirmation shows, and the flow returns to the onboarding index.
