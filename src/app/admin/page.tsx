"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  Home,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

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
  submittedAt: string; // display string
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
  willReceiveBillingComms: true, billingContactName: "", billingContactEmail: "",
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
  willReceiveBillingComms: false, billingContactName: "", billingContactEmail: "",
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
  const router = useRouter();
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
    <div className="flex min-h-screen bg-[#EEF3FA] text-foreground">
      <Sidebar onLogo={() => setSelectedId(null)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={selected ? "Onboarding" : "Onboarding"} />
        <div className="flex-1 p-6">
          {selected ? (
            <DetailView
              sub={selected}
              status={statusOf(selected)}
              onBack={() => setSelectedId(null)}
              decision={decisions[selected.id] ?? null}
              onDecide={(d) =>
                setDecisions((prev) => ({ ...prev, [selected.id]: d }))
              }
              onClearDecision={() =>
                setDecisions((prev) => {
                  const next = { ...prev };
                  delete next[selected.id];
                  return next;
                })
              }
            />
          ) : (
            <ListView
              submissions={submissions}
              statusOf={statusOf}
              onOpen={(id) => setSelectedId(id)}
              onRefresh={load}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shell: Sidebar ──────────────────────────────────────────────────────────
function Sidebar({ onLogo }: { onLogo: () => void }) {
  const items = [
    { label: "Home", icon: Home, active: false },
    { label: "Freelancers", icon: Users, active: false },
    { label: "Invoices", icon: FileText, active: false },
    { label: "Verification", icon: ShieldCheck, active: true },
  ];
  return (
    <aside className="hidden w-[208px] shrink-0 flex-col border-r border-[#E6EBF2] bg-white px-3 py-5 md:flex">
      <button onClick={onLogo} className="mb-6 flex items-center px-2">
        <Image
          src="/wisemonk-logo.png"
          alt="Wisemonk"
          width={307}
          height={65}
          priority
          className="block h-[26px] w-auto object-contain"
        />
      </button>
      <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#9aa3b2]">
        Workspace
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <a
              key={it.label}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                it.active
                  ? "bg-accent text-primary"
                  : "text-[#5b6473] hover:bg-[#F3F6FB]"
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
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-[10px] border border-[#E6EBF2] bg-white px-3 py-2 text-sm text-muted-foreground sm:flex">
          <Search className="h-4 w-4" />
          <span className="text-[#9aa3b2]">Quick actions</span>
          <kbd className="ml-6 rounded-[6px] border border-[#E6EBF2] bg-[#F3F6FB] px-1.5 py-0.5 text-[11px] font-medium text-[#9aa3b2]">
            Ctrl K
          </kbd>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#5b6473] transition hover:bg-white">
          <Bell className="h-5 w-5" />
        </button>
        <button className="flex items-center gap-2 rounded-full border border-[#E6EBF2] bg-white py-1 pl-1 pr-2.5 transition hover:bg-[#F3F6FB]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            AS
          </span>
          <span className="text-sm font-bold text-foreground">Aman Singh</span>
          <ChevronDown className="h-4 w-4 text-[#9aa3b2]" />
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
  onRefresh,
}: {
  submissions: Submission[];
  statusOf: (s: Submission) => Status;
  onOpen: (id: string) => void;
  onRefresh: () => void;
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
    <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-6">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve organization onboarding submissions.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-brand-600"
        >
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total submissions" value={total} sublabel="organizations onboarding" />
        <StatCard label="Pending review" value={pending} sublabel="awaiting verification" />
        <StatCard label="Approved" value={approved} sublabel="verified & active" />
      </div>

      {/* Table section */}
      <h3 className="mt-7 text-sm font-bold text-foreground">Onboarding submissions</h3>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b2]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-[10px] border border-[#E6EBF2] pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa3b2] focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E6EBF2] px-3 text-sm font-medium text-[#5b6473]">
            <Calendar className="h-4 w-4" /> All time <ChevronDown className="h-4 w-4 text-[#9aa3b2]" />
          </button>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-y border-[#EEF1F6] bg-[#FAFBFD] text-xs text-[#9aa3b2]">
              <Th>Company</Th>
              <Th>Entity &amp; country</Th>
              <Th>Submitted</Th>
              <Th>Required fields</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
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
                  className="cursor-pointer border-b border-[#EEF1F6] transition hover:bg-[#F7F9FC]"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      {str(d, "legalCompanyName") || "Unnamed company"}
                      {s.source === "live" && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {str(d, "signatoryName") || "—"}
                      {str(d, "designation") && ` · ${str(d, "designation")}`}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    <span className="inline-flex items-center rounded-full bg-[#F1F3F7] px-2.5 py-1 text-xs font-medium text-[#5b6473]">
                      {str(d, "entityType") || "—"}
                    </span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {str(d, "countryOfIncorporation") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{s.submittedAt}</td>
                  <td className="px-4 py-4 text-sm">
                    {miss === 0 ? (
                      <span className="font-medium text-wm-positive">{req}/{req} complete</span>
                    ) : (
                      <span className="font-medium text-destructive">{req - miss}/{req} · {miss} missing</span>
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#9aa3b2] transition hover:bg-[#EEF1F6] hover:text-foreground"
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
    <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-5">
      <p className="text-sm font-bold text-[#5b6473]">{label}</p>
      <p className="mt-1.5 text-[32px] font-bold leading-none text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: Status | "all";
  onChange: (v: Status | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const opts: { id: Status | "all"; label: string }[] = [
    { id: "all", label: "All status" },
    { id: "pending", label: "Pending" },
    { id: "incomplete", label: "Incomplete" },
    { id: "approved", label: "Approved" },
    { id: "changes", label: "Changes requested" },
  ];
  const current = opts.find((o) => o.id === value)?.label ?? "All status";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E6EBF2] px-3 text-sm font-medium text-[#5b6473]"
      >
        {current} <ChevronDown className="h-4 w-4 text-[#9aa3b2]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-[10px] border border-[#E6EBF2] bg-white py-1 shadow-lg">
            {opts.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#F3F6FB] ${
                    value === o.id ? "font-bold text-primary" : "text-foreground"
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
    pending: { label: "Pending", cls: "bg-wm-warning/20 text-[#8a7700]" },
    incomplete: { label: "Incomplete", cls: "bg-destructive/10 text-destructive" },
    approved: { label: "Approved", cls: "bg-wm-positive/10 text-wm-positive" },
    changes: { label: "Changes requested", cls: "bg-destructive/10 text-destructive" },
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
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  const req = requiredCount(d);
  const miss = missingCount(d);
  const complete = req - miss;
  const pct = req ? Math.round((complete / req) * 100) : 0;
  const allVerified = SECTIONS.every((s) => verified[s.id]);

  const company = str(d, "legalCompanyName") || "Unnamed company";
  const subtitle = [str(d, "entityType"), str(d, "countryOfIncorporation")].filter(Boolean).join(" · ");
  const missingList = SECTIONS.flatMap((s) => s.rows.filter((r) => rowIsMissing(r, d)).map((r) => r.label));

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All submissions
      </button>

      {/* Applicant summary card */}
      <section className="rounded-[16px] border border-[#E6EBF2] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Onboarding verification
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">{company}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <p className="mt-2 text-sm text-foreground">
              Signatory: <span className="font-bold">{str(d, "signatoryName") || "—"}</span>
              {str(d, "designation") && <span className="text-muted-foreground"> · {str(d, "designation")}</span>}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-foreground">Required fields</span>
            <span className="text-muted-foreground">{complete} of {req} complete</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EEF1F6]">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-wm-positive" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {missingList.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missingList.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                >
                  <AlertTriangle className="h-3 w-3" /> {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {decision && (
        <div
          className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-sm font-bold ${
            decision === "approved"
              ? "border-wm-positive/30 bg-wm-positive/10 text-wm-positive"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {decision === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {decision === "approved"
            ? "Submission approved. The applicant has been notified."
            : "Changes requested. The applicant has been asked to update their details."}
          <button onClick={onClearDecision} className="ml-auto text-xs font-medium underline opacity-70 hover:opacity-100">
            Undo
          </button>
        </div>
      )}

      {/* Field sections */}
      {SECTIONS.map((s) => {
        const sectionMissing = s.rows.some((r) => rowIsMissing(r, d));
        return (
          <section key={s.id} className="rounded-[16px] border border-[#E6EBF2] bg-white">
            <header className="flex items-center justify-between border-b border-[#EEF1F6] px-6 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                {sectionMissing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Incomplete
                  </span>
                )}
              </div>
              <button
                onClick={() => setVerified((v) => ({ ...v, [s.id]: !v[s.id] }))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  verified[s.id]
                    ? "bg-wm-positive/10 text-wm-positive"
                    : "border border-[#E6EBF2] text-muted-foreground hover:bg-[#F3F6FB]"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {verified[s.id] ? "Verified" : "Mark verified"}
              </button>
            </header>
            <dl className="divide-y divide-[#EEF1F6]">
              {s.rows.map((row) => (row.hidden?.(d) ? null : <FieldRow key={row.key} row={row} draft={d} />))}
            </dl>
          </section>
        );
      })}

      {/* Actions */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!allVerified && (
          <span className="text-sm text-muted-foreground sm:mr-auto">Mark every section verified to approve.</span>
        )}
        <button
          onClick={() => onDecide("changes")}
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-destructive px-6 text-sm font-bold text-destructive transition hover:bg-destructive/5"
        >
          Request changes
        </button>
        <button
          disabled={!allVerified || miss > 0}
          onClick={() => onDecide("approved")}
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-primary px-7 text-sm font-bold text-primary-foreground transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
        >
          Approve submission
        </button>
      </div>
    </div>
  );
}

function FieldRow({ row, draft }: { row: Row; draft: Draft }) {
  const missing = rowIsMissing(row, draft);
  return (
    <div className="grid grid-cols-1 gap-1 px-6 py-3.5 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-4">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {row.label}
        {row.required?.(draft) && <span className="text-destructive">*</span>}
      </dt>
      <dd className="text-sm text-foreground">
        <RowValue row={row} draft={draft} missing={missing} />
      </dd>
    </div>
  );
}

function RowValue({ row, draft, missing }: { row: Row; draft: Draft; missing: boolean }) {
  if (missing) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-destructive">
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
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-wm-positive" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "bool": {
      const on = bool(draft, row.key);
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium ${on ? "text-foreground" : "text-muted-foreground"}`}>
          {on ? <Check className="h-4 w-4 text-wm-positive" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
          {on ? row.trueLabel ?? "Yes" : row.falseLabel ?? "No"}
        </span>
      );
    }
    case "file": {
      const name = str(draft, row.key);
      if (!name) return <Empty />;
      return (
        <span className="inline-flex items-center gap-2 rounded-[8px] border border-[#E6EBF2] bg-[#F7F9FC] px-2.5 py-1 font-medium">
          <FileText className="h-4 w-4 text-primary" />
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
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
    >
      {url}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}
