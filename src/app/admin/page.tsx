"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Laptop,
  Mail,
  MoreHorizontal,
  Newspaper,
  RotateCw,
  Scale,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
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
type Status = "review" | "approved" | "changes" | "reverify";
type Decision = "approved" | "changes" | "reverify";
type Verification = { by: string; at: string; reason: string };

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

// Additional sample entities used to demonstrate each verification status.
const SAMPLE_VERTEX: Draft = {
  ...SAMPLE_ACME,
  signatoryName: "Maria Lopez", designation: "CEO", legalCompanyName: "Vertex Systems Inc", directorName: "Maria Lopez",
  countryOfIncorporation: "United States", companyWebsite: "https://vertex.io", billingContactEmail: "ops@vertex.io",
  addressStreet: "88 Brannan St", addressCity: "San Francisco", addressState: "California", addressZip: "94107",
  taxRegNumber: "US-EIN-77-2841920", billingCurrency: "USD",
};
const SAMPLE_HELIOS: Draft = {
  ...SAMPLE_NIMBUS,
  signatoryName: "Anders Voss", designation: "Director", legalCompanyName: "Helios Energy BV", directorName: "Anders Voss",
  countryOfIncorporation: "Netherlands", companyWebsite: "https://helios.nl", billingContactEmail: "finance@helios.nl",
  addressStreet: "Keizersgracht 124", addressCity: "Amsterdam", addressState: "Noord-Holland", addressZip: "1015 CW",
  taxRegNumber: "NL-VAT-8123456B01", billingCurrency: "EUR",
};
const SAMPLE_ZENITH: Draft = {
  ...SAMPLE_ACME,
  signatoryName: "Grace Tan", designation: "Managing Director", legalCompanyName: "Zenith Retail Pte", directorName: "Grace Tan",
  countryOfIncorporation: "Singapore", companyWebsite: "https://zenith.sg", billingContactEmail: "admin@zenith.sg",
  addressStreet: "9 Raffles Place", addressCity: "Singapore", addressState: "Central", addressZip: "048619",
  taxRegNumber: "SG-UEN-201934567K", billingCurrency: "SGD",
};
const SAMPLE_ATLAS: Draft = {
  ...SAMPLE_NIMBUS,
  signatoryName: "Diego Marín", designation: "Administrador", legalCompanyName: "Atlas Logistics SA", directorName: "Diego Marín",
  countryOfIncorporation: "Spain", companyWebsite: "https://atlas-log.es", billingContactEmail: "cuentas@atlas-log.es",
  addressStreet: "Calle de Alcalá 42", addressCity: "Madrid", addressState: "Madrid", addressZip: "28014",
  taxRegNumber: "ES-VAT-B12345678", billingCurrency: "EUR",
};
const SAMPLE_BOREALIS: Draft = {
  ...SAMPLE_ACME,
  signatoryName: "Sofia Larsen", designation: "CEO", legalCompanyName: "Borealis Media AB", directorName: "Sofia Larsen",
  countryOfIncorporation: "Sweden", companyWebsite: "https://borealis.se", billingContactEmail: "hello@borealis.se",
  addressStreet: "Sveavägen 21", addressCity: "Stockholm", addressState: "Stockholm", addressZip: "111 34",
  taxRegNumber: "SE-VAT-556789012301", billingCurrency: "SEK",
};

const SAMPLE_SUBMISSIONS: Submission[] = [
  { id: "s-acme", submittedAt: "Jun 08, 2026", draft: SAMPLE_ACME, source: "sample" },
  { id: "s-vertex", submittedAt: "Jun 07, 2026", draft: SAMPLE_VERTEX, source: "sample" },
  { id: "s-helios", submittedAt: "Jun 06, 2026", draft: SAMPLE_HELIOS, source: "sample" },
  { id: "s-nimbus", submittedAt: "Jun 05, 2026", draft: SAMPLE_NIMBUS, source: "sample" },
  { id: "s-zenith", submittedAt: "Jun 04, 2026", draft: SAMPLE_ZENITH, source: "sample" },
  { id: "s-atlas", submittedAt: "Jun 03, 2026", draft: SAMPLE_ATLAS, source: "sample" },
  { id: "s-borealis", submittedAt: "Jun 03, 2026", draft: SAMPLE_BOREALIS, source: "sample" },
  { id: "s-orbit", submittedAt: "Jun 02, 2026", draft: SAMPLE_ORBIT, source: "sample" },
];

// Pre-seeded decisions so the table shows one row per verification status.
const SEED_DECISIONS: Record<string, Decision> = {
  "s-vertex": "approved", // Verified (no reason)
  "s-helios": "approved", // Verified with reason
  "s-zenith": "changes", // Changes requested
  "s-atlas": "reverify", // Re-verify (client resubmitted)
};
const SEED_VERIFICATIONS: Record<string, Verification> = {
  "s-vertex": { by: "You", at: "Jun 10, 2026", reason: "" },
  "s-helios": {
    by: "You",
    at: "Jun 09, 2026",
    reason: "Registry lookup pending — verified on signed declaration and prior relationship.",
  },
};

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
  const [decisions, setDecisions] = useState<Record<string, Decision>>(SEED_DECISIONS);
  const [verifications, setVerifications] = useState<Record<string, Verification>>(SEED_VERIFICATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<VTab>("client");

  const statusOf = (sub: Submission): Status => {
    const dec = decisions[sub.id];
    if (dec === "approved") return "approved";
    if (dec === "changes") return "changes";
    if (dec === "reverify") return "reverify";
    return "review";
  };

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-h-screen bg-[#F1F8FF] text-[#222733]">
      <Sidebar
        onLogo={() => setSelectedId(null)}
        tab={tab}
        onTab={(t) => {
          setTab(t);
          setSelectedId(null);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title="Onboarding" />
        <div className="flex-1 p-6">
          {tab === "employee" ? (
            <EmployeeListView />
          ) : tab !== "client" ? (
            <ComingSoon tab={tab} />
          ) : selected ? (
            <DetailView
              sub={selected}
              status={statusOf(selected)}
              onBack={() => setSelectedId(null)}
              decision={decisions[selected.id] ?? null}
              verification={verifications[selected.id] ?? null}
              onDecide={(d, reason) => {
                setDecisions((prev) => ({ ...prev, [selected.id]: d }));
                if (d === "approved") {
                  setVerifications((prev) => ({
                    ...prev,
                    [selected.id]: {
                      by: "You",
                      at: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                      reason: reason ?? "",
                    },
                  }));
                } else {
                  // changes requested or client re-submitted → no longer verified
                  setVerifications((prev) => {
                    const next = { ...prev };
                    delete next[selected.id];
                    return next;
                  });
                }
              }}
              onClearDecision={() => {
                setDecisions((prev) => {
                  const next = { ...prev };
                  delete next[selected.id];
                  return next;
                });
                setVerifications((prev) => {
                  const next = { ...prev };
                  delete next[selected.id];
                  return next;
                });
              }}
            />
          ) : (
            <ListView submissions={submissions} statusOf={statusOf} verifications={verifications} onOpen={(id) => setSelectedId(id)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Verification sub-tabs ─────────────────────────────────────────────────────
type VTab = "client" | "employee" | "contractor" | "freelancer";
const V_TABS: { id: VTab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "client", label: "Client", icon: Building2 },
  { id: "employee", label: "Employee", icon: Users },
  { id: "contractor", label: "Contractor", icon: Briefcase },
  { id: "freelancer", label: "Freelancer", icon: Laptop },
];

// ── Shell: Sidebar ──────────────────────────────────────────────────────────
function Sidebar({ onLogo, tab, onTab }: { onLogo: () => void; tab: VTab; onTab: (t: VTab) => void }) {
  const [open, setOpen] = useState(true);
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
        {/* Parent: Verification (collapsible) */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-[#363D4D] transition hover:bg-[#F7F8FA]"
        >
          <ShieldCheck className="h-[18px] w-[18px]" />
          Verification
          <ChevronDown
            className={`ml-auto h-4 w-4 text-[#9AA2B2] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {/* Sub-tabs: Client / Employee / Contractor / Freelancer */}
        {open && (
          <div className="ml-[30px] flex flex-col gap-0.5">
            {V_TABS.map((it) => {
              const active = it.id === tab;
              return (
                <button
                  key={it.id}
                  onClick={() => onTab(it.id)}
                  className={`rounded-[8px] px-3 py-1.5 text-left text-sm font-medium transition ${
                    active ? "bg-[#E8F2FF] text-[#1059BD]" : "text-[#363D4D] hover:bg-[#F7F8FA]"
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

// ── Placeholder for not-yet-built verification tabs ───────────────────────────
function ComingSoon({ tab }: { tab: VTab }) {
  const meta = V_TABS.find((t) => t.id === tab)!;
  const Icon = meta.icon;
  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F2FF] text-[#1059BD]">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#222733]">{meta.label} verification</h2>
        <p className="mt-2 text-sm text-[#9AA2B2]">
          {meta.label} onboarding verification isn&apos;t live yet. KYC completeness and AI due-diligence
          screening for {meta.label.toLowerCase()}s will appear here once enabled.
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#F7F8FA] px-3 py-1.5 text-xs font-medium text-[#6B7588]">
          <Clock className="h-3.5 w-3.5" />
          Coming soon
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE VERIFICATION
// ════════════════════════════════════════════════════════════════════════════
type Employee = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  submittedAt: string;
  screening: "Clear" | "Review" | "Flag";
  idDoc: string;
  rightToWork: string;
  addressProof: string;
  bankAccount: string;
  taxForm: string;
  bgChecks: string;
};

const EMPLOYEES: Employee[] = [
  {
    id: "e-priya", name: "Priya Sharma", email: "priya.sharma@email.com", company: "Acme Corp", role: "Software Engineer",
    country: "India", submittedAt: "Jun 09, 2026", screening: "Clear",
    idDoc: "Passport · N1928374", rightToWork: "Citizen — no permit required", addressProof: "Bank statement · May 2026",
    bankAccount: "HDFC ****4821", taxForm: "Form 16 / PAN on file",
    bgChecks: "Criminal: clear · Education: verified · Employment: verified",
  },
  {
    id: "e-tom", name: "Tom Becker", email: "tom.becker@email.de", company: "Nimbus Labs GmbH", role: "Account Manager",
    country: "Germany", submittedAt: "Jun 08, 2026", screening: "Clear",
    idDoc: "National ID · DE-77421", rightToWork: "EU citizen — no permit required", addressProof: "Lease agreement · 2026",
    bankAccount: "N26 ****1190", taxForm: "Lohnsteuer ID on file",
    bgChecks: "Criminal: clear · Education: verified · Employment: pending reference",
  },
  {
    id: "e-aisha", name: "Aisha Khan", email: "aisha.khan@email.com", company: "Orbit Pvt Ltd", role: "Product Designer",
    country: "United Arab Emirates", submittedAt: "Jun 07, 2026", screening: "Review",
    idDoc: "Passport · K5567281", rightToWork: "Work visa — expiry 2028", addressProof: "",
    bankAccount: "Emirates NBD ****0093", taxForm: "",
    bgChecks: "Criminal: clear · Education: awaiting transcript · Employment: verified",
  },
  {
    id: "e-liam", name: "Liam O'Brien", email: "liam.obrien@email.ie", company: "Vertex Systems Inc", role: "Sales Lead",
    country: "Ireland", submittedAt: "Jun 06, 2026", screening: "Clear",
    idDoc: "Passport · IE-339201", rightToWork: "EU citizen — no permit required", addressProof: "Utility bill · Apr 2026",
    bankAccount: "AIB ****7741", taxForm: "PPS number on file",
    bgChecks: "Criminal: clear · Education: verified · Employment: verified",
  },
  {
    id: "e-diego", name: "Diego Santos", email: "diego.santos@email.br", company: "Helios Energy BV", role: "Support Specialist",
    country: "Brazil", submittedAt: "Jun 05, 2026", screening: "Flag",
    idDoc: "RG · 28.func.901", rightToWork: "Citizen — no permit required", addressProof: "Utility bill · Mar 2026",
    bankAccount: "Nubank ****5512", taxForm: "CPF on file",
    bgChecks: "Criminal: record found — needs manual review · Education: verified",
  },
  {
    id: "e-mei", name: "Mei Chen", email: "mei.chen@email.sg", company: "Zenith Retail Pte", role: "Data Analyst",
    country: "Singapore", submittedAt: "Jun 04, 2026", screening: "Review",
    idDoc: "NRIC · S98••••2J", rightToWork: "Employment Pass — expiry 2027", addressProof: "Tenancy agreement · 2026",
    bankAccount: "DBS ****3380", taxForm: "",
    bgChecks: "Criminal: clear · Education: verified · Employment: awaiting reference",
  },
  {
    id: "e-noah", name: "Noah Williams", email: "noah.williams@email.co.uk", company: "Atlas Logistics SA", role: "Finance Associate",
    country: "United Kingdom", submittedAt: "Jun 03, 2026", screening: "Clear",
    idDoc: "Passport · GB-771902", rightToWork: "Citizen — share code verified", addressProof: "Council tax · 2026",
    bankAccount: "Monzo ****2207", taxForm: "NI number on file",
    bgChecks: "Criminal: DBS clear · Education: verified · Employment: verified",
  },
];

const empSections = (e: Employee): { title: string; rows: { label: string; value: string }[] }[] => [
  {
    title: "Identity & right to work",
    rows: [
      { label: "Government ID", value: e.idDoc },
      { label: "Right to work", value: e.rightToWork },
    ],
  },
  { title: "Address", rows: [{ label: "Proof of address", value: e.addressProof }] },
  {
    title: "Banking & tax",
    rows: [
      { label: "Bank account", value: e.bankAccount },
      { label: "Tax / payroll ID", value: e.taxForm },
    ],
  },
];

const empDocCounts = (e: Employee) => {
  const rows = empSections(e).flatMap((s) => s.rows);
  const have = rows.filter((r) => r.value.trim()).length;
  return { have, total: rows.length, missing: rows.length - rows.filter((r) => r.value.trim()).length };
};

// Full set of details collected during employee onboarding — shown on the
// per-employee verification screen for field-by-field approve/decline.
type EmpDetails = {
  fatherName: string; dob: string; aadhaar: string;
  currentAddress: string; city: string; state: string; pincode: string;
  ifsc: string; pan: string; uan: string; experience: string; agreement: string;
};
const EMP_DETAILS: Record<string, EmpDetails> = {
  "e-priya": { fatherName: "Rajesh Sharma", dob: "14 Mar 1995", aadhaar: "XXXX XXXX 8821", currentAddress: "12 MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038", ifsc: "HDFC0001234", pan: "ABCPS1234K", uan: "100234567890", experience: "6 yrs 3 mo", agreement: "Signed · Jun 10, 2026" },
  "e-tom": { fatherName: "Hans Becker", dob: "02 Jul 1990", aadhaar: "XXXX XXXX 4410", currentAddress: "Friedrichstraße 88", city: "Berlin", state: "Berlin", pincode: "10117", ifsc: "HDFC0007781", pan: "BKPPB7781L", uan: "100884512097", experience: "9 yrs 1 mo", agreement: "Signed · Jun 09, 2026" },
  "e-aisha": { fatherName: "Imran Khan", dob: "21 Nov 1996", aadhaar: "XXXX XXXX 2290", currentAddress: "Marina Plaza, Dubai Marina", city: "Dubai", state: "Dubai", pincode: "00000", ifsc: "HDFC0003388", pan: "AKPPK3388M", uan: "", experience: "4 yrs 6 mo", agreement: "Awaiting signature" },
  "e-liam": { fatherName: "Sean O'Brien", dob: "08 Feb 1992", aadhaar: "XXXX XXXX 7712", currentAddress: "14 Grafton Street", city: "Dublin", state: "Leinster", pincode: "D02", ifsc: "HDFC0009921", pan: "LBPPO9921N", uan: "100774590021", experience: "7 yrs 8 mo", agreement: "Signed · Jun 06, 2026" },
  "e-diego": { fatherName: "Carlos Santos", dob: "30 Sep 1994", aadhaar: "XXXX XXXX 5512", currentAddress: "Av. Paulista 1500", city: "São Paulo", state: "São Paulo", pincode: "01310", ifsc: "HDFC0004412", pan: "DSPPS4412P", uan: "100221780654", experience: "5 yrs 2 mo", agreement: "Signed · Jun 05, 2026" },
  "e-mei": { fatherName: "Wei Chen", dob: "17 Jun 1993", aadhaar: "XXXX XXXX 3380", currentAddress: "9 Raffles Place", city: "Singapore", state: "Central", pincode: "048619", ifsc: "HDFC0006650", pan: "MCPPC6650Q", uan: "", experience: "8 yrs 4 mo", agreement: "Awaiting signature" },
  "e-noah": { fatherName: "George Williams", dob: "11 Jan 1991", aadhaar: "XXXX XXXX 2207", currentAddress: "27 King's Road, Chelsea", city: "London", state: "England", pincode: "SW3", ifsc: "HDFC0002207", pan: "NWPPW2207R", uan: "100990143322", experience: "10 yrs 0 mo", agreement: "Signed · Jun 03, 2026" },
};

type EmpField = { label: string; value: string; kind?: "file" };
const empFullSections = (e: Employee): { title: string; rows: EmpField[] }[] => {
  const d = EMP_DETAILS[e.id];
  const [bank, ...acc] = e.bankAccount.split(" ");
  const slug = e.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return [
    { title: "Name verification", rows: [
      { label: "Full name (as entered)", value: e.name },
      { label: "Name on Aadhaar", value: e.name },
      { label: "Name on PAN", value: e.name },
      { label: "Bank account holder", value: e.name },
    ] },
    { title: "Identity information", rows: [
      { label: "Father's name", value: d?.fatherName ?? "" },
      { label: "Date of birth", value: d?.dob ?? "" },
      { label: "Aadhaar number", value: d?.aadhaar ?? "" },
      { label: "Aadhaar card", value: `${slug}_aadhaar_card.pdf`, kind: "file" },
    ] },
    { title: "Address information", rows: [
      { label: "Current address", value: d?.currentAddress ?? "" },
      { label: "City", value: d?.city ?? "" },
      { label: "State", value: d?.state ?? "" },
      { label: "Pincode", value: d?.pincode ?? "" },
    ] },
    { title: "Employee agreement", rows: [
      { label: "Employment agreement", value: d?.agreement ?? "" },
    ] },
    { title: "Employment details (added by client)", rows: [
      { label: "Company", value: e.company },
      { label: "Job title", value: e.role },
      { label: "Seniority", value: "Mid-level" },
      { label: "Department", value: "Operations" },
      { label: "Start date (Wisemonk EOR)", value: "30 Jun 2026" },
      { label: "Work arrangement", value: "Remote" },
      { label: "Job description", value: "job_description.pdf", kind: "file" },
    ] },
    { title: "Compensation & benefits (added by client)", rows: [
      { label: "Annual gross salary", value: "₹18,00,000 (INR)" },
      { label: "Provident fund", value: "Employer PF on top of salary · ₹1,800/mo" },
      { label: "Health insurance", value: "Added" },
      { label: "Equipment", value: "Not added" },
      { label: "Engagement model", value: "Consultant engagement model · agreed" },
    ] },
    { title: "Professional details", rows: [
      { label: "Total work experience", value: d?.experience ?? "" },
      { label: "Graduation certificate", value: `${slug}_graduation.pdf`, kind: "file" },
      { label: "Relieving letter", value: `${slug}_relieving_letter.pdf`, kind: "file" },
      { label: "Latest salary slip", value: `${slug}_salary_slip.pdf`, kind: "file" },
      { label: "Resume", value: `${slug}_resume.pdf`, kind: "file" },
    ] },
    { title: "Bank details", rows: [
      { label: "Bank name", value: bank ?? "" },
      { label: "Account number", value: acc.join(" ") },
      { label: "IFSC code", value: d?.ifsc ?? "" },
      { label: "PAN number", value: d?.pan ?? "" },
      { label: "PAN card", value: `${slug}_pan_card.pdf`, kind: "file" },
      { label: "Cancelled cheque / passbook", value: `${slug}_cancelled_cheque.pdf`, kind: "file" },
    ] },
    { title: "EPF details", rows: [
      { label: "UAN", value: d?.uan ?? "" },
      { label: "EPF contribution", value: d?.uan ? "Active" : "Opted out" },
      { label: "Form 11", value: d?.uan ? "" : `${slug}_form11.pdf`, kind: "file" },
    ] },
    { title: "Previous employer tax (FY 2025-26)", rows: [
      { label: "Previous employer name", value: "Prior Co Pvt Ltd" },
      { label: "Exit date from previous employer", value: "31 May 2026" },
      { label: "Past taxable salary", value: "₹6,40,000" },
      { label: "TDS deducted by previous employer", value: "₹38,000" },
      { label: "Form 16", value: `${slug}_form16.pdf`, kind: "file" },
    ] },
  ];
};

const EMP_SEED_DECISIONS: Record<string, Decision> = {
  "e-priya": "approved",
  "e-tom": "approved",
  "e-diego": "changes",
  "e-mei": "reverify",
};
const EMP_SEED_VERIFICATIONS: Record<string, Verification> = {
  "e-priya": { by: "You", at: "Jun 10, 2026", reason: "" },
  "e-tom": { by: "You", at: "Jun 09, 2026", reason: "Employment reference still pending — verified on prior payroll history." },
};

function ScreeningPill({ screening }: { screening: Employee["screening"] }) {
  const tone =
    screening === "Clear"
      ? "bg-[#ECFDF3] text-[#067647]"
      : screening === "Review"
        ? "bg-[#FFFAEB] text-[#B54708]"
        : "bg-[#FFF1F0] text-[#B42318]";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{screening}</span>;
}

function EmployeeListView() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(EMP_SEED_DECISIONS);
  const [verifications, setVerifications] = useState<Record<string, Verification>>(EMP_SEED_VERIFICATIONS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [screenFilter, setScreenFilter] = useState<"all" | Employee["screening"]>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const statusOf = (e: Employee): Status => {
    const dec = decisions[e.id];
    if (dec === "approved") return "approved";
    if (dec === "changes") return "changes";
    if (dec === "reverify") return "reverify";
    return "review";
  };

  const decide = (id: string, d: Decision, reason?: string) => {
    setDecisions((prev) => ({ ...prev, [id]: d }));
    if (d === "approved") {
      setVerifications((prev) => ({
        ...prev,
        [id]: { by: "You", at: todayLabel(), reason: reason ?? "" },
      }));
    } else {
      setVerifications((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };
  const clearDecision = (id: string) => {
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setVerifications((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const companyOptions = Array.from(new Set(EMPLOYEES.map((e) => e.company))).sort();
  const roleOptions = Array.from(new Set(EMPLOYEES.map((e) => e.role))).sort();

  const rows = EMPLOYEES.map((e) => ({ e, status: statusOf(e) }));
  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || r.e.name.toLowerCase().includes(q) || r.e.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesScreen = screenFilter === "all" || r.e.screening === screenFilter;
    const matchesCompany = companyFilter === "all" || r.e.company === companyFilter;
    const matchesRole = roleFilter === "all" || r.e.role === roleFilter;
    return matchesQuery && matchesStatus && matchesScreen && matchesCompany && matchesRole;
  });

  const total = rows.length;
  const atReview = rows.filter((r) => r.status === "review" || r.status === "reverify").length;
  const verified = rows.filter((r) => r.status === "approved").length;
  const flagged = rows.filter((r) => r.e.screening === "Flag").length;

  const opened = EMPLOYEES.find((e) => e.id === openId) ?? null;

  if (opened) {
    return (
      <EmployeeDetail
        emp={opened}
        status={statusOf(opened)}
        verification={verifications[opened.id] ?? null}
        onDecide={(d, reason) => decide(opened.id, d, reason)}
        onClear={() => clearDecision(opened.id)}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div>
        <h2 className="text-2xl font-bold text-[#222733]">Employees</h2>
        <p className="mt-1 text-sm text-[#9AA2B2]">
          Identity, right-to-work, payroll and background screening for every employee before activation.
        </p>
      </div>

      {/* Metric cards */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total employees"
          value={total}
          sublabel="in onboarding"
          onClick={() => {
            setStatusFilter("all");
            setScreenFilter("all");
          }}
        />
        <StatCard
          label="At review"
          value={atReview}
          sublabel="awaiting verification"
          active={statusFilter === "review"}
          onClick={() => setStatusFilter(statusFilter === "review" ? "all" : "review")}
        />
        <StatCard
          label="Verified"
          value={verified}
          sublabel="cleared & active"
          active={statusFilter === "approved"}
          onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
        />
        <StatCard
          label="Screening flags"
          value={flagged}
          sublabel="needs manual review"
          active={screenFilter === "Flag"}
          onClick={() => setScreenFilter(screenFilter === "Flag" ? "all" : "Flag")}
        />
      </div>

      {/* Search */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#222733]">Onboarding submissions</h3>
        <div className="relative w-full max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA2B2]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="h-10 w-full rounded-[10px] border border-[#EEF0F4] bg-white pl-9 pr-3 text-sm text-[#222733] outline-none placeholder:text-[#9AA2B2] focus:border-[#2684FF]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#EEF0F4] bg-[#F7F8FA] text-xs text-[#9AA2B2]">
              <Th>Employee</Th>
              <FilterTh
                label="Company"
                value={companyFilter}
                onChange={setCompanyFilter}
                options={[{ id: "all", label: "All companies" }, ...companyOptions.map((c) => ({ id: c, label: c }))]}
              />
              <FilterTh
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[{ id: "all", label: "All roles" }, ...roleOptions.map((r) => ({ id: r, label: r }))]}
              />
              <Th>Submitted</Th>
              <FilterTh
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | Status)}
                options={[
                  { id: "all", label: "All status" },
                  { id: "review", label: "At review" },
                  { id: "approved", label: "Verified" },
                  { id: "changes", label: "Changes requested" },
                  { id: "reverify", label: "Re-verify" },
                ]}
              />
              <Th>Notes</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#9AA2B2]">
                  No employees match your filters.
                </td>
              </tr>
            )}
            {filtered.map(({ e, status, docs }) => (
              <tr
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="cursor-pointer border-b border-[#EEF0F4] transition last:border-b-0 hover:bg-[#F7F8FA]"
              >
                <td className="px-4 py-4">
                  <div className="font-bold text-[#222733]">{e.name}</div>
                  <div className="text-xs text-[#9AA2B2]">{e.email}</div>
                </td>
                <td className="px-4 py-4 text-sm text-[#363D4D]">{e.company}</td>
                <td className="px-4 py-4 text-sm text-[#363D4D]">{e.role}</td>
                <td className="px-4 py-4 text-sm text-[#9AA2B2]">{e.submittedAt}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={status} hasReason={!!verifications[e.id]?.reason} />
                  {status === "approved" && verifications[e.id] && (
                    <div className="mt-1.5 text-[11px] leading-snug text-[#9AA2B2]">
                      {verifications[e.id].by} · {verifications[e.id].at}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  {status === "approved" && verifications[e.id]?.reason ? (
                    <span className="block max-w-[200px] truncate text-sm text-[#6B7588]" title={verifications[e.id].reason}>
                      “{verifications[e.id].reason}”
                    </span>
                  ) : (
                    <span className="text-sm text-[#C4CAD4]">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setOpenId(e.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#EEF0F4] hover:text-[#222733]"
                    aria-label="View employee"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmpFieldRow({ field, status, reason, onApprove, onDecline, onClear, onView }: {
  field: EmpField;
  status: "approved" | "declined" | undefined;
  reason: string;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onClear: () => void;
  onView?: (name: string) => void;
}) {
  const missing = !field.value.trim();
  const approved = status === "approved";
  const declined = status === "declined";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reason);
  const openDecline = () => { setText(reason); setEditing(true); };
  const saveDecline = () => { if (!text.trim()) return; onDecline(text.trim()); setEditing(false); };

  return (
    <div className="px-6 py-3.5">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-4">
        <dt className="text-sm text-[#9AA2B2]">{field.label}</dt>
        <dd className="text-sm text-[#222733]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {missing ? (
                <span className="font-medium text-[#B42318]">Not provided</span>
              ) : field.kind === "file" ? (
                <button
                  onClick={() => onView?.(field.value)}
                  className="inline-flex items-center gap-1.5 font-medium text-[#1059BD] hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0" /> <span className="break-all">{field.value}</span>
                </button>
              ) : (
                <span className="font-medium break-words">{field.value}</span>
              )}
            </div>

            {!missing && !editing && (
              <div className="flex shrink-0 items-center gap-1.5">
                {approved ? (
                  <button
                    onClick={onClear}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FF] px-2.5 py-1 text-xs font-bold text-[#1059BD] transition hover:bg-[#C5DCFF]"
                    title="Approved — click to undo"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                  </button>
                ) : declined ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF0F4] px-2.5 py-1 text-xs font-bold text-[#6B7588]">
                      <XCircle className="h-3.5 w-3.5" /> Declined
                    </span>
                    <button onClick={openDecline} className="inline-flex h-7 items-center rounded-[8px] px-2 text-xs font-bold text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#363D4D]">
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onApprove}
                      title="Approve" aria-label="Approve"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#C5DCFF] text-[#1059BD] transition hover:bg-[#E8F2FF]"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={openDecline}
                      title="Decline" aria-label="Decline"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#DDE1E9] text-[#6B7588] transition hover:bg-[#F7F8FA]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {declined && !editing && (
            <p className="mt-2 flex items-start gap-1.5 rounded-[8px] border border-[#FECDCA] bg-white px-3 py-2 text-xs text-[#B42318]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-pre-wrap">{reason}</span>
            </p>
          )}

          {editing && (
            <div className="mt-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={2}
                placeholder="Reason for declining — tell the employee what to fix…"
                className="w-full resize-y rounded-[8px] border border-[#DDE1E9] px-3 py-2 text-sm text-[#222733] outline-none placeholder:text-[#9AA2B2] focus:border-[#2684FF]"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={saveDecline}
                  disabled={!text.trim()}
                  className="inline-flex h-8 items-center rounded-[8px] bg-[#F04438] px-3 text-xs font-bold text-white transition hover:bg-[#D92D20] disabled:cursor-not-allowed disabled:bg-[#DDE1E9] disabled:text-[#9AA2B2]"
                >
                  Save reason
                </button>
                <button onClick={() => setEditing(false)} className="inline-flex h-8 items-center rounded-[8px] px-3 text-xs font-bold text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#363D4D]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </dd>
      </div>
    </div>
  );
}

function EmployeeDetail({
  emp,
  status,
  verification,
  onDecide,
  onClear,
  onBack,
}: {
  emp: Employee;
  status: Status;
  verification: Verification | null;
  onDecide: (d: Decision, reason?: string) => void;
  onClear: () => void;
  onBack: () => void;
}) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckedAt, setRecheckedAt] = useState<string | null>(null);
  const sections = empFullSections(emp);
  const [rowStatus, setRowStatus] = useState<Record<string, "approved" | "declined">>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const approveRow = (k: string) => {
    setRowStatus((p) => ({ ...p, [k]: "approved" }));
    setReasons((p) => { const n = { ...p }; delete n[k]; return n; });
  };
  const declineRow = (k: string, r: string) => {
    setRowStatus((p) => ({ ...p, [k]: "declined" }));
    setReasons((p) => ({ ...p, [k]: r }));
  };
  const clearRow = (k: string) => {
    setRowStatus((p) => { const n = { ...p }; delete n[k]; return n; });
    setReasons((p) => { const n = { ...p }; delete n[k]; return n; });
  };
  const unverifiedFields = sections.flatMap((s) => s.rows).filter((r) => rowStatus[r.label] !== "approved").map((r) => r.label);
  const [viewDoc, setViewDoc] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const recheck = () => {
    setRechecking(true);
    window.setTimeout(() => {
      setRechecking(false);
      setRecheckedAt(todayLabel());
    }, 1600);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#9AA2B2] transition hover:text-[#222733]"
      >
        <ArrowLeft className="h-4 w-4" /> All employees
      </button>

      {/* Summary header card */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[16px] bg-white p-6">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-[#2684FF]">Employee verification</div>
          <h2 className="mt-1.5 text-2xl font-bold text-[#222733]">{emp.name}</h2>
          <div className="mt-1 text-sm text-[#9AA2B2]">
            {emp.company} · {emp.role} · {emp.country}
            {recheckedAt && !rechecking && <span> · re-checked {recheckedAt}</span>}
          </div>
        </div>
        <StatusBadge status={status} hasReason={!!verification?.reason} />
      </div>

      {/* Body */}
      <div className="mt-5 space-y-5">
          {/* Decision banners */}
          {status === "approved" && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[#2684FF]/30 bg-[#E8F2FF] px-4 py-3 text-sm font-bold text-[#1059BD]">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                Verified{verification ? ` · ${verification.at}` : ""}
                {verification?.reason && <p className="mt-1 font-medium text-[#1059BD]/80">Reason noted: {verification.reason}</p>}
              </div>
              <button onClick={onClear} className="ml-auto shrink-0 text-xs font-medium underline opacity-70 hover:opacity-100">
                Undo
              </button>
            </div>
          )}
          {status === "changes" && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[#F04438]/30 bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
              <XCircle className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                Changes requested. Waiting for the employee to update their details.
              </div>
              <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
                <button
                  onClick={() => onDecide("reverify")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#B54708] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#93370D]"
                >
                  <Check className="h-3.5 w-3.5" /> Employee updated
                </button>
                <button onClick={onClear} className="text-xs font-medium underline opacity-70 hover:opacity-100">
                  Undo
                </button>
              </div>
            </div>
          )}
          {status === "reverify" && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[#FEC84B] bg-[#FFFAEB] px-4 py-3 text-sm font-bold text-[#B54708]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                The employee updated their submission. Re-verification required.
              </div>
              <button onClick={onClear} className="ml-auto shrink-0 text-xs font-medium underline opacity-70 hover:opacity-100">
                Undo
              </button>
            </div>
          )}

          {/* Collected details — field-by-field approve / decline */}
          {sections.map((s) => {
            const missing = s.rows.filter((r) => !r.value.trim()).length;
            const declined = s.rows.filter((r) => rowStatus[r.label] === "declined").length;
            return (
              <section key={s.title} className="rounded-[16px] bg-white">
                <header className="flex items-center gap-2 border-b border-[#EEF0F4] px-6 py-3.5">
                  <h4 className="text-sm font-bold text-[#222733]">{s.title}</h4>
                  {missing > 0 && (
                    <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">
                      {missing} missing
                    </span>
                  )}
                  {declined > 0 && (
                    <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">
                      {declined} declined
                    </span>
                  )}
                </header>
                <dl className="divide-y divide-[#EEF0F4]">
                  {s.rows.map((row) => (
                    <EmpFieldRow
                      key={row.label}
                      field={row}
                      status={rowStatus[row.label]}
                      reason={reasons[row.label] ?? ""}
                      onApprove={() => approveRow(row.label)}
                      onDecline={(t) => declineRow(row.label, t)}
                      onClear={() => clearRow(row.label)}
                      onView={setViewDoc}
                    />
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            onClick={() => setVerifyOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#2684FF] px-6 text-sm font-bold text-white transition hover:bg-[#1A6FE0]"
          >
            Verify employee
          </button>
        </div>

      {verifyOpen && (
        <VerifyConfirmModal
          company={emp.name}
          unverifiedFields={unverifiedFields}
          onClose={() => setVerifyOpen(false)}
          onConfirm={(note) => {
            setVerifyOpen(false);
            onDecide("approved", note);
          }}
        />
      )}

      {viewDoc && <DocViewerModal fileName={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
}

function DocViewerModal({ fileName, onClose }: { fileName: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#222733]/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#EEF0F4] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#E8F2FF] text-[#1059BD]">
              <FileText className="h-[18px] w-[18px]" />
            </span>
            <span className="truncate text-sm font-bold text-[#222733]">{fileName}</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#F7F8FA] hover:text-[#222733]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Faux document preview */}
        <div className="flex-1 overflow-y-auto bg-[#F1F8FF] p-6">
          <div className="mx-auto w-full max-w-[460px] rounded-[10px] bg-white p-8 shadow-[0_4px_20px_rgba(34,39,51,0.08)]">
            <div className="flex items-center gap-2 border-b border-[#EEF0F4] pb-4">
              <FileText className="h-5 w-5 text-[#1059BD]" />
              <span className="text-sm font-bold text-[#222733]">{fileName}</span>
            </div>
            <div className="mt-5 space-y-2.5">
              <div className="h-3 w-2/3 rounded bg-[#EEF0F4]" />
              <div className="h-3 w-full rounded bg-[#EEF0F4]" />
              <div className="h-3 w-11/12 rounded bg-[#EEF0F4]" />
              <div className="h-3 w-4/5 rounded bg-[#EEF0F4]" />
            </div>
            <div className="mt-6 h-32 rounded-[8px] border border-dashed border-[#DDE1E9] bg-[#F7F8FA]" />
            <div className="mt-5 space-y-2.5">
              <div className="h-3 w-full rounded bg-[#EEF0F4]" />
              <div className="h-3 w-3/4 rounded bg-[#EEF0F4]" />
            </div>
            <p className="mt-6 text-center text-xs text-[#9AA2B2]">Document preview (demo)</p>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[#EEF0F4] px-5 py-3.5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-[8px] border border-[#EEF0F4] px-4 text-sm font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
          >
            Close
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#2684FF] px-4 text-sm font-bold text-white transition hover:bg-[#1A6FE0]">
            <ExternalLink className="h-4 w-4" /> Open original
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── Shell: TopBar ─────────────────────────────────────────────────────────
function TopBar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <h1 className="text-xl font-bold text-[#222733]">{title}</h1>
    </header>
  );
}

// ── List view ───────────────────────────────────────────────────────────────
function ListView({
  submissions,
  statusOf,
  verifications,
  onOpen,
}: {
  submissions: Submission[];
  statusOf: (s: Submission) => Status;
  verifications: Record<string, Verification>;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | "Low" | "Medium" | "High">("all");
  const [reportSub, setReportSub] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [requiredFilter, setRequiredFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const runAllChecks = () => {
    setRunning(true);
    window.setTimeout(() => {
      setLastRun(todayLabel());
      setRunning(false);
    }, 1600);
  };

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
    const matchesCountry = countryFilter === "all" || str(r.sub.draft, "countryOfIncorporation") === countryFilter;
    const matchesRequired =
      requiredFilter === "all" ||
      (requiredFilter === "complete" ? r.miss === 0 : r.miss > 0);
    return matchesQuery && matchesStatus && matchesRisk && matchesCountry && matchesRequired;
  });

  // Distinct countries present in the data, for the Country column filter.
  const countryOptions = Array.from(
    new Set(rows.map((r) => str(r.sub.draft, "countryOfIncorporation")).filter(Boolean)),
  ).sort();

  const total = rows.length;
  const atReview = rows.filter((r) => r.status === "review" || r.status === "reverify").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const highRisk = rows.filter((r) => r.report.risk === "High").length;

  return (
    <div className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#222733]">Verification dashboard</h2>
          <p className="mt-1 text-sm text-[#9AA2B2]">Client onboarding, KYC completeness and AI due-diligence risk at a glance.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={runAllChecks}
            disabled={running}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#2684FF] px-4 text-sm font-bold text-white transition hover:bg-[#1A6FE0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {running ? "Re-running AI checks…" : "Run AI check again"}
          </button>
          {lastRun && !running && (
            <span className="text-xs text-[#9AA2B2]">All clients re-screened {lastRun}</span>
          )}
        </div>
      </div>

      {/* Metric cards — click to filter the table below */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total clients"
          value={total}
          sublabel="organizations onboarding"
          onClick={() => {
            setStatusFilter("all");
            setRiskFilter("all");
          }}
        />
        <StatCard
          label="At review"
          value={atReview}
          sublabel="awaiting verification"
          active={statusFilter === "review"}
          onClick={() => {
            setStatusFilter(statusFilter === "review" ? "all" : "review");
            setRiskFilter("all");
          }}
        />
        <StatCard
          label="Verified"
          value={approved}
          sublabel="verified & active"
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
          active={riskFilter === "High"}
          onClick={() => {
            setRiskFilter(riskFilter === "High" ? "all" : "High");
            setStatusFilter("all");
          }}
        />
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
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#EEF0F4] bg-[#F7F8FA] text-xs text-[#9AA2B2]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all submissions"
                  className="h-4 w-4 cursor-pointer accent-[#2684FF]"
                  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.sub.id))}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        filtered.some((r) => selected.has(r.sub.id)) &&
                        !filtered.every((r) => selected.has(r.sub.id));
                  }}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(filtered.map((r) => r.sub.id)) : new Set())
                  }
                />
              </th>
              <Th>Company</Th>
              <Th>Submitted</Th>
              <FilterTh
                label="Required fields"
                value={requiredFilter}
                onChange={(v) => setRequiredFilter(v as "all" | "complete" | "incomplete")}
                options={[
                  { id: "all", label: "All" },
                  { id: "complete", label: "Complete" },
                  { id: "incomplete", label: "Incomplete" },
                ]}
              />
              <FilterTh
                label="AI report"
                value={riskFilter}
                onChange={(v) => setRiskFilter(v as "all" | "Low" | "Medium" | "High")}
                options={[
                  { id: "all", label: "All risk" },
                  { id: "Low", label: "Low risk" },
                  { id: "Medium", label: "Medium risk" },
                  { id: "High", label: "High risk" },
                ]}
              />
              <FilterTh
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | Status)}
                options={[
                  { id: "all", label: "All status" },
                  { id: "review", label: "At review" },
                  { id: "approved", label: "Verified" },
                  { id: "changes", label: "Changes requested" },
                  { id: "reverify", label: "Re-verify" },
                ]}
              />
              <Th>Notes</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-[#9AA2B2]">
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
                  className="cursor-pointer border-b border-[#EEF0F4] transition last:border-b-0 hover:bg-[#F7F8FA]"
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${str(d, "legalCompanyName") || s.id}`}
                      className="h-4 w-4 cursor-pointer accent-[#2684FF]"
                      checked={selected.has(s.id)}
                      onChange={() => toggleOne(s.id)}
                    />
                  </td>
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
                    <StatusBadge status={statusOf(s)} hasReason={!!verifications[s.id]?.reason} />
                    {statusOf(s) === "approved" && verifications[s.id] && (
                      <div className="mt-1.5 text-[11px] leading-snug text-[#9AA2B2]">
                        {verifications[s.id].by} · {verifications[s.id].at}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {statusOf(s) === "approved" && verifications[s.id]?.reason ? (
                      <span
                        className="block max-w-[220px] truncate text-sm text-[#6B7588]"
                        title={verifications[s.id].reason}
                      >
                        “{verifications[s.id].reason}”
                      </span>
                    ) : (
                      <span className="text-sm text-[#C4CAD4]">—</span>
                    )}
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
      className={`inline-flex items-center rounded-full ${tone.bg} px-3 py-1 text-xs font-bold ${tone.text} transition hover:brightness-[0.97]`}
    >
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

  const [rechecking, setRechecking] = useState(false);
  const [recheckedAt, setRecheckedAt] = useState<string | null>(null);
  const recheck = () => {
    setRechecking(true);
    window.setTimeout(() => {
      setRechecking(false);
      setRecheckedAt(todayLabel());
    }, 1600);
  };

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
            <div className="mt-1 text-xs text-[#9AA2B2]">
              {country}
              {recheckedAt && !rechecking && <span> · re-checked {recheckedAt}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={recheck}
              disabled={rechecking}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#EEF0F4] px-3 text-xs font-bold text-[#363D4D] transition hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RotateCw className={`h-3.5 w-3.5 ${rechecking ? "animate-spin" : ""}`} />
              {rechecking ? "Re-checking…" : "Recheck"}
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#9AA2B2] transition hover:bg-[#EEF0F4] hover:text-[#222733]"
              aria-label="Close report"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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

// Short date label used when an AI check is re-run.
function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
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

function FilterTh({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== "all";
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <div className="relative inline-block">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[#9AA2B2] transition hover:text-[#363D4D]"
        >
          {label}
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""} ${active ? "opacity-100" : "opacity-50"}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <ul className="absolute left-0 z-20 mt-1 max-h-64 w-48 overflow-auto rounded-[10px] border border-[#EEF0F4] bg-white py-1 text-left shadow-lg">
              {options.map((o) => (
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
    </th>
  );
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

function StatusBadge({ status, hasReason }: { status: Status; hasReason?: boolean }) {
  const map: Record<Status, { label: string; cls: string }> = {
    review: { label: "At review", cls: "bg-[#EFF4FF] text-[#1059BD]" },
    approved: hasReason
      ? { label: "Verified with reason", cls: "bg-[#ECFDF3] text-[#067647]" }
      : { label: "Verified", cls: "bg-[#ECFDF3] text-[#067647]" },
    changes: { label: "Changes requested", cls: "bg-[#FFFAEB] text-[#B54708]" },
    reverify: { label: "Re-verify", cls: "bg-[#FFFAEB] text-[#B54708]" },
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
  verification,
  onDecide,
  onClearDecision,
}: {
  sub: Submission;
  status: Status;
  onBack: () => void;
  decision: Decision | null;
  verification: Verification | null;
  onDecide: (d: Decision, reason?: string) => void;
  onClearDecision: () => void;
}) {
  const d = sub.draft;
  // Per-field decisions and (for declines) the reason shown to the client.
  const [rowStatus, setRowStatus] = useState<Record<string, "approved" | "declined">>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const report = aiReportFor(sub);

  const miss = missingCount(d);

  // Fields the reviewer hasn't individually marked "approved" yet.
  const visibleRows = SECTIONS.flatMap((s) => s.rows.filter((r) => !r.hidden?.(d)));
  const unverifiedFields = visibleRows
    .filter((r) => rowStatus[r.key] !== "approved")
    .map((r) => ROW_LABELS[r.key] ?? r.key);

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
          <StatusBadge status={status} hasReason={!!verification?.reason} />
        </div>
      </section>

      {/* AI findings — surfaced alongside the manual detail check */}
      <AiFindingsCard report={report} onOpen={() => setReportOpen(true)} />

      {decision === "approved" && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[#2684FF]/30 bg-[#E8F2FF] px-4 py-3 text-sm font-bold text-[#1059BD]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            Submission verified{verification ? ` by ${verification.by} · ${verification.at}` : ""}.
            {verification?.reason && (
              <p className="mt-1 font-medium text-[#1059BD]/80">Reason noted: {verification.reason}</p>
            )}
          </div>
          <button onClick={onClearDecision} className="ml-auto shrink-0 text-xs font-medium underline opacity-70 hover:opacity-100">
            Undo
          </button>
        </div>
      )}

      {decision === "changes" && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[#F04438]/30 bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
          <XCircle className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            Changes requested. Waiting for the applicant to update their details.
            <p className="mt-1 font-medium text-[#B42318]/80">
              Once the client resubmits, mark their changes received — the submission then needs to be verified again.
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
            <button
              onClick={() => onDecide("reverify")}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#B54708] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#93370D]"
            >
              <Check className="h-3.5 w-3.5" /> Client made changes
            </button>
            <button onClick={onClearDecision} className="text-xs font-medium underline opacity-70 hover:opacity-100">
              Undo
            </button>
          </div>
        </div>
      )}

      {decision === "reverify" && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[#FEC84B] bg-[#FFFAEB] px-4 py-3 text-sm font-bold text-[#B54708]">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            The client updated their submission. Re-verification required.
            <p className="mt-1 font-medium text-[#B54708]/80">Review the fields again, then verify the submission.</p>
          </div>
          <button onClick={onClearDecision} className="ml-auto shrink-0 text-xs font-medium underline opacity-70 hover:opacity-100">
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
              disabled={miss > 0}
              onClick={() => setVerifyOpen(true)}
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

      {verifyOpen && (
        <VerifyConfirmModal
          company={company}
          unverifiedFields={unverifiedFields}
          onClose={() => setVerifyOpen(false)}
          onConfirm={(note) => {
            setVerifyOpen(false);
            onDecide("approved", note);
          }}
        />
      )}
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
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2684FF]" />
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
          {on ? <Check className="h-4 w-4 text-[#2684FF]" /> : <XCircle className="h-4 w-4 text-[#9AA2B2]" />}
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

// ── Verify confirmation (asks for a reason when fields are unverified) ────────
function VerifyConfirmModal({
  company,
  unverifiedFields,
  onClose,
  onConfirm,
}: {
  company: string;
  unverifiedFields: string[];
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [reason, setReason] = useState("");
  const hasUnverified = unverifiedFields.length > 0;
  const canConfirm = !hasUnverified || !!reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#222733]/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-[#EEF0F4] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#EEF0F4] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F2FF] text-[#1059BD]">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#222733]">Verify submission</h3>
              <p className="text-xs text-[#9AA2B2]">{company}</p>
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
          <p className="text-sm text-[#363D4D]">
            Verifying marks this client as approved and notifies the applicant. This is recorded as your verification decision.
          </p>

          {hasUnverified && (
            <div className="rounded-[12px] border border-[#FEC84B] bg-[#FFFAEB] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B54708]" />
                <div className="min-w-0 text-sm text-[#B54708]">
                  <p className="font-bold">
                    {unverifiedFields.length} field{unverifiedFields.length > 1 ? "s" : ""} not verified
                  </p>
                  <p className="mt-1 text-[#B54708]/80">
                    {unverifiedFields.slice(0, 6).join(", ")}
                    {unverifiedFields.length > 6 ? `, +${unverifiedFields.length - 6} more` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">
              {hasUnverified ? "Reason for verifying anyway" : "Note (optional)"}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                hasUnverified
                  ? "Explain why this can be verified without checking every field…"
                  : "Add an optional note for the record…"
              }
              className="mt-1.5 w-full resize-y rounded-[10px] border border-[#DDE1E9] px-3 py-2.5 text-sm leading-relaxed text-[#222733] outline-none focus:border-[#2684FF]"
            />
            {hasUnverified && (
              <span className="mt-1 block text-xs text-[#9AA2B2]">A reason is required because some fields are not verified.</span>
            )}
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[#EEF0F4] px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[10px] border border-[#EEF0F4] px-4 text-sm font-bold text-[#363D4D] transition hover:bg-[#F7F8FA]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#2684FF] px-5 text-sm font-bold text-white transition hover:bg-[#1A6FE0] disabled:cursor-not-allowed disabled:bg-[#DDE1E9] disabled:text-[#9AA2B2]"
          >
            <CheckCircle2 className="h-4 w-4" /> Confirm &amp; verify
          </button>
        </footer>
      </div>
    </div>
  );
}
