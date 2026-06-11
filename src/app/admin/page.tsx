"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Mail,
  MoreHorizontal,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
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

  const filtered = submissions.filter((s) => {
    const matchesQuery =
      !query.trim() ||
      str(s.draft, "legalCompanyName").toLowerCase().includes(query.toLowerCase()) ||
      str(s.draft, "signatoryName").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || statusOf(s) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const total = submissions.length;
  const pending = submissions.filter((s) => statusOf(s) === "pending" || statusOf(s) === "incomplete").length;
  const approved = submissions.filter((s) => statusOf(s) === "approved").length;

  return (
    <div className="rounded-[16px] border border-[#EEF0F4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#222733]">Verification</h2>
          <p className="mt-1 text-sm text-[#9AA2B2]">Review and approve organization onboarding submissions.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total submissions" value={total} sublabel="organizations onboarding" />
        <StatCard label="Pending review" value={pending} sublabel="awaiting verification" />
        <StatCard label="Verified" value={approved} sublabel="verified & active" />
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
          <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#EEF0F4] px-3 text-sm font-medium text-[#363D4D]">
            <Calendar className="h-4 w-4" /> All time <ChevronDown className="h-4 w-4 text-[#9AA2B2]" />
          </button>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-y border-[#EEF0F4] bg-[#F7F8FA] text-xs text-[#9AA2B2]">
              <Th>Company</Th>
              <Th>Country</Th>
              <Th>Submitted</Th>
              <Th>Required fields</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[#9AA2B2]">
                  No submissions match your filters.
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const d = s.draft;
              const req = requiredCount(d);
              const miss = missingCount(d);
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
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function StatCard({ label, value, sublabel }: { label: string; value: number; sublabel: string }) {
  return (
    <div className="rounded-[14px] border border-[#EEF0F4] bg-white p-5">
      <p className="text-sm font-bold text-[#363D4D]">{label}</p>
      <p className="mt-1.5 text-[32px] font-bold leading-none text-[#222733]">{value}</p>
      <p className="mt-2 text-xs text-[#9AA2B2]">{sublabel}</p>
    </div>
  );
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
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]?.id ?? "");

  // Scroll-spy: highlight the checklist item for the section currently in view.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`sec-${s.id}`)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id.replace("sec-", ""));
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sub.id]);

  const jumpTo = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

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

      {/* Checklist nav + field sections */}
      <div className="grid items-start gap-5 lg:grid-cols-[244px_minmax(0,1fr)]">
        <ChecklistNav
          draft={d}
          rowStatus={rowStatus}
          active={activeSection}
          onJump={jumpTo}
        />

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
                        emailed={emailSent && rowStatus[row.key] === "declined"}
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
    </div>
  );
}

// ── Detail view: sticky checklist / section navigation ──────────────────────
function ChecklistNav({
  draft,
  rowStatus,
  active,
  onJump,
}: {
  draft: Draft;
  rowStatus: Record<string, "approved" | "declined">;
  active: string;
  onJump: (id: string) => void;
}) {
  return (
    <nav className="lg:sticky lg:top-6">
      <div className="rounded-[16px] border border-[#EEF0F4] bg-white p-4">
        <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Sections</p>
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            const visible = s.rows.filter((r) => !r.hidden?.(draft));
            const miss = visible.filter((r) => rowIsMissing(r, draft)).length;
            const declinedN = visible.filter((r) => rowStatus[r.key] === "declined").length;
            const approvedN = visible.filter((r) => rowStatus[r.key] === "approved").length;
            const allApproved = visible.length > 0 && approvedN === visible.length;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onJump(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm transition ${
                    isActive ? "bg-[#E8F2FF] font-bold text-[#1059BD]" : "text-[#363D4D] hover:bg-[#F7F8FA]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      allApproved
                        ? "bg-[#12B76A] text-white"
                        : isActive
                          ? "bg-[#2684FF] text-white"
                          : "border border-[#DDE1E9]"
                    }`}
                  >
                    {allApproved && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {miss > 0 && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F04438]" title={`${miss} missing`} />
                  )}
                  {declinedN > 0 && (
                    <span
                      className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#FFF1F0] px-1 text-[10px] font-bold text-[#B42318]"
                      title={`${declinedN} declined`}
                    >
                      {declinedN}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function FieldRow({
  row,
  draft,
  status,
  reason,
  emailed,
  onApprove,
  onDecline,
  onClear,
}: {
  row: Row;
  draft: Draft;
  status: "approved" | "declined" | undefined;
  reason: string;
  emailed: boolean;
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
    <div className={`px-6 py-3.5 transition ${declined ? "bg-[#FFF1F0]" : ""}`}>
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
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[#A6F4C5] px-2.5 py-1 text-xs font-bold text-[#027A48] transition hover:bg-[#E6F9F0]"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={openDecline}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[#FECDCA] px-2.5 py-1 text-xs font-bold text-[#B42318] transition hover:bg-[#FFF1F0]"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {declined && !editing && (
            <div className="mt-2 space-y-1">
              <p className="flex items-start gap-1.5 rounded-[8px] border border-[#FECDCA] bg-white px-3 py-2 text-xs text-[#B42318]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-pre-wrap">{reason}</span>
              </p>
              <p className="flex items-center gap-1 pl-1 text-[11px] font-medium text-[#9AA2B2]">
                {emailed ? (
                  <>
                    <Mail className="h-3 w-3 text-[#1059BD]" />
                    <span className="text-[#1059BD]">Emailed to client</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3" />
                    Not yet emailed — included in next email to client
                  </>
                )}
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
const EMAIL_TONES: { id: EmailTone; label: string; hint: string }[] = [
  { id: "professional", label: "Professional", hint: "Formal and polished" },
  { id: "friendly", label: "Friendly", hint: "Warm and approachable" },
  { id: "concise", label: "Concise", hint: "Short and to the point" },
];

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
  const [tone, setTone] = useState<EmailTone>("professional");
  const [subject, setSubject] = useState(`Action needed: ${company}'s onboarding verification`);
  const [body, setBody] = useState(() => buildEmailBody("professional", company, signatory, declined));
  const [to, setTo] = useState(toEmail);
  const [polishOpen, setPolishOpen] = useState(false);

  const polish = (t: EmailTone) => {
    setTone(t);
    setBody(buildEmailBody(t, company, signatory, declined));
    setPolishOpen(false);
  };

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

          {declined.length > 0 && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FFF1F0] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#B42318]">
                <XCircle className="h-3.5 w-3.5" />
                {declined.length} declined field{declined.length > 1 ? "s" : ""} included
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-[#B42318]/90">
                {declined.map((f) => (
                  <li key={f.key}>• {f.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#9AA2B2]">Message</span>
              <div className="relative">
                <button
                  onClick={() => setPolishOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#EEF0F4] px-2.5 py-1 text-xs font-bold text-[#1059BD] transition hover:bg-[#E8F2FF]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Polish
                  <ChevronDown className="h-3 w-3 text-[#9AA2B2]" />
                </button>
                {polishOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPolishOpen(false)} />
                    <ul className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-[10px] border border-[#EEF0F4] bg-white py-1 shadow-lg">
                      {EMAIL_TONES.map((t) => (
                        <li key={t.id}>
                          <button
                            onClick={() => polish(t.id)}
                            className={`flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-[#F7F8FA] ${
                              tone === t.id ? "bg-[#F7F8FA]" : ""
                            }`}
                          >
                            <span
                              className={`text-sm font-bold ${tone === t.id ? "text-[#1059BD]" : "text-[#222733]"}`}
                            >
                              {t.label}
                            </span>
                            <span className="text-xs text-[#9AA2B2]">{t.hint}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1.5 w-full resize-y rounded-[10px] border border-[#DDE1E9] px-3 py-2.5 text-sm leading-relaxed text-[#222733] outline-none focus:border-[#2684FF]"
            />
            <p className="mt-1 text-[11px] text-[#9AA2B2]">
              &ldquo;Polish&rdquo; rewrites the message in the selected tone — currently{" "}
              <span className="font-bold text-[#363D4D]">{EMAIL_TONES.find((t) => t.id === tone)?.label}</span>.
            </p>
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
