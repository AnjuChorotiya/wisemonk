"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Mail,
  MoreHorizontal,
  Newspaper,
  Scale,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

/*
 * Styled with the Wisemonk design system tokens
 * (https://anjuchorotiya.github.io/Client-freelancer/wisemonk-ui/index.html):
 *   primary #2684FF (hover #1A6FE0, light #E8F2FF / #1059BD)
 *   screen bg #F1F8FF · card #FFFFFF · border #EEF0F4 / strong #DDE1E9
 *   text primary #222733 · secondary #363D4D · muted #9AA2B2 · neutral-50 #F7F8FA
 *   success #12B76A (50 #E6F9F0 / 700 #027A48)
 *   warning #F79009 (50 #FFFAEB / 700 #B54708)
 *   danger  #F04438 (50 #FFF1F0 / 700 #B42318)
 */

// ── Storage (must match the onboarding form) ───────────────────────────────
const STORAGE_KEY = "wm_org_draft";

// ── Option label maps (ids → human labels) ─────────────────────────────────
const SANCTIONS_ITEMS = [
  { id: "legit_funds", label: "Funds sourced from legitimate, traceable business activities" },
  { id: "no_sanctions", label: "No directors/UBOs on international sanctions or embargo lists" },
  { id: "aml", label: "Company complies with AML / CFT laws in its jurisdiction" },
  { id: "no_pep", label: "No directors/UBOs are Politically Exposed Persons (PEPs)" },
];
const SENSITIVE_DATA_OPTS = [
  { id: "pii", label: "Personal Identifiable Information (PII)" },
  { id: "health", label: "Health / medical records" },
  { id: "financial", label: "Financial / payment data" },
  { id: "children", label: "Data involving minors" },
  { id: "biometric", label: "Biometric data" },
  { id: "none", label: "No sensitive data involved" },
];
const REGULATORY_OPTS = [
  { id: "rbi", label: "RBI — Reserve Bank of India" },
  { id: "sebi", label: "SEBI — Securities & Exchange Board of India" },
  { id: "fca", label: "FCA — Financial Conduct Authority (UK)" },
  { id: "sec", label: "SEC — Securities & Exchange Commission (US)" },
  { id: "hipaa", label: "HIPAA — US Healthcare" },
  { id: "gdpr", label: "GDPR — EU General Data Protection Regulation" },
  { id: "pdpa", label: "PDPA — Singapore Personal Data Protection Act" },
  { id: "none", label: "Not regulated / no specific regulator" },
];
const INDIA_ENTITY = {
  yes: "Yes — has a legal entity, branch, or liaison office in India",
  no: "No — no legal presence in India",
} as Record<string, string>;

type Draft = Record<string, unknown>;
type Status = "pending" | "approved" | "changes" | "incomplete";

type Submission = {
  id: string;
  submittedAt: string;
  draft: Draft;
  source: "live" | "sample";
};

// ── Row descriptor model (detail view) ──────────────────────────────────────
type RowKind = "text" | "url" | "bool" | "file" | "multi";
type Row = {
  key: string;
  label: string;
  kind: RowKind;
  options?: { id: string; label: string }[];
  trueLabel?: string;
  falseLabel?: string;
  required?: (d: Draft) => boolean;
  value?: (d: Draft) => string | string[] | null;
  hidden?: (d: Draft) => boolean;
};
type Section = { id: string; title: string; rows: Row[] };

const str = (d: Draft, k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
const arr = (d: Draft, k: string) => (Array.isArray(d[k]) ? (d[k] as string[]) : []);
const bool = (d: Draft, k: string) => d[k] === true;

const SECTIONS: Section[] = [
  {
    id: "org",
    title: "Signatory & organization",
    rows: [
      { key: "signatoryName", label: "Authorized signatory", kind: "text", required: () => true },
      { key: "designation", label: "Job title", kind: "text", required: () => true },
      { key: "legalCompanyName", label: "Legal company name", kind: "text", required: () => true },
      { key: "entityType", label: "Entity type", kind: "text", required: () => true },
      { key: "industry", label: "Industry", kind: "text", required: () => true },
      { key: "teamSize", label: "Team size", kind: "text", required: () => true },
      { key: "countryOfIncorporation", label: "Country of incorporation", kind: "text", required: () => true },
      {
        key: "companyWebsite",
        label: "Company website",
        kind: "url",
        required: (d) => !bool(d, "noCompanyWebsite"),
        value: (d) => (bool(d, "noCompanyWebsite") ? "No website (declared)" : str(d, "companyWebsite") || null),
      },
      { key: "companyDescription", label: "Company description", kind: "text", required: () => true },
    ],
  },
  {
    id: "address",
    title: "Registered business address",
    rows: [
      { key: "addressStreet", label: "Street address", kind: "text", required: () => true },
      { key: "addressCity", label: "City", kind: "text", required: () => true },
      { key: "addressState", label: "State / province", kind: "text", required: () => true },
      { key: "addressZip", label: "Postal code", kind: "text", required: () => true },
      { key: "proofFileName", label: "Proof of address", kind: "file" },
    ],
  },
  {
    id: "billing",
    title: "Billing, tax & ownership",
    rows: [
      { key: "billingCurrency", label: "Billing currency", kind: "text", required: () => true },
      {
        key: "billingContactName",
        label: "Billing contact",
        kind: "text",
        required: (d) => !bool(d, "willReceiveBillingComms"),
        value: (d) =>
          bool(d, "willReceiveBillingComms")
            ? "Signatory receives billing communications"
            : str(d, "billingContactName") || null,
      },
      {
        key: "billingContactEmail",
        label: "Billing contact email",
        kind: "text",
        required: (d) => !bool(d, "willReceiveBillingComms"),
        hidden: (d) => bool(d, "willReceiveBillingComms"),
      },
      { key: "taxRegNumber", label: "Tax registration number", kind: "text", required: () => true },
      { key: "taxCertFileName", label: "Tax certificate", kind: "file", required: () => true },
      { key: "directorName", label: "Director / UBO name", kind: "text", required: () => true },
      { key: "govIdFileName", label: "Government ID", kind: "file", required: () => true },
      {
        key: "hasMajorityOwner",
        label: "Beneficial owner ≥ 25%",
        kind: "bool",
        trueLabel: "Declared — UBO holds 25% or more",
        falseLabel: "No single owner holds 25% or more",
      },
    ],
  },
  {
    id: "compliance",
    title: "Compliance declaration",
    rows: [
      { key: "sanctionsChecked", label: "AML / sanctions declarations", kind: "multi", options: SANCTIONS_ITEMS, required: () => true },
      {
        key: "prohibitedIndustriesAck",
        label: "Prohibited industries",
        kind: "bool",
        required: () => true,
        trueLabel: "Acknowledged — not engaged in prohibited activities",
        falseLabel: "Not acknowledged",
      },
    ],
  },
  {
    id: "india",
    title: "Presence in India",
    rows: [
      {
        key: "hasIndiaEntity",
        label: "Entity / office in India",
        kind: "text",
        required: () => true,
        value: (d) => INDIA_ENTITY[str(d, "hasIndiaEntity")] ?? (str(d, "hasIndiaEntity") || null),
      },
    ],
  },
  {
    id: "data",
    title: "Data & regulation",
    rows: [
      { key: "sensitiveDataTypes", label: "Sensitive data handled", kind: "multi", options: SENSITIVE_DATA_OPTS, required: () => true },
      { key: "regulatoryBodies", label: "Regulatory oversight", kind: "multi", options: REGULATORY_OPTS, required: () => true },
    ],
  },
  {
    id: "agreement",
    title: "Master Service Agreement",
    rows: [
      {
        key: "msaReviewed",
        label: "Agreement status",
        kind: "bool",
        required: () => true,
        trueLabel: "Sent for signature",
        falseLabel: "Not yet sent",
      },
    ],
  },
];

// Flat key → label lookup (used by the email composer to name flagged fields).
const ROW_LABELS: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const s of SECTIONS) for (const r of s.rows) m[r.key] = r.label;
  return m;
})();

// ── Sample submissions (fill the table like the reference screen) ───────────
const SAMPLE_ACME: Draft = {
  signatoryName: "Jordan Mehta", designation: "CFO", legalCompanyName: "Acme Corp",
  entityType: "Private Limited Company", industry: "Technology / SaaS", teamSize: "51–200",
  countryOfIncorporation: "United States", companyWebsite: "https://acme.com", noCompanyWebsite: false,
  companyDescription: "A leading technology company providing SaaS solutions.",
  addressStreet: "500 Market Street, Suite 1200", addressCity: "San Francisco", addressState: "California",
  addressZip: "94105", proofFileName: "utility-bill-mar-2026.pdf", billingCurrency: "USD",
  willReceiveBillingComms: false, billingContactName: "Priya Nair", billingContactEmail: "billing@acme.com",
  taxRegNumber: "US-EIN-84-3920175", taxCertFileName: "acme-tax-certificate.pdf",
  directorName: "Jordan Mehta", govIdFileName: "director-passport.pdf", hasMajorityOwner: true,
  sanctionsChecked: ["legit_funds", "no_sanctions", "aml", "no_pep"], prohibitedIndustriesAck: true,
  hasIndiaEntity: "no", sensitiveDataTypes: ["pii", "financial"], regulatoryBodies: ["sec", "gdpr"], msaReviewed: true,
};
const SAMPLE_NIMBUS: Draft = {
  signatoryName: "Lena Fischer", designation: "Managing Director", legalCompanyName: "Nimbus Labs GmbH",
  entityType: "Private Limited Company", industry: "Healthcare / Biotech", teamSize: "11–50",
  countryOfIncorporation: "Germany", companyWebsite: "https://nimbuslabs.de", noCompanyWebsite: false,
  companyDescription: "Cloud infrastructure tooling for regulated healthcare providers.",
  addressStreet: "Friedrichstraße 88", addressCity: "Berlin", addressState: "Berlin",
  addressZip: "10117", proofFileName: "nimbus-lease.pdf", billingCurrency: "EUR",
  willReceiveBillingComms: true, billingContactName: "", billingContactEmail: "lena.fischer@nimbuslabs.de",
  taxRegNumber: "DE-VAT-811569869", taxCertFileName: "nimbus-vat-cert.pdf",
  directorName: "Lena Fischer", govIdFileName: "fischer-id.pdf", hasMajorityOwner: true,
  sanctionsChecked: ["legit_funds", "no_sanctions", "aml", "no_pep"], prohibitedIndustriesAck: true,
  hasIndiaEntity: "no", sensitiveDataTypes: ["pii", "health"], regulatoryBodies: ["gdpr", "hipaa"], msaReviewed: true,
};
const SAMPLE_ORBIT: Draft = {
  signatoryName: "Rohan Gupta", designation: "Director", legalCompanyName: "Orbit Pvt Ltd",
  entityType: "Private Limited Company", industry: "Fintech", teamSize: "1–10",
  countryOfIncorporation: "India", companyWebsite: "", noCompanyWebsite: false,
  companyDescription: "Payments orchestration for Indian SMEs.",
  addressStreet: "MG Road", addressCity: "Bengaluru", addressState: "Karnataka",
  addressZip: "560001", proofFileName: "", billingCurrency: "INR",
  willReceiveBillingComms: false, billingContactName: "", billingContactEmail: "rohan.gupta@orbit.in",
  taxRegNumber: "", taxCertFileName: "", directorName: "Rohan Gupta", govIdFileName: "",
  hasMajorityOwner: true, sanctionsChecked: ["legit_funds", "aml"], prohibitedIndustriesAck: false,
  hasIndiaEntity: "yes", sensitiveDataTypes: ["financial"], regulatoryBodies: ["rbi"], msaReviewed: false,
};

const SAMPLE_SUBMISSIONS: Submission[] = [
  { id: "s-acme", submittedAt: "Jun 08, 2026", draft: SAMPLE_ACME, source: "sample" },
  { id: "s-nimbus", submittedAt: "Jun 05, 2026", draft: SAMPLE_NIMBUS, source: "sample" },
  { id: "s-orbit", submittedAt: "Jun 02, 2026", draft: SAMPLE_ORBIT, source: "sample" },
];

// ── AI due-diligence report model + sample data ─────────────────────────────
// Structure mirrors the CDD/KYC investigation output: identity & registry,
// six-layer screening checks with confidence + dated sources, per-person
// findings, connected entities, and a Proceed/Enhanced-DD/Escalate/Decline verdict.
type AiTone = "clear" | "warn" | "flag";
type AiConfidence = "Confirmed" | "Possible match" | "Inconclusive" | "No match";
type AiSource = { label: string; note?: string; date?: string; unverified?: boolean };
type AiCheck = {
  id: string;
  label: string;
  status: string;
  tone: AiTone;
  confidence?: AiConfidence;
  detail?: string;
  sources: AiSource[];
};
type AiIdentity = {
  legalName: string;
  regNumber: string;
  status: string;
  incorporated: string;
  address: string;
  verified: boolean;
};
type AiFinding = { area: string; result: string; tone: AiTone; confidence: AiConfidence };
type AiSubject = {
  initials: string;
  name: string;
  role: string;
  status: string;
  tone: AiTone;
  findings: AiFinding[];
};
type AiConnected = { name: string; relation: string; note: string; tone: AiTone };
type AiVerdict = "Proceed" | "Proceed with Enhanced DD" | "Escalate" | "Decline";
type AiReport = {
  risk: "Low" | "Medium" | "High";
  screenedOn: string;
  summary: string;
  identity: AiIdentity;
  checks: AiCheck[];
  subjects: AiSubject[];
  connected: AiConnected[];
  verdict: AiVerdict;
  recommendation: string;
};

const AI_REPORTS: Record<string, AiReport> = {
  "s-acme": {
    risk: "Low",
    screenedOn: "08 Jun 2026",
    summary:
      "Acme Corp Inc. is an active Delaware C-corp incorporated 2014, verified in the Secretary of State registry. No sanctions, watchlist or PEP matches across primary lists. Court and insolvency records are clean and statutory filings are current. Payment-reliability read is strong — no non-payment or distress signals. Recommend proceeding under standard due diligence.",
    identity: {
      legalName: "Acme Corp Inc.",
      regNumber: "EIN 84-3920175 · File 4827193",
      status: "Active · good standing",
      incorporated: "12 Mar 2014 · Delaware, US",
      address: "1209 Orange St, Wilmington, DE 19801",
      verified: true,
    },
    checks: [
      {
        id: "sanctions",
        label: "Sanctions & watchlists",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        detail: "Entity and officers screened against all primary regimes.",
        sources: [
          { label: "OFAC SDN", note: "no match", date: "08 Jun 2026" },
          { label: "UN Consolidated", note: "no match", date: "08 Jun 2026" },
          { label: "EU Consolidated", note: "no match", date: "08 Jun 2026" },
          { label: "BIS Entity List", note: "no match", date: "08 Jun 2026" },
        ],
      },
      {
        id: "pep",
        label: "PEP & close associates",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [{ label: "Dow Jones PEP", note: "no match", date: "08 Jun 2026" }],
      },
      {
        id: "litigation",
        label: "Litigation & financial risk",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        detail: "No pending suits, judgments, liens or insolvency. Filings current.",
        sources: [
          { label: "PACER / CourtListener", note: "no active cases", date: "08 Jun 2026" },
          { label: "Delaware SoS", note: "good standing", date: "08 Jun 2026" },
        ],
      },
      {
        id: "adverse",
        label: "Adverse media & reputation",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        sources: [
          { label: "Google News", note: "no negative coverage", date: "08 Jun 2026" },
          { label: "Glassdoor / Trustpilot", note: "positive, no wage signals", date: "08 Jun 2026" },
        ],
      },
      {
        id: "connected",
        label: "Connected entities",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        sources: [{ label: "OpenCorporates", note: "officer & group links clean", date: "08 Jun 2026" }],
      },
    ],
    subjects: [
      {
        initials: "JM",
        name: "Jordan Mehta",
        role: "CFO · Director · UBO 100%",
        status: "Clear",
        tone: "clear",
        findings: [
          { area: "Sanctions", result: "No match", tone: "clear", confidence: "No match" },
          { area: "PEP", result: "Not a PEP", tone: "clear", confidence: "No match" },
          { area: "Litigation", result: "No records", tone: "clear", confidence: "Confirmed" },
          { area: "Adverse media", result: "Nothing adverse", tone: "clear", confidence: "Confirmed" },
        ],
      },
    ],
    connected: [],
    verdict: "Proceed",
    recommendation:
      "Proceed under standard due diligence. Identity, sanctions, litigation and reputation are all clear; no further checks required before onboarding.",
  },
  "s-nimbus": {
    risk: "Low",
    screenedOn: "05 Jun 2026",
    summary:
      "Nimbus Health GmbH is an active Berlin GmbH registered 2018, confirmed in the Handelsregister. No sanctions or PEP matches; court and insolvency records clean. One unverified employee-review lead on workload — not corroborated, does not move the rating. Operates in regulated healthcare. Proceed with enhanced DD limited to confirming a GDPR data-processing agreement.",
    identity: {
      legalName: "Nimbus Health GmbH",
      regNumber: "HRB 188204 B",
      status: "Active · eingetragen",
      incorporated: "2018 · Berlin, DE",
      address: "Friedrichstraße 68, 10117 Berlin",
      verified: true,
    },
    checks: [
      {
        id: "sanctions",
        label: "Sanctions & watchlists",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [
          { label: "EU Consolidated", note: "no match", date: "05 Jun 2026" },
          { label: "OFAC SDN", note: "no match", date: "05 Jun 2026" },
          { label: "UN Consolidated", note: "no match", date: "05 Jun 2026" },
        ],
      },
      {
        id: "pep",
        label: "PEP & close associates",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [{ label: "Dow Jones PEP", note: "no match", date: "05 Jun 2026" }],
      },
      {
        id: "litigation",
        label: "Litigation & financial risk",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        detail: "Handelsregister filings current · no insolvency notices.",
        sources: [
          { label: "Handelsregister", note: "good standing", date: "05 Jun 2026" },
          { label: "Bundesanzeiger", note: "no insolvency notices", date: "05 Jun 2026" },
        ],
      },
      {
        id: "adverse",
        label: "Adverse media & reputation",
        status: "1 unverified lead",
        tone: "warn",
        confidence: "Inconclusive",
        detail: "Kununu reviews mention workload — uncorroborated, treated as a lead only.",
        sources: [
          { label: "Kununu", note: "workload mentions", date: "Apr 2026", unverified: true },
          { label: "Google News", note: "no negative coverage", date: "05 Jun 2026" },
        ],
      },
      {
        id: "connected",
        label: "Connected entities",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        sources: [{ label: "OpenCorporates", note: "group links clean", date: "05 Jun 2026" }],
      },
    ],
    subjects: [
      {
        initials: "LF",
        name: "Lena Fischer",
        role: "Managing Director · UBO 100%",
        status: "Clear",
        tone: "clear",
        findings: [
          { area: "Sanctions", result: "No match", tone: "clear", confidence: "No match" },
          { area: "PEP", result: "Not a PEP", tone: "clear", confidence: "No match" },
          { area: "Litigation", result: "No records", tone: "clear", confidence: "Confirmed" },
          { area: "Adverse media", result: "Nothing adverse", tone: "clear", confidence: "Confirmed" },
        ],
      },
    ],
    connected: [],
    verdict: "Proceed with Enhanced DD",
    recommendation:
      "Proceed with light enhanced DD. All hard checks are clean; the only open item is the unverified Kununu lead. Confirm a GDPR data-processing agreement at onboarding given the healthcare data context.",
  },
  "s-orbit": {
    risk: "High",
    screenedOn: "02 Jun 2026",
    summary:
      "Orbit Fintech Pvt Ltd is an active Bengaluru private limited incorporated 2021, confirmed on MCA21. No sanctions match, but a possible PEP namesake needs manual clearing. Statutory filings are pending, KYC documents are missing, and the prohibited-industries declaration is unacknowledged. A shared director links to a second entity. RBI oversight applies. Payment-reliability read is weak pending evidence — escalate before any onboarding decision.",
    identity: {
      legalName: "Orbit Fintech Pvt Ltd",
      regNumber: "CIN U65999KA2021PTC048210",
      status: "Active · filings pending",
      incorporated: "2021 · Bengaluru, Karnataka, IN",
      address: "WeWork Prestige Atlanta, Koramangala, Bengaluru",
      verified: true,
    },
    checks: [
      {
        id: "sanctions",
        label: "Sanctions & watchlists",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [
          { label: "OFAC SDN", note: "no match", date: "02 Jun 2026" },
          { label: "UN Consolidated", note: "no match", date: "02 Jun 2026" },
        ],
      },
      {
        id: "pep",
        label: "PEP & close associates",
        status: "Possible match — review",
        tone: "warn",
        confidence: "Possible match",
        detail: "Weak namesake on director; not disambiguated by DOB. Manual review required before clearing.",
        sources: [{ label: "Dow Jones PEP", note: "weak namesake", date: "02 Jun 2026", unverified: true }],
      },
      {
        id: "litigation",
        label: "Litigation & financial risk",
        status: "2 flags",
        tone: "flag",
        confidence: "Confirmed",
        detail: "ROC filings overdue and KYC pack incomplete (missing tax certificate). No insolvency on record.",
        sources: [
          { label: "MCA21 / ROC", note: "filings pending", date: "02 Jun 2026" },
          { label: "NCLT / NCLAT", note: "no insolvency", date: "02 Jun 2026" },
          { label: "India eCourts", note: "no active cases found", date: "02 Jun 2026" },
        ],
      },
      {
        id: "adverse",
        label: "Adverse media & reputation",
        status: "1 unverified lead",
        tone: "warn",
        confidence: "Inconclusive",
        detail: "Industry-forum mentions of payout delays — uncorroborated, treated as a lead only.",
        sources: [{ label: "Google News / forums", note: "payout-delay mentions", date: "May 2026", unverified: true }],
      },
      {
        id: "connected",
        label: "Connected entities",
        status: "Review",
        tone: "warn",
        confidence: "Possible match",
        detail: "Director appears on a second active entity — relationship not yet mapped.",
        sources: [{ label: "OpenCorporates", note: "shared director across 2 entities", date: "02 Jun 2026", unverified: true }],
      },
    ],
    subjects: [
      {
        initials: "RG",
        name: "Rohan Gupta",
        role: "Director · UBO 100%",
        status: "Review",
        tone: "warn",
        findings: [
          { area: "Sanctions", result: "No match", tone: "clear", confidence: "No match" },
          { area: "PEP", result: "Weak namesake — review", tone: "warn", confidence: "Possible match" },
          { area: "Litigation", result: "No personal records", tone: "clear", confidence: "Inconclusive" },
          { area: "Adverse media", result: "Payout-delay leads", tone: "warn", confidence: "Inconclusive" },
          { area: "Corporate", result: "Director of 2nd entity", tone: "warn", confidence: "Possible match" },
        ],
      },
    ],
    connected: [
      {
        name: "Orbit Pay Solutions LLP",
        relation: "Shared director (R. Gupta)",
        note: "Active LLP — relationship and payment flows not yet mapped.",
        tone: "warn",
      },
    ],
    verdict: "Escalate",
    recommendation:
      "Escalate before onboarding. Manually clear the possible PEP namesake, obtain the missing tax certificate and overdue ROC filings, resolve the prohibited-industries declaration, and map the connected LLP. Do not proceed until payment-reliability evidence is satisfactory.",
  },
};

function initialsOf(name: string): string {
  return (name || "—")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function aiReportFor(sub: Submission): AiReport {
  const preset = AI_REPORTS[sub.id];
  if (preset) return preset;
  // Generic report for live / unknown submissions, derived from KYC completeness.
  const d = sub.draft;
  const miss = missingCount(d);
  const company = str(d, "legalCompanyName") || "this entity";
  const country = str(d, "countryOfIncorporation") || "country n/a";
  const director = str(d, "directorName") || "Director on file";
  const litTone: AiTone = miss > 0 ? "warn" : "clear";
  return {
    risk: miss > 0 ? "Medium" : "Low",
    screenedOn: "Today",
    summary: `Automated screening of ${company} (${country}). Identity confirmed against the company registry. No sanctions or PEP matches on primary lists.${
      miss > 0
        ? ` ${miss} required KYC field${miss > 1 ? "s are" : " is"} still missing — complete the pack before a final decision.`
        : " KYC pack appears complete; no adverse signals detected."
    }`,
    identity: {
      legalName: company,
      regNumber: str(d, "taxRegNumber") || "Not provided",
      status: "Active (per submission)",
      incorporated: country,
      address: str(d, "registeredAddress") || "Not provided",
      verified: !!str(d, "taxRegNumber"),
    },
    checks: [
      {
        id: "sanctions",
        label: "Sanctions & watchlists",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [
          { label: "OFAC SDN", note: "no match", date: "Today" },
          { label: "UN Consolidated", note: "no match", date: "Today" },
        ],
      },
      {
        id: "pep",
        label: "PEP & close associates",
        status: "No match",
        tone: "clear",
        confidence: "No match",
        sources: [{ label: "Dow Jones PEP", note: "no match", date: "Today" }],
      },
      {
        id: "litigation",
        label: "Litigation & financial risk",
        status: miss > 0 ? `${miss} flag${miss > 1 ? "s" : ""}` : "None adverse",
        tone: litTone,
        confidence: miss > 0 ? "Inconclusive" : "Confirmed",
        detail: miss > 0 ? `${miss} required field${miss > 1 ? "s" : ""} missing from KYC pack` : undefined,
        sources: [{ label: "Company registry", note: "filing history", date: "Today" }],
      },
      {
        id: "adverse",
        label: "Adverse media & reputation",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        sources: [{ label: "Google News", note: "no negative coverage", date: "Today" }],
      },
      {
        id: "connected",
        label: "Connected entities",
        status: "None adverse",
        tone: "clear",
        confidence: "Confirmed",
        sources: [{ label: "OpenCorporates", note: "group links clean", date: "Today" }],
      },
    ],
    subjects: [
      {
        initials: initialsOf(director),
        name: director,
        role: "Director / UBO",
        status: miss > 0 ? "Review" : "Clear",
        tone: litTone,
        findings: [
          { area: "Sanctions", result: "No match", tone: "clear", confidence: "No match" },
          { area: "PEP", result: "Not a PEP", tone: "clear", confidence: "No match" },
          {
            area: "Litigation",
            result: miss > 0 ? "Pending KYC" : "No records",
            tone: litTone,
            confidence: miss > 0 ? "Inconclusive" : "Confirmed",
          },
          { area: "Adverse media", result: "Nothing adverse", tone: "clear", confidence: "Confirmed" },
        ],
      },
    ],
    connected: [],
    verdict: miss > 0 ? "Proceed with Enhanced DD" : "Proceed",
    recommendation:
      miss > 0
        ? "Complete the outstanding KYC fields, then re-run screening before a final onboarding decision."
        : "No adverse signals detected. Proceed under standard due diligence.",
  };
}

// ── Field status helpers ────────────────────────────────────────────────────
function rowIsFilled(row: Row, d: Draft): boolean {
  if (row.value) {
    const v = row.value(d);
    return Array.isArray(v) ? v.length > 0 : !!v;
  }
  switch (row.kind) {
    case "multi": {
      const a = arr(d, row.key);
      if (row.key === "sanctionsChecked") return a.length === SANCTIONS_ITEMS.length;
      return a.length > 0;
    }
    case "bool":
      return d[row.key] === true;
    default:
      return !!str(d, row.key);
  }
}
function rowIsMissing(row: Row, d: Draft): boolean {
  if (row.hidden?.(d)) return false;
  if (!row.required?.(d)) return false;
  return !rowIsFilled(row, d);
}
function missingCount(d: Draft): number {
  let n = 0;
  for (const s of SECTIONS) for (const r of s.rows) if (rowIsMissing(r, d)) n += 1;
  return n;
}
function requiredCount(d: Draft): number {
  let n = 0;
  for (const s of SECTIONS) for (const r of s.rows) if (!r.hidden?.(d) && r.required?.(d)) n += 1;
  return n;
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>(SAMPLE_SUBMISSIONS);
  const [decisions, setDecisions] = useState<Record<string, "approved" | "changes">>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = () => {
    let live: Submission[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && (str(d, "legalCompanyName") || str(d, "signatoryName"))) {
          live = [{ id: "live", submittedAt: "Today", draft: d, source: "live" }];
        }
      }
    } catch {
      /* ignore */
    }
    setSubmissions([...live, ...SAMPLE_SUBMISSIONS]);
  };
  useEffect(() => {
    load();
  }, []);

  const statusOf = (sub: Submission): Status => {
    if (decisions[sub.id] === "approved") return "approved";
    if (decisions[sub.id] === "changes") return "changes";
    return missingCount(sub.draft) > 0 ? "incomplete" : "pending";
  };

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-h-screen bg-[#F1F8FF] text-[#222733]">
      <Sidebar onLogo={() => setSelectedId(null)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title="Onboarding" />
        <div className="flex-1 p-6">
          {selected ? (
            <DetailView
              sub={selected}
              status={statusOf(selected)}
              onBack={() => setSelectedId(null)}
              decision={decisions[selected.id] ?? null}
              onDecide={(d) => setDecisions((prev) => ({ ...prev, [selected.id]: d }))}
              onClearDecision={() =>
                setDecisions((prev) => {
                  const next = { ...prev };
                  delete next[selected.id];
                  return next;
                })
              }
            />
          ) : (
            <ListView submissions={submissions} statusOf={statusOf} onOpen={(id) => setSelectedId(id)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shell: Sidebar ──────────────────────────────────────────────────────────
function Sidebar({ onLogo }: { onLogo: () => void }) {
  const items = [{ label: "Verification", icon: ShieldCheck, active: true }];
  return (
    <aside className="hidden w-[208px] shrink-0 flex-col border-r border-[#EEF0F4] bg-white px-3 py-5 md:flex">
      <button onClick={onLogo} className="mb-6 flex items-center px-2">
        <Image
          src="/wisemonk/wisemonk-logo.png"
          alt="Wisemonk"
          width={307}
          height={65}
          priority
          className="block h-[26px] w-auto object-contain"
        />
      </button>
      <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-[#9AA2B2]">Workspace</p>
      <nav className="flex flex-col gap-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <a
              key={it.label}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                it.active ? "bg-[#E8F2FF] text-[#1059BD]" : "text-[#363D4D] hover:bg-[#F7F8FA]"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {it.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

// ── Shell: TopBar ─────────────────────────────────────────────────────────
function TopBar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <h1 className="text-xl font-bold text-[#222733]">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-[10px] border border-[#EEF0F4] bg-white px-3 py-2 text-sm sm:flex">
          <Search className="h-4 w-4 text-[#9AA2B2]" />
          <span className="text-[#9AA2B2]">Quick actions</span>
          <kbd className="ml-6 rounded-[6px] border border-[#EEF0F4] bg-[#F7F8FA] px-1.5 py-0.5 text-[11px] font-medium text-[#9AA2B2]">
            Ctrl K
          </kbd>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#363D4D] transition hover:bg-white">
          <Bell className="h-5 w-5" />
        </button>
        <button className="flex items-center gap-2 rounded-full border border-[#EEF0F4] bg-white py-1 pl-1 pr-2.5 transition hover:bg-[#F7F8FA]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2684FF] text-xs font-bold text-white">
            AS
          </span>
          <span className="text-sm font-bold text-[#222733]">Aman Singh</span>
          <ChevronDown className="h-4 w-4 text-[#9AA2B2]" />
        </button>
      </div>
    </header>
  );
}

// ── List view ───────────────────────────────────────────────────────────────
function ListView({
  submissions,
  statusOf,
  onOpen,
}: {
  submissions: Submission[];
  statusOf: (s: Submission) => Status;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [riskFilter, setRiskFilter] = useState<"all" | "Low" | "Medium" | "High">("all");
  const [reportSub, setReportSub] = useState<Submission | null>(null);

  // Roll up status + AI risk + completeness for every client once.
  const rows = submissions.map((s) => ({
    sub: s,
    status: statusOf(s),
    report: aiReportFor(s),
    miss: missingCount(s.draft),
    req: requiredCount(s.draft),
  }));

  const filtered = rows.filter((r) => {
    const matchesQuery =
      !query.trim() ||
      str(r.sub.draft, "legalCompanyName").toLowerCase().includes(query.toLowerCase()) ||
      str(r.sub.draft, "signatoryName").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesRisk = riskFilter === "all" || r.report.risk === riskFilter;
    return matchesQuery && matchesStatus && matchesRisk;
  });

  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending" || r.status === "incomplete").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const highRisk = rows.filter((r) => r.report.risk === "High").length;
  const incomplete = rows.filter((r) => r.miss > 0).length;

  const lowCount = rows.filter((r) => r.report.risk === "Low").length;
  const medCount = rows.filter((r) => r.report.risk === "Medium").length;

  // Priority queue: anything not yet verified that carries risk or missing data.
  const riskRank = { High: 0, Medium: 1, Low: 2 } as const;
  const attention = rows
    .filter((r) => r.status !== "approved" && (r.report.risk !== "Low" || r.miss > 0))
    .sort((a, b) => riskRank[a.report.risk] - riskRank[b.report.risk] || b.miss - a.miss)
    .slice(0, 4);

  const riskTone = (risk: "Low" | "Medium" | "High") =>
    risk === "Low"
      ? { dot: "bg-[#12B76A]", text: "text-[#027A48]" }
      : risk === "Medium"
        ? { dot: "bg-[#F79009]", text: "text-[#B54708]" }
        : { dot: "bg-[#F04438]", text: "text-[#B42318]" };

  const riskTotal = Math.max(lowCount + medCount + highRisk, 1);

  return (
    <div className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#222733]">Verification dashboard</h2>
          <p className="mt-1 text-sm text-[#9AA2B2]">Client onboarding, KYC completeness and AI due-diligence risk at a glance.</p>
        </div>
      </div>

      {/* Metric cards — click to filter the table below */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total clients"
          value={total}
          sublabel="organizations onboarding"
          active={statusFilter === "all" && riskFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            setRiskFilter("all");
          }}
        />
        <StatCard
          label="Pending review"
          value={pending}
          sublabel="awaiting verification"
          accent="warning"
          active={statusFilter === "pending"}
          onClick={() => {
            setStatusFilter(statusFilter === "pending" ? "all" : "pending");
            setRiskFilter("all");
          }}
        />
        <StatCard
          label="Verified"
          value={approved}
          sublabel="verified & active"
          accent="success"
          active={statusFilter === "approved"}
          onClick={() => {
            setStatusFilter(statusFilter === "approved" ? "all" : "approved");
            setRiskFilter("all");
          }}
        />
        <StatCard
          label="High risk"
          value={highRisk}
          sublabel="flagged by AI screening"
          accent="danger"
          active={riskFilter === "High"}
          onClick={() => {
            setRiskFilter(riskFilter === "High" ? "all" : "High");
            setStatusFilter("all");
          }}
        />
        <StatCard
          label="Incomplete KYC"
          value={incomplete}
          sublabel="missing required fields"
          accent="danger"
          active={statusFilter === "incomplete"}
          onClick={() => {
            setStatusFilter(statusFilter === "incomplete" ? "all" : "incomplete");
            setRiskFilter("all");
          }}
        />
      </div>

      {/* AI risk distribution + Needs-attention queue */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Risk distribution */}
        <div className="rounded-[14px] border border-[#EEF0F4] bg-white p-5">
          <p className="text-sm font-bold text-[#222733]">AI risk distribution</p>
          <p className="mt-1 text-xs text-[#9AA2B2]">Across {total} screened {total === 1 ? "client" : "clients"}</p>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[#F1F8FF]">
            <div className="h-full bg-[#12B76A]" style={{ width: `${(lowCount / riskTotal) * 100}%` }} />
            <div className="h-full bg-[#F79009]" style={{ width: `${(medCount / riskTotal) * 100}%` }} />
            <div className="h-full bg-[#F04438]" style={{ width: `${(highRisk / riskTotal) * 100}%` }} />
          </div>
          <div className="mt-4 space-y-2">
            {([
              { label: "Low", count: lowCount, filter: "Low" as const },
              { label: "Medium", count: medCount, filter: "Medium" as const },
              { label: "High", count: highRisk, filter: "High" as const },
            ]).map((row) => {
              const t = riskTone(row.filter);
              return (
                <button
                  key={row.label}
                  onClick={() => setRiskFilter(riskFilter === row.filter ? "all" : row.filter)}
                  className={`flex w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-sm transition hover:bg-[#F7F8FA] ${
                    riskFilter === row.filter ? "bg-[#F7F8FA]" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                    <span className="font-medium text-[#363D4D]">{row.label} risk</span>
                  </span>
                  <span className={`font-bold ${t.text}`}>{row.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Needs attention queue */}
        <div className="rounded-[14px] border border-[#EEF0F4] bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#222733]">Needs attention</p>
            <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-xs font-bold text-[#B42318]">
              {attention.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#9AA2B2]">Unverified clients with elevated risk or missing KYC data</p>
          {attention.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-[#E6F9F0] px-3 py-3 text-sm font-medium text-[#027A48]">
              <CheckCircle2 className="h-4 w-4" /> Nothing needs attention — all clients are clear.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[#EEF0F4]">
              {attention.map((r) => {
                const t = riskTone(r.report.risk);
                return (
                  <li key={r.sub.id} className="flex items-center justify-between gap-3 py-2.5">
                    <button
                      onClick={() => onOpen(r.sub.id)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[#222733]">
                          {str(r.sub.draft, "legalCompanyName") || "Unnamed company"}
                        </span>
                        <span className="block truncate text-xs text-[#9AA2B2]">
                          <span className={`font-medium ${t.text}`}>{r.report.risk} risk</span>
                          {r.miss > 0 && <> · {r.miss} field{r.miss === 1 ? "" : "s"} missing</>}
                          {" · "}{r.report.verdict}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => setReportSub(r.sub)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#EEF0F4] px-2.5 text-xs font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
                      >
                        Report
                      </button>
                      <button
                        onClick={() => onOpen(r.sub.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#2684FF] px-2.5 text-xs font-bold text-white transition hover:bg-[#1A6FE0]"
                      >
                        Review
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Table section */}
      <h3 className="mt-7 text-sm font-bold text-[#222733]">Onboarding submissions</h3>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA2B2]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-[10px] border border-[#EEF0F4] pl-9 pr-3 text-sm outline-none placeholder:text-[#9AA2B2] focus:border-[#2684FF]"
          />
        </div>
        <div className="flex items-center gap-2">
          <RiskFilter value={riskFilter} onChange={setRiskFilter} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-y border-[#EEF0F4] bg-[#F7F8FA] text-xs text-[#9AA2B2]">
              <Th>Company</Th>
              <Th>Country</Th>
              <Th>Submitted</Th>
              <Th>Required fields</Th>
              <Th>AI report</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#9AA2B2]">
                  No submissions match your filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const s = r.sub;
              const d = s.draft;
              const req = r.req;
              const miss = r.miss;
              return (
                <tr
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className="cursor-pointer border-b border-[#EEF0F4] transition hover:bg-[#F7F8FA]"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-[#222733]">
                      {str(d, "legalCompanyName") || "Unnamed company"}
                      {s.source === "live" && (
                        <span className="rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[10px] font-bold text-[#1059BD]">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9AA2B2]">
                      {str(d, "billingContactEmail") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#363D4D]">
                    {str(d, "countryOfIncorporation") || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-[#9AA2B2]">{s.submittedAt}</td>
                  <td className="px-4 py-4 text-sm">
                    {miss === 0 ? (
                      <span className="font-medium text-[#027A48]">{req}/{req} complete</span>
                    ) : (
                      <span className="font-medium text-[#B42318]">{req - miss}/{req} · {miss} missing</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <AiReportCell
                      report={r.report}
                      onOpen={(e) => {
                        e.stopPropagation();
                        setReportSub(s);
                      }}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={statusOf(s)} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(s.id);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#EEF0F4] hover:text-[#222733]"
                      aria-label="View submission"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reportSub && <AiReportPanel sub={reportSub} onClose={() => setReportSub(null)} />}
    </div>
  );
}

// Compact risk pill + "View report" trigger inside the table row.
function AiReportCell({
  report,
  onOpen,
}: {
  report: AiReport;
  onOpen: (e: React.MouseEvent) => void;
}) {
  const tone =
    report.risk === "Low"
      ? { dot: "bg-[#12B76A]", text: "text-[#027A48]", bg: "bg-[#E6F9F0]", border: "border-[#A6F4C5]" }
      : report.risk === "Medium"
        ? { dot: "bg-[#F79009]", text: "text-[#B54708]", bg: "bg-[#FFFAEB]", border: "border-[#FEC84B]" }
        : { dot: "bg-[#F04438]", text: "text-[#B42318]", bg: "bg-[#FFF1F0]", border: "border-[#FECDCA]" };
  return (
    <button
      onClick={onOpen}
      className={`inline-flex items-center gap-2 rounded-full border ${tone.border} ${tone.bg} px-3 py-1 text-xs font-bold ${tone.text} transition hover:brightness-[0.97]`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {report.risk} risk
    </button>
  );
}

// Inline AI findings summary shown on the verification detail view.
function AiFindingsCard({ report, onOpen }: { report: AiReport; onOpen: () => void }) {
  return (
    <section className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#2684FF]">AI due-diligence findings</p>
        </div>
        <button
          onClick={onOpen}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2684FF] px-3.5 text-sm font-bold text-[#1059BD] transition hover:bg-[#E8F2FF]"
        >
          View full report <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#363D4D]">{report.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {report.checks.map((c) => (
          <span
            key={c.id}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneBg(c.tone)} ${toneText(c.tone)}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotFor(c.tone)}`} />
            {c.label}: {c.status}
          </span>
        ))}
      </div>
    </section>
  );
}

// Right-side slide-in drawer showing the full AI due-diligence report.
function AiReportPanel({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const r = aiReportFor(sub);
  const d = sub.draft;
  const company = str(d, "legalCompanyName") || "Unnamed company";
  const country = str(d, "countryOfIncorporation") || "—";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const riskTone =
    r.risk === "Low"
      ? { text: "text-[#027A48]", bg: "bg-[#E6F9F0]", border: "border-[#A6F4C5]" }
      : r.risk === "Medium"
        ? { text: "text-[#B54708]", bg: "bg-[#FFFAEB]", border: "border-[#FEC84B]" }
        : { text: "text-[#B42318]", bg: "bg-[#FFF1F0]", border: "border-[#FECDCA]" };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#222733]/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF0F4] px-6 py-5">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-[#2684FF]">AI due-diligence report</div>
            <h3 className="mt-1.5 truncate text-xl font-bold text-[#222733]">{company}</h3>
            <div className="mt-1 text-xs text-[#9AA2B2]">{country}</div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#EEF0F4] hover:text-[#222733]"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Risk + executive summary */}
          <div className={`rounded-[14px] border ${riskTone.border} ${riskTone.bg} p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Overall risk</span>
              <span className={`rounded-full border ${riskTone.border} bg-white px-3 py-1 text-xs font-bold ${riskTone.text}`}>
                {r.risk} risk
              </span>
            </div>
            <p className={`mt-2.5 text-sm leading-relaxed ${riskTone.text}`}>{r.summary}</p>
          </div>

          {/* Identity & registry (Layer 1) */}
          <AiSectionTitle>Identity &amp; registry</AiSectionTitle>
          <div className="mt-3 rounded-[12px] border border-[#EEF0F4]">
            <AiIdRow label="Legal name" value={r.identity.legalName} />
            <AiIdRow label="Registration" value={r.identity.regNumber} />
            <AiIdRow label="Status" value={r.identity.status} />
            <AiIdRow label="Incorporated" value={r.identity.incorporated} />
            <AiIdRow label="Registered address" value={r.identity.address} last />
            <div className="flex items-center gap-1.5 border-t border-[#EEF0F4] px-3.5 py-2.5 text-xs font-medium">
              {r.identity.verified ? (
                <span className="inline-flex items-center gap-1 text-[#027A48]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified in official registry
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#B54708]">
                  <AlertTriangle className="h-3.5 w-3.5" /> Registry match not confirmed
                </span>
              )}
            </div>
          </div>

          {/* Entity findings (Layers 2–5) */}
          <AiSectionTitle>Entity findings</AiSectionTitle>
          <div className="mt-3 space-y-3">
            {r.checks.map((c) => (
              <AiCheckCard key={c.id} check={c} />
            ))}
          </div>

          {/* Per-person findings */}
          <AiSectionTitle>Per-person findings</AiSectionTitle>
          <div className="mt-3 space-y-3">
            {r.subjects.map((s, i) => {
              const t =
                s.tone === "clear"
                  ? { text: "text-[#027A48]", bg: "bg-[#E6F9F0]" }
                  : s.tone === "warn"
                    ? { text: "text-[#B54708]", bg: "bg-[#FFFAEB]" }
                    : { text: "text-[#B42318]", bg: "bg-[#FFF1F0]" };
              return (
                <div key={i} className="rounded-[12px] border border-[#EEF0F4] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F2FF] text-xs font-bold text-[#1059BD]">
                      {s.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#222733]">{s.name}</div>
                      <div className="truncate text-xs text-[#9AA2B2]">{s.role}</div>
                    </div>
                    <span className={`rounded-full ${t.bg} px-2.5 py-1 text-xs font-bold ${t.text}`}>{s.status}</span>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-[#EEF0F4] pt-3">
                    {s.findings.map((f, j) => (
                      <div key={j} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-[#9AA2B2]">{f.area}</span>
                        <span className="flex items-center gap-1.5">
                          <span className={toneText(f.tone)}>{f.result}</span>
                          <AiConfidenceBadge confidence={f.confidence} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected entities (Layer 5) */}
          {r.connected.length > 0 && (
            <>
              <AiSectionTitle>Connected entities</AiSectionTitle>
              <div className="mt-3 space-y-2">
                {r.connected.map((c, i) => (
                  <div key={i} className="rounded-[12px] border border-[#EEF0F4] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-bold text-[#222733]">{c.name}</div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${toneText(c.tone)} ${toneBg(c.tone)}`}>
                        {c.relation}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9AA2B2]">{c.note}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recommendation + verdict */}
          <AiSectionTitle>Recommendation</AiSectionTitle>
          <div className={`mt-3 rounded-[14px] border ${riskTone.border} ${riskTone.bg} p-4`}>
            <span className={`inline-flex rounded-full border ${riskTone.border} bg-white px-3 py-1 text-xs font-bold ${riskTone.text}`}>
              {r.verdict}
            </span>
            <p className={`mt-2.5 text-sm leading-relaxed ${riskTone.text}`}>{r.recommendation}</p>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-[#9AA2B2]">
            Screened {r.screenedOn} across public sanctions, PEP, registry, court, insolvency and media sources.
            Confirmed findings are separated from unverified leads (shown italic). Findings are indicative and
            must be confirmed before a final onboarding decision.
          </p>
        </div>
      </div>
    </div>
  );
}

const AI_CHECK_ICONS: Record<string, typeof ShieldCheck> = {
  sanctions: ShieldCheck,
  pep: UserCheck,
  litigation: Scale,
  adverse: Newspaper,
  connected: Share2,
};

function toneText(tone: AiTone): string {
  return tone === "clear" ? "text-[#027A48]" : tone === "warn" ? "text-[#B54708]" : "text-[#B42318]";
}
function toneBg(tone: AiTone): string {
  return tone === "clear" ? "bg-[#E6F9F0]" : tone === "warn" ? "bg-[#FFFAEB]" : "bg-[#FFF1F0]";
}
function dotFor(tone: AiTone): string {
  return tone === "clear" ? "bg-[#12B76A]" : tone === "warn" ? "bg-[#F79009]" : "bg-[#F04438]";
}

function AiSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-6 text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">{children}</h4>;
}

function AiIdRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-3.5 py-2.5 ${last ? "" : "border-b border-[#EEF0F4]"}`}>
      <span className="text-xs text-[#9AA2B2]">{label}</span>
      <span className="text-right text-xs font-medium text-[#222733]">{value}</span>
    </div>
  );
}

function AiConfidenceBadge({ confidence }: { confidence: AiConfidence }) {
  const cls =
    confidence === "Confirmed" || confidence === "No match"
      ? "border-[#A6F4C5] bg-[#E6F9F0] text-[#027A48]"
      : confidence === "Possible match"
        ? "border-[#FEC84B] bg-[#FFFAEB] text-[#B54708]"
        : "border-[#DDE1E9] bg-[#F7F8FA] text-[#9AA2B2]";
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{confidence}</span>
  );
}

function AiCheckCard({ check }: { check: AiCheck }) {
  const Icon = AI_CHECK_ICONS[check.id] || ShieldCheck;
  const tone =
    check.tone === "clear"
      ? { text: "text-[#027A48]", bg: "bg-[#E6F9F0]", icon: "text-[#12B76A]" }
      : check.tone === "warn"
        ? { text: "text-[#B54708]", bg: "bg-[#FFFAEB]", icon: "text-[#F79009]" }
        : { text: "text-[#B42318]", bg: "bg-[#FFF1F0]", icon: "text-[#F04438]" };
  return (
    <div className="rounded-[12px] border border-[#EEF0F4] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${tone.bg}`}>
            <Icon className={`h-4 w-4 ${tone.icon}`} />
          </span>
          <div>
            <div className="text-sm font-bold text-[#222733]">{check.label}</div>
            {check.detail && <div className="mt-0.5 text-xs leading-relaxed text-[#9AA2B2]">{check.detail}</div>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full ${tone.bg} px-2.5 py-1 text-xs font-bold ${tone.text}`}>{check.status}</span>
          {check.confidence && <AiConfidenceBadge confidence={check.confidence} />}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-9">
        {check.sources.map((src, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
              src.unverified
                ? "border-dashed border-[#FEC84B] bg-[#FFFAEB] italic text-[#B54708]"
                : "border-[#EEF0F4] bg-[#F7F8FA] text-[#363D4D]"
            }`}
          >
            {src.label}
            {src.note && <span className="text-[#9AA2B2]">· {src.note}</span>}
            {src.date && <span className="text-[#9AA2B2]">· {src.date}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function StatCard({
  label,
  value,
  sublabel,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  sublabel: string;
  accent?: "primary" | "success" | "warning" | "danger";
  active?: boolean;
  onClick?: () => void;
}) {
  const valueColor =
    accent === "success"
      ? "text-[#027A48]"
      : accent === "warning"
        ? "text-[#B54708]"
        : accent === "danger"
          ? "text-[#B42318]"
          : accent === "primary"
            ? "text-[#1059BD]"
            : "text-[#222733]";
  const base = "rounded-[14px] border bg-white p-5 text-left transition";
  const ring = active
    ? "border-[#2684FF] ring-1 ring-[#2684FF]"
    : "border-[#EEF0F4]";
  const hover = onClick ? "hover:border-[#DDE1E9] hover:shadow-sm" : "";
  const content = (
    <>
      <p className="text-sm font-bold text-[#363D4D]">{label}</p>
      <p className={`mt-1.5 text-[32px] font-bold leading-none ${valueColor}`}>{value}</p>
      <p className="mt-2 text-xs text-[#9AA2B2]">{sublabel}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${ring} ${hover} w-full`}>
        {content}
      </button>
    );
  }
  return <div className={`${base} ${ring}`}>{content}</div>;
}

function StatusFilter({ value, onChange }: { value: Status | "all"; onChange: (v: Status | "all") => void }) {
  const [open, setOpen] = useState(false);
  const opts: { id: Status | "all"; label: string }[] = [
    { id: "all", label: "All status" },
    { id: "pending", label: "Pending" },
    { id: "incomplete", label: "Incomplete" },
    { id: "approved", label: "Verified" },
    { id: "changes", label: "Changes requested" },
  ];
  const current = opts.find((o) => o.id === value)?.label ?? "All status";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#EEF0F4] px-3 text-sm font-medium text-[#363D4D]"
      >
        {current} <ChevronDown className="h-4 w-4 text-[#9AA2B2]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-[10px] border border-[#EEF0F4] bg-white py-1 shadow-lg">
            {opts.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#F7F8FA] ${
                    value === o.id ? "font-bold text-[#1059BD]" : "text-[#222733]"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RiskFilter({
  value,
  onChange,
}: {
  value: "all" | "Low" | "Medium" | "High";
  onChange: (v: "all" | "Low" | "Medium" | "High") => void;
}) {
  const [open, setOpen] = useState(false);
  const opts: { id: "all" | "Low" | "Medium" | "High"; label: string }[] = [
    { id: "all", label: "All risk" },
    { id: "Low", label: "Low risk" },
    { id: "Medium", label: "Medium risk" },
    { id: "High", label: "High risk" },
  ];
  const current = opts.find((o) => o.id === value)?.label ?? "All risk";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#EEF0F4] px-3 text-sm font-medium text-[#363D4D]"
      >
        {current} <ChevronDown className="h-4 w-4 text-[#9AA2B2]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-[10px] border border-[#EEF0F4] bg-white py-1 shadow-lg">
            {opts.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#F7F8FA] ${
                    value === o.id ? "font-bold text-[#1059BD]" : "text-[#222733]"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-[#FFFAEB] text-[#B54708]" },
    incomplete: { label: "Incomplete", cls: "bg-[#FFF1F0] text-[#B42318]" },
    approved: { label: "Verified", cls: "bg-[#E8F2FF] text-[#1059BD]" },
    changes: { label: "Changes requested", cls: "bg-[#FFF1F0] text-[#B42318]" },
  };
  const { label, cls } = map[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Detail view (full field verification) ───────────────────────────────────
function DetailView({
  sub,
  status,
  onBack,
  decision,
  onDecide,
  onClearDecision,
}: {
  sub: Submission;
  status: Status;
  onBack: () => void;
  decision: "approved" | "changes" | null;
  onDecide: (d: "approved" | "changes") => void;
  onClearDecision: () => void;
}) {
  const d = sub.draft;
  // Per-field decisions and (for declines) the reason shown to the client.
  const [rowStatus, setRowStatus] = useState<Record<string, "approved" | "declined">>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const report = aiReportFor(sub);

  const miss = missingCount(d);

  const company = str(d, "legalCompanyName") || "Unnamed company";
  const subtitle = [str(d, "entityType"), str(d, "countryOfIncorporation")].filter(Boolean).join(" · ");

  // Declined fields (each carries a reason) — these are sent to the client.
  const declined = Object.entries(rowStatus)
    .filter(([, st]) => st === "declined")
    .map(([key]) => ({ key, label: ROW_LABELS[key] ?? key, reason: (reasons[key] ?? "").trim() }));

  const clientEmail = str(d, "billingContactEmail");

  const approveRow = (key: string) => {
    setRowStatus((prev) => ({ ...prev, [key]: "approved" }));
    setReasons((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const declineRow = (key: string, reason: string) => {
    setRowStatus((prev) => ({ ...prev, [key]: "declined" }));
    setReasons((prev) => ({ ...prev, [key]: reason }));
  };
  const clearRow = (key: string) => {
    setRowStatus((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReasons((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9AA2B2] transition hover:text-[#222733]"
      >
        <ArrowLeft className="h-4 w-4" /> All submissions
      </button>

      {/* Applicant summary card */}
      <section className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Onboarding verification</p>
            <h2 className="mt-1 text-2xl font-bold text-[#222733]">{company}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#9AA2B2]">{subtitle}</p>}
            <p className="mt-2 text-sm text-[#222733]">
              Signatory: <span className="font-bold">{str(d, "signatoryName") || "—"}</span>
              {str(d, "designation") && <span className="text-[#9AA2B2]"> · {str(d, "designation")}</span>}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </section>

      {/* AI findings — surfaced alongside the manual detail check */}
      <AiFindingsCard report={report} onOpen={() => setReportOpen(true)} />

      {decision && (
        <div
          className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-sm font-bold ${
            decision === "approved"
              ? "border-[#2684FF]/30 bg-[#E8F2FF] text-[#1059BD]"
              : "border-[#F04438]/30 bg-[#FFF1F0] text-[#B42318]"
          }`}
        >
          {decision === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {decision === "approved"
            ? "Submission verified. The applicant has been notified."
            : "Changes requested. The applicant has been asked to update their details."}
          <button onClick={onClearDecision} className="ml-auto text-xs font-medium underline opacity-70 hover:opacity-100">
            Undo
          </button>
        </div>
      )}

      {emailSent && (
        <div className="flex items-center gap-3 rounded-[12px] border border-[#2684FF]/30 bg-[#E8F2FF] px-4 py-3 text-sm font-bold text-[#1059BD]">
          <Mail className="h-5 w-5" />
          Email sent to {clientEmail || "the client"}. They&apos;ve been asked to fix the declined fields.
          <button
            onClick={() => setEmailSent(false)}
            className="ml-auto text-xs font-medium underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {declined.length > 0 && !emailSent && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#FEC84B] bg-[#FFFAEB] px-4 py-3 text-sm text-[#B54708]">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-bold">
            {declined.length} field{declined.length > 1 ? "s" : ""} declined.
          </span>
          <span className="text-[#B54708]/80">Email the client so they can correct these.</span>
          <button
            onClick={() => setComposerOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] bg-[#B54708] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#93370D]"
          >
            <Mail className="h-3.5 w-3.5" /> Email client
          </button>
        </div>
      )}

      {/* Field sections */}
      <div className="min-w-0 space-y-5">
          {SECTIONS.map((s) => {
            const sectionMiss = s.rows.filter((r) => rowIsMissing(r, d)).length;
            const sectionDeclined = s.rows.filter((r) => rowStatus[r.key] === "declined").length;
            return (
              <section
                key={s.id}
                id={`sec-${s.id}`}
                className="scroll-mt-6 rounded-[16px] border border-[#EEF0F4] bg-white"
              >
                <header className="flex items-center gap-2 border-b border-[#EEF0F4] px-6 py-4">
                  <h3 className="text-base font-bold text-[#222733]">{s.title}</h3>
                  {sectionMiss > 0 && (
                    <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">
                      {sectionMiss} missing
                    </span>
                  )}
                  {sectionDeclined > 0 && (
                    <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">
                      {sectionDeclined} declined
                    </span>
                  )}
                </header>
                <dl className="divide-y divide-[#EEF0F4]">
                  {s.rows.map((row) =>
                    row.hidden?.(d) ? null : (
                      <FieldRow
                        key={row.key}
                        row={row}
                        draft={d}
                        status={rowStatus[row.key]}
                        reason={reasons[row.key] ?? ""}
                        onApprove={() => approveRow(row.key)}
                        onDecline={(text) => declineRow(row.key, text)}
                        onClear={() => clearRow(row.key)}
                      />
                    ),
                  )}
                </dl>
              </section>
            );
          })}

          {/* Actions */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {miss > 0 && (
              <span className="text-sm text-[#9AA2B2] sm:mr-auto">
                {miss} required field{miss > 1 ? "s" : ""} still missing.
              </span>
            )}
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#EEF0F4] px-5 text-sm font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
            >
              <Mail className="h-4 w-4" />
              Email client
              {declined.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFF1F0] px-1.5 text-[11px] font-bold text-[#B42318]">
                  {declined.length}
                </span>
              )}
            </button>
            <button
              disabled={miss > 0}
              onClick={() => onDecide("approved")}
              className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#2684FF] px-7 text-sm font-bold text-white transition hover:bg-[#1A6FE0] disabled:cursor-not-allowed disabled:bg-[#DDE1E9] disabled:text-[#9AA2B2]"
            >
              Verify submission
            </button>
          </div>
      </div>

      {composerOpen && (
        <EmailClientComposer
          company={company}
          signatory={str(d, "signatoryName")}
          toEmail={clientEmail}
          declined={declined}
          onClose={() => setComposerOpen(false)}
          onSend={() => {
            setComposerOpen(false);
            setEmailSent(true);
            onDecide("changes");
          }}
        />
      )}

      {reportOpen && <AiReportPanel sub={sub} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

function FieldRow({
  row,
  draft,
  status,
  reason,
  onApprove,
  onDecline,
  onClear,
}: {
  row: Row;
  draft: Draft;
  status: "approved" | "declined" | undefined;
  reason: string;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onClear: () => void;
}) {
  const missing = rowIsMissing(row, draft);
  const declined = status === "declined";
  const approved = status === "approved";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reason);

  const openDecline = () => {
    setText(reason);
    setEditing(true);
  };
  const saveDecline = () => {
    if (!text.trim()) return;
    onDecline(text.trim());
    setEditing(false);
  };
  const cancel = () => {
    setText(reason);
    setEditing(false);
  };

  return (
    <div className="px-6 py-3.5 transition">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-4">
        <dt className="flex items-center gap-1.5 text-sm text-[#9AA2B2]">
          {row.label}
          {row.required?.(draft) && <span className="text-[#F04438]">*</span>}
        </dt>
        <dd className="text-sm text-[#222733]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <RowValue row={row} draft={draft} missing={missing} />
            </div>

            {!editing && (
              <div className="flex shrink-0 items-center gap-1.5">
                {approved ? (
                  <button
                    onClick={onClear}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E6F9F0] px-2.5 py-1 text-xs font-bold text-[#027A48] transition hover:bg-[#CFF3E2]"
                    title="Approved — click to undo"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                  </button>
                ) : declined ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E2] px-2.5 py-1 text-xs font-bold text-[#B42318]">
                      <XCircle className="h-3.5 w-3.5" /> Declined
                    </span>
                    <button
                      onClick={openDecline}
                      className="inline-flex h-7 items-center rounded-[8px] px-2 text-xs font-bold text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#363D4D]"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onApprove}
                      title="Approve"
                      aria-label="Approve"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#A6F4C5] text-[#027A48] transition hover:bg-[#E6F9F0]"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={openDecline}
                      title="Decline"
                      aria-label="Decline"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#FECDCA] text-[#B42318] transition hover:bg-[#FFF1F0]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {declined && !editing && (
            <div className="mt-2">
              <p className="flex items-start gap-1.5 rounded-[8px] border border-[#FECDCA] bg-white px-3 py-2 text-xs text-[#B42318]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-pre-wrap">{reason}</span>
              </p>
            </div>
          )}

          {editing && (
            <div className="mt-2 ml-auto max-w-[440px]">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={2}
                placeholder="Reason for declining — tell the client what to fix in this field…"
                className="w-full resize-y rounded-[8px] border border-[#DDE1E9] px-3 py-2 text-sm text-[#222733] outline-none placeholder:text-[#9AA2B2] focus:border-[#2684FF]"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={saveDecline}
                  disabled={!text.trim()}
                  className="inline-flex h-8 items-center rounded-[8px] bg-[#F04438] px-3 text-xs font-bold text-white transition hover:bg-[#D92D20] disabled:cursor-not-allowed disabled:bg-[#DDE1E9] disabled:text-[#9AA2B2]"
                >
                  Decline field
                </button>
                <button
                  onClick={cancel}
                  className="inline-flex h-8 items-center rounded-[8px] border border-[#EEF0F4] px-3 text-xs font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
                >
                  Cancel
                </button>
                {declined && (
                  <button
                    onClick={() => {
                      onClear();
                      setEditing(false);
                    }}
                    className="ml-auto inline-flex h-8 items-center gap-1 rounded-[8px] px-2 text-xs font-bold text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#363D4D]"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </dd>
      </div>
    </div>
  );
}

function RowValue({ row, draft, missing }: { row: Row; draft: Draft; missing: boolean }) {
  if (missing) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-[#B42318]">
        <AlertTriangle className="h-3.5 w-3.5" /> Missing
      </span>
    );
  }
  if (row.value) {
    const v = row.value(draft);
    if (!v || (Array.isArray(v) && v.length === 0)) return <Empty />;
    if (row.kind === "url" && typeof v === "string" && v.startsWith("http")) return <UrlValue url={v} />;
    return <span className="font-medium">{Array.isArray(v) ? v.join(", ") : v}</span>;
  }
  switch (row.kind) {
    case "multi": {
      const ids = arr(draft, row.key);
      if (ids.length === 0) return <Empty />;
      const labels = ids.map((id) => row.options?.find((o) => o.id === id)?.label ?? id);
      return (
        <ul className="space-y-1">
          {labels.map((l) => (
            <li key={l} className="flex items-start gap-1.5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#12B76A]" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "bool": {
      const on = bool(draft, row.key);
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium ${on ? "text-[#222733]" : "text-[#9AA2B2]"}`}>
          {on ? <Check className="h-4 w-4 text-[#12B76A]" /> : <XCircle className="h-4 w-4 text-[#9AA2B2]" />}
          {on ? row.trueLabel ?? "Yes" : row.falseLabel ?? "No"}
        </span>
      );
    }
    case "file": {
      const name = str(draft, row.key);
      if (!name) return <Empty />;
      return (
        <span className="inline-flex items-center gap-2 rounded-[8px] border border-[#EEF0F4] bg-[#F7F8FA] px-2.5 py-1 font-medium">
          <FileText className="h-4 w-4 text-[#2684FF]" />
          {name}
        </span>
      );
    }
    case "url": {
      const v = str(draft, row.key);
      if (!v) return <Empty />;
      return <UrlValue url={v} />;
    }
    default: {
      const v = str(draft, row.key);
      return v ? <span className="whitespace-pre-wrap font-medium">{v}</span> : <Empty />;
    }
  }
}

function UrlValue({ url }: { url: string }) {
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-[#2684FF] hover:underline"
    >
      {url}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function Empty() {
  return <span className="text-[#9AA2B2]">—</span>;
}

// ── Email composer (simulated send) ─────────────────────────────────────────
type EmailTone = "professional" | "friendly" | "concise";

function buildEmailBody(
  tone: EmailTone,
  company: string,
  signatory: string,
  declined: { label: string; reason: string }[],
): string {
  const first = signatory ? signatory.split(" ")[0] : "";
  const items =
    declined.length > 0
      ? declined.map((f, i) => `${i + 1}. ${f.label} — ${f.reason}`).join("\n")
      : "1. ";
  const sign = "The Wisemonk Verification Team";

  if (tone === "friendly") {
    const greeting = first ? `Hi ${first},` : "Hi there,";
    return `${greeting}\n\nThanks so much for getting ${company}'s onboarding underway! We're almost there — we just need a quick fix on the following before we can verify your account:\n\n${items}\n\nOnce you've updated these in your onboarding form, just reply here and we'll take it from there. Any questions at all, we're happy to help!\n\nCheers,\n${sign}`;
  }
  if (tone === "concise") {
    const greeting = first ? `Hi ${first},` : "Hello,";
    return `${greeting}\n\nA few fields in ${company}'s onboarding need correcting before we can verify your account:\n\n${items}\n\nPlease update them in your onboarding form and reply once done.\n\nThanks,\n${sign}`;
  }
  // professional (default)
  const greeting = first ? `Dear ${first},` : "Hello,";
  return `${greeting}\n\nThank you for submitting ${company}'s onboarding details. During our review we identified the following item(s) that require your attention before we can complete verification:\n\n${items}\n\nKindly update the affected field(s) in your onboarding form and let us know once complete. Please don't hesitate to reach out if anything needs clarification.\n\nBest regards,\n${sign}`;
}

function EmailClientComposer({
  company,
  signatory,
  toEmail,
  declined,
  onClose,
  onSend,
}: {
  company: string;
  signatory: string;
  toEmail: string;
  declined: { key: string; label: string; reason: string }[];
  onClose: () => void;
  onSend: () => void;
}) {
  const [subject, setSubject] = useState(`Action needed: ${company}'s onboarding verification`);
  const [body, setBody] = useState(() => buildEmailBody("professional", company, signatory, declined));
  const [to, setTo] = useState(toEmail);

  const canSend = !!to.trim() && !!subject.trim() && !!body.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#222733]/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] border border-[#EEF0F4] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#EEF0F4] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F2FF] text-[#1059BD]">
              <Mail className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#222733]">Email client</h3>
              <p className="text-xs text-[#9AA2B2]">Ask the client to fix the declined fields</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#222733]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@company.com"
              className="mt-1.5 h-10 w-full rounded-[10px] border border-[#DDE1E9] px-3 text-sm text-[#222733] outline-none placeholder:text-[#9AA2B2] focus:border-[#2684FF]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-[10px] border border-[#DDE1E9] px-3 text-sm text-[#222733] outline-none focus:border-[#2684FF]"
            />
          </label>

          <div className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1.5 w-full resize-y rounded-[10px] border border-[#DDE1E9] px-3 py-2.5 text-sm leading-relaxed text-[#222733] outline-none focus:border-[#2684FF]"
            />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#EEF0F4] px-6 py-4">
          <span className="text-xs text-[#9AA2B2]">The client will receive this from your verification team inbox.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-[10px] border border-[#EEF0F4] px-4 text-sm font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={!canSend}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#2684FF] px-5 text-sm font-bold text-white transition hover:bg-[#1A6FE0] disabled:cursor-not-allowed disabled:bg-[#DDE1E9] disabled:text-[#9AA2B2]"
            >
              <Send className="h-4 w-4" /> Send email
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
