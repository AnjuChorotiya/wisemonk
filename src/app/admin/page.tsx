"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
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

// ── Row descriptor model ────────────────────────────────────────────────────
type RowKind = "text" | "url" | "bool" | "file" | "multi";
type Row = {
  key: string;
  label: string;
  kind: RowKind;
  options?: { id: string; label: string }[];
  trueLabel?: string;
  falseLabel?: string;
  // Whether the field is required (may depend on the rest of the draft).
  required?: (d: Draft) => boolean;
  // Override the displayed value entirely.
  value?: (d: Draft) => string | string[] | null;
  // Hide the row entirely depending on draft state.
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
      {
        key: "sanctionsChecked",
        label: "AML / sanctions declarations",
        kind: "multi",
        options: SANCTIONS_ITEMS,
        required: () => true,
      },
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
      {
        key: "sensitiveDataTypes",
        label: "Sensitive data handled",
        kind: "multi",
        options: SENSITIVE_DATA_OPTS,
        required: () => true,
      },
      {
        key: "regulatoryBodies",
        label: "Regulatory oversight",
        kind: "multi",
        options: REGULATORY_OPTS,
        required: () => true,
      },
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

// A representative completed submission, used when no real draft exists in this
// browser (e.g. when a reviewer opens the page directly on the hosted demo).
const SAMPLE_DRAFT: Draft = {
  signatoryName: "Jordan Mehta",
  designation: "CFO",
  legalCompanyName: "Acme Corp",
  entityType: "Private Limited Company",
  industry: "Technology / SaaS",
  teamSize: "51–200",
  countryOfIncorporation: "United States",
  companyWebsite: "https://acme.com",
  noCompanyWebsite: false,
  companyDescription: "A leading technology company providing SaaS solutions.",
  addressStreet: "500 Market Street, Suite 1200",
  addressCity: "San Francisco",
  addressState: "California",
  addressZip: "94105",
  proofFileName: "utility-bill-mar-2026.pdf",
  billingCurrency: "USD",
  willReceiveBillingComms: false,
  billingContactName: "Priya Nair",
  billingContactEmail: "billing@acme.com",
  taxRegNumber: "US-EIN-84-3920175",
  taxCertFileName: "acme-tax-certificate.pdf",
  directorName: "Jordan Mehta",
  govIdFileName: "director-passport.pdf",
  hasMajorityOwner: true,
  sanctionsChecked: ["legit_funds", "no_sanctions", "aml", "no_pep"],
  prohibitedIndustriesAck: true,
  hasIndiaEntity: "no",
  sensitiveDataTypes: ["pii", "financial"],
  regulatoryBodies: ["sec", "gdpr"],
  msaReviewed: true,
};

// ── Field status ────────────────────────────────────────────────────────────
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
    case "file":
    case "text":
    case "url":
    default:
      return !!str(d, row.key);
  }
}

function rowIsMissing(row: Row, d: Draft): boolean {
  if (row.hidden?.(d)) return false;
  if (!row.required?.(d)) return false;
  return !rowIsFilled(row, d);
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [usingSample, setUsingSample] = useState(false);
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<"approved" | "changes" | null>(null);

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setDraft(JSON.parse(raw));
        setUsingSample(false);
        return;
      }
    } catch {
      /* fall through to empty */
    }
    setDraft(null);
  };

  useEffect(() => {
    load();
  }, []);

  const active: Draft | null = draft;

  const stats = useMemo(() => {
    if (!active) return { required: 0, complete: 0, missing: [] as { section: string; label: string }[] };
    let required = 0;
    let complete = 0;
    const missing: { section: string; label: string }[] = [];
    for (const s of SECTIONS) {
      for (const row of s.rows) {
        if (row.hidden?.(active)) continue;
        if (row.required?.(active)) {
          required += 1;
          if (rowIsMissing(row, active)) missing.push({ section: s.title, label: row.label });
          else complete += 1;
        }
      }
    }
    return { required, complete, missing };
  }, [active]);

  const allVerified = SECTIONS.every((s) => verified[s.id]);
  const pct = stats.required ? Math.round((stats.complete / stats.required) * 100) : 0;

  const loadSample = () => {
    setDraft(SAMPLE_DRAFT);
    setUsingSample(true);
    setDecision(null);
    setVerified({});
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!active) {
    return (
      <main className="min-h-screen bg-muted">
        <TopBar onBack={() => router.push("/onboarding/organization")} onRefresh={load} />
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">No submission found</h1>
          <p className="max-w-md text-base text-muted-foreground">
            There&apos;s no saved onboarding draft in this browser. Complete the organization
            onboarding first, or load a sample submission to preview the verification screen.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              onClick={loadSample}
              className="inline-flex h-11 items-center rounded-[8px] bg-primary px-6 text-base font-bold text-primary-foreground transition hover:bg-brand-600"
            >
              Load sample submission
            </button>
            <button
              onClick={() => router.push("/onboarding/organization")}
              className="inline-flex h-11 items-center rounded-[8px] border border-border px-6 text-base font-bold text-foreground transition hover:bg-background"
            >
              Open onboarding
            </button>
          </div>
        </div>
      </main>
    );
  }

  const companyName = str(active, "legalCompanyName") || "Unnamed company";
  const subtitle = [str(active, "entityType"), str(active, "countryOfIncorporation")]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-muted pb-24">
      <TopBar onBack={() => router.push("/onboarding/organization")} onRefresh={load} />

      <div className="mx-auto max-w-4xl px-6 py-8">
        {usingSample && (
          <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            Showing a <span className="font-bold text-foreground">sample submission</span> — no real
            draft was found in this browser.
          </div>
        )}

        {/* Applicant summary */}
        <section className="rounded-[14px] border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Onboarding verification
              </p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{companyName}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              <p className="mt-2 text-sm text-foreground">
                Signatory:{" "}
                <span className="font-bold">{str(active, "signatoryName") || "—"}</span>
                {str(active, "designation") && (
                  <span className="text-muted-foreground"> · {str(active, "designation")}</span>
                )}
              </p>
            </div>
            <StatusPill missing={stats.missing.length} decision={decision} />
          </div>

          {/* Completeness bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-foreground">Required fields</span>
              <span className="text-muted-foreground">
                {stats.complete} of {stats.required} complete
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  pct === 100 ? "bg-wm-positive" : "bg-primary"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {stats.missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stats.missing.map((m) => (
                  <span
                    key={m.section + m.label}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                  >
                    <AlertTriangle className="h-3 w-3" /> {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Decision banner */}
        {decision && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-[12px] border px-4 py-3 text-sm font-bold ${
              decision === "approved"
                ? "border-wm-positive/30 bg-wm-positive/10 text-wm-positive"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {decision === "approved" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {decision === "approved"
              ? "Submission approved. The applicant has been notified."
              : "Changes requested. The applicant has been asked to update their details."}
            <button
              onClick={() => setDecision(null)}
              className="ml-auto text-xs font-medium underline opacity-70 hover:opacity-100"
            >
              Undo
            </button>
          </div>
        )}

        {/* Field sections */}
        <div className="mt-6 space-y-5">
          {SECTIONS.map((s) => {
            const sectionMissing = s.rows.some((r) => rowIsMissing(r, active));
            return (
              <section key={s.id} className="rounded-[14px] border border-border bg-background shadow-sm">
                <header className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{s.title}</h2>
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
                        : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {verified[s.id] ? "Verified" : "Mark verified"}
                  </button>
                </header>
                <dl className="divide-y divide-border">
                  {s.rows.map((row) => {
                    if (row.hidden?.(active)) return null;
                    return <FieldRow key={row.key} row={row} draft={active} />;
                  })}
                </dl>
              </section>
            );
          })}
        </div>

        {/* Decision actions */}
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {!allVerified && (
            <span className="text-sm text-muted-foreground sm:mr-auto">
              Mark every section verified to approve.
            </span>
          )}
          <button
            onClick={() => setDecision("changes")}
            className="inline-flex h-12 items-center justify-center rounded-[8px] border border-destructive px-6 text-base font-bold text-destructive transition hover:bg-destructive/5"
          >
            Request changes
          </button>
          <button
            disabled={!allVerified || stats.missing.length > 0}
            onClick={() => setDecision("approved")}
            className="inline-flex h-12 items-center justify-center rounded-[8px] bg-primary px-7 text-base font-bold text-primary-foreground transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
          >
            Approve submission
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function TopBar({ onBack, onRefresh }: { onBack: () => void; onRefresh: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/wisemonk-logo.png"
            alt="Wisemonk"
            width={307}
            height={65}
            priority
            className="block h-[28px] w-auto object-contain"
          />
          <span className="hidden text-sm font-bold text-muted-foreground sm:inline">
            · Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border px-3 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={onBack}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Onboarding
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusPill({
  missing,
  decision,
}: {
  missing: number;
  decision: "approved" | "changes" | null;
}) {
  if (decision === "approved")
    return (
      <Pill tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
        Approved
      </Pill>
    );
  if (decision === "changes")
    return (
      <Pill tone="red" icon={<XCircle className="h-4 w-4" />}>
        Changes requested
      </Pill>
    );
  if (missing > 0)
    return (
      <Pill tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
        {missing} field{missing === 1 ? "" : "s"} missing
      </Pill>
    );
  return (
    <Pill tone="blue" icon={<ShieldCheck className="h-4 w-4" />}>
      Ready for review
    </Pill>
  );
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: "green" | "red" | "amber" | "blue";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    green: "bg-wm-positive/10 text-wm-positive",
    red: "bg-destructive/10 text-destructive",
    amber: "bg-wm-warning/20 text-[#8a7700]",
    blue: "bg-accent text-primary",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
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

  // Custom value override.
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
          {on ? (
            <Check className="h-4 w-4 text-wm-positive" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          {on ? row.trueLabel ?? "Yes" : row.falseLabel ?? "No"}
        </span>
      );
    }
    case "file": {
      const name = str(draft, row.key);
      if (!name) return <Empty />;
      return (
        <span className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-muted px-2.5 py-1 font-medium">
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
    case "text":
    default: {
      const v = str(draft, row.key);
      return v ? <span className="font-medium whitespace-pre-wrap">{v}</span> : <Empty />;
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

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}
