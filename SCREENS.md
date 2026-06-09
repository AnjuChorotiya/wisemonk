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

**Validations:**
- Step 1 — Organization: signatory full name required + must be first & last name (each ≥2 letters); job title (designation) required; legal company name required + ≥2 chars; entity type required; company description required + ≥10 chars; industry required; team size required; country of incorporation required; company website required + valid URL (skipped if "no website" is checked).
- Step 2 — Business address: street address required + ≥5 chars; city required + valid city name; state/province required; postal code required + valid format (3–12 alphanumeric, optional space/hyphen). (Country sourced from step 1; legal company name re-checked.)
- Step 3 — Billing, tax & ownership: billing currency required; billing contact name + email required and validated (skipped if "I'll receive billing comms" is set) — name must be first & last, email must be valid; tax registration number required + valid (≥5 letters/numbers); tax certificate upload required; director name required + first & last name; director/UBO government ID upload required.
- Step 4 — Compliance declaration: all four sanctions/AML declarations must be confirmed; prohibited-industries acknowledgement required.
- Step 5 — India presence: must select an option for whether an India entity exists.
- Step 6 — Data & regulation: at least one sensitive-data type required (or "No sensitive data"); at least one regulatory body required (or "Not regulated").
- Step 7 — Sign MSA: agreement must be sent for signature (msaReviewed) to continue.

**Notes:** Step is reflected in the URL (deep-linkable). Each step validates before advancing; "Need help?" opens a step-specific help panel; closing prompts a save-and-exit confirmation.

---

## Add employee

**Purpose:** Add an individual employee under an onboarded client and send them an onboarding invite. A 5-step wizard (page title: **Add employee**); on the final step it sends the invite and returns to the index with a confirmation.

**Flow (5 steps):**
1. **Employee details** — name, gender, and personal identity fields. *("This information will ensure they receive the access and onboarding instructions.")*
2. **Employment details** — role, work arrangement (Remote / Hybrid / On-site), and engagement specifics.
3. **Compensation details** — salary and pay structure.
4. **Additional details** — **benefits** (health insurance, ESOP/equity, etc.); either/both/skip — can also be set later from the dashboard.
5. **Engagement model** — confirm the engagement model, then **Send invite**.

**Validations:**
- Step 1 — Employee details: employee full name required + must be first & last name; work email required + must be a valid email; phone number required + exactly 10 digits and a valid Indian mobile (starts with 6/7/8/9); gender required.
- Step 2 — Employment details: company required; job title required; seniority required; start date required; work arrangement required; job description required + ≥20 chars; probation duration required; notice period during probation required; notice period post probation required.
- Step 3 — Compensation: currency required; annual salary required, must be a positive number, and at least ₹1,20,000/yr (₹10,000/month minimum-wage floor).
- Step 3 — Compensation (PF): PF strategy required.
- Step 4 — Additional details: health insurance and equipment are optional; but if health insurance = "yes", coverage type is required; if equipment = "yes", equipment type required, equipment link required + valid URL, and cart screenshot upload required.
- Step 5 — Engagement model: engagement-model acknowledgement required.

**Notes:** Progress is saved to local storage so a return visit resumes where you left off; on submit the saved draft is cleared, an "Invite sent" confirmation shows, and the flow returns to the onboarding index.
