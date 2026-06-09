"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Info,
  Laptop,
  Plus,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

// ── Step / stage config ───────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: Step; title: string; nextHint: string }[] = [
  { id: 1, title: "Employee details",     nextHint: "Employment details" },
  { id: 2, title: "Employment details",   nextHint: "Compensation details" },
  { id: 3, title: "Compensation details", nextHint: "Additional details" },
  { id: 4, title: "Additional details",   nextHint: "Engagement model" },
  { id: 5, title: "Engagement model",     nextHint: "" },
];

// ── Static option lists ───────────────────────────────────────────────────

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const SENIORITY_LEVELS = [
  "Intern", "Junior", "Mid-level", "Senior", "Lead", "Principal", "Manager", "Director", "VP", "C-level",
];

const PROBATION_DURATIONS = ["1 month", "2 months", "3 months", "6 months", "No probation"];
const NOTICE_PERIODS_DURING_PROBATION = ["7 days", "14 days", "30 days"];
const NOTICE_PERIODS_POST_PROBATION = ["15 days", "1 month", "2 months", "3 months"];

const COMP_CURRENCIES = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)", "SGD (S$)"];

const EQUIPMENT_TYPES = [
  "Laptop", "Desktop / Workstation", "Monitor", "Keyboard & mouse",
  "Headphones / Headset", "Webcam", "Office chair", "Desk", "Other",
];

// Health insurance coverage tiers — standard ICICI Lombard / Indian group health offerings.
const HEALTH_COVERAGE_TYPES = [
  "Self only",
  "Self + Spouse",
  "Self + Family (Spouse + Children)",
  "Self + Parents",
  "Comprehensive (Self + Spouse + Children + Parents)",
];

const BONUS_NAMES = ["Joining bonus", "Performance bonus", "Festival bonus", "Retention bonus", "Other"];
const BONUS_FREQUENCIES = ["One-time", "Monthly", "Quarterly", "Half-yearly", "Yearly"];

// ── Draft type ────────────────────────────────────────────────────────────

type Bonus = {
  name: string;
  currency: string;
  value: string;
  valueType: "fixed" | "variable";
  frequency: string;
  payoutDate: string;
};

const blankBonus = (): Bonus => ({
  name: "",
  currency: "INR (₹)",
  value: "",
  valueType: "fixed",
  frequency: "",
  payoutDate: "",
});

type Draft = {
  // Step 1 — Employee details
  employeeName: string;
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  gender: string;
  // Step 2 — Employment details
  company: string;
  jobTitle: string;
  seniority: string;
  department: string;
  startDate: string;
  workArrangement: "remote" | "hybrid" | "onsite" | "";
  jobDescription: string;
  probationDuration: string;
  noticeDuringProbation: string;
  noticePostProbation: string;
  // Step 3 — Compensation
  compCurrency: string;
  annualSalary: string;
  // Bonus — supports multiple entries
  bonusEnabled: boolean;
  bonuses: Bonus[];
  // Incentive
  incentiveEnabled: boolean;
  // Perks
  perksEnabled: boolean;
  perkDetails: string;
  // Provident fund
  pfStrategy: "on_top" | "within" | "";
  // Step 4 — Additional details
  healthInsurance: "yes" | "no" | "";
  healthCoverageType: string;
  equipment: "yes" | "no" | "";
  equipmentType: string;
  equipmentDetails: string;
  equipmentLink: string;
  equipmentScreenshot: string;
  finalAck: boolean;
  // Step 5 — Final acknowledgements (SOW + engagement)
  sowAcknowledged: boolean;
  engagementAcknowledged: boolean;
};

const DEFAULT_DRAFT: Draft = {
  employeeName: "", email: "",
  phoneCountry: "+91", phoneNumber: "", gender: "",
  company: "Wisemonk", jobTitle: "", seniority: "", department: "",
  startDate: "", workArrangement: "", jobDescription: "",
  probationDuration: "", noticeDuringProbation: "", noticePostProbation: "",
  compCurrency: "INR (₹)", annualSalary: "",
  bonusEnabled: false, bonuses: [blankBonus()],
  incentiveEnabled: false,
  perksEnabled: false, perkDetails: "",
  pfStrategy: "on_top",
  healthInsurance: "", healthCoverageType: "", equipment: "",
  equipmentType: "", equipmentDetails: "", equipmentLink: "", equipmentScreenshot: "",
  finalAck: false,
  // Step 5 — Final acknowledgements
  sowAcknowledged: false,
  engagementAcknowledged: false,
};

const STORAGE_KEY = "wm_employee_draft";
const STORAGE_STEP_KEY = "wm_employee_step";

// ── Validation ────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof Draft, string>>;
const isEmpty = (v: string) => !v || !v.trim();
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidUrl = (v: string) => /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[\w\-./?%&=]*)?$/i.test(v.trim());
const isValidPersonName = (v: string) => {
  const s = v.trim().replace(/\s+/g, " ");
  if (!/^[\p{L}'.-]+(?:\s[\p{L}'.-]+)+$/u.test(s)) return false;
  return s.split(" ").every((p) => (p.match(/\p{L}/gu) ?? []).length >= 2);
};
// Indian mobile: exactly 10 digits, starts with 6/7/8/9.
const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
const isPositiveNumber = (v: string) => /^\d+(\.\d+)?$/.test(v.trim()) && parseFloat(v) > 0;

function validateField(key: keyof Draft, draft: Draft): string | undefined {
  switch (key) {
    case "employeeName":
      if (isEmpty(draft.employeeName)) return "Please enter the employee's full name";
      if (!isValidPersonName(draft.employeeName)) return "Enter the employee's first and last name";
      return;
    case "email":
      if (isEmpty(draft.email)) return "Please enter the work email";
      if (!isValidEmail(draft.email)) return "Enter a valid email (e.g. name@company.com)";
      return;
    case "phoneNumber":
      if (isEmpty(draft.phoneNumber)) return "Please enter the phone number";
      if (draft.phoneNumber.length !== 10) return "Enter a 10-digit mobile number";
      if (!isValidPhone(draft.phoneNumber)) return "Indian mobile numbers must start with 6, 7, 8 or 9";
      return;
    case "gender":
      if (isEmpty(draft.gender)) return "Please select a gender";
      return;
    case "company":
      if (isEmpty(draft.company)) return "Please enter the company name";
      return;
    case "jobTitle":
      if (isEmpty(draft.jobTitle)) return "Please enter the job title";
      return;
    case "seniority":
      if (isEmpty(draft.seniority)) return "Please select a seniority level";
      return;
    case "startDate":
      if (isEmpty(draft.startDate)) return "Please pick a start date";
      return;
    case "workArrangement":
      if (isEmpty(draft.workArrangement)) return "Please pick a work arrangement";
      return;
    case "jobDescription":
      if (isEmpty(draft.jobDescription)) return "Please describe the role";
      if (draft.jobDescription.trim().length < 20) return "Add a bit more detail (at least 20 characters)";
      return;
    case "probationDuration":
      if (isEmpty(draft.probationDuration)) return "Please pick a probation duration";
      return;
    case "noticeDuringProbation":
      if (isEmpty(draft.noticeDuringProbation)) return "Please pick a notice period";
      return;
    case "noticePostProbation":
      if (isEmpty(draft.noticePostProbation)) return "Please pick a notice period";
      return;
    case "compCurrency":
      if (isEmpty(draft.compCurrency)) return "Please pick a currency";
      return;
    case "annualSalary":
      if (isEmpty(draft.annualSalary)) return "Please enter the annual salary";
      if (!isPositiveNumber(draft.annualSalary)) return "Enter a valid amount";
      // EOR floor — ₹120,000/yr (~₹10,000/month) is roughly the highest national
      // statutory minimum wage in India. Below this we can't legally onboard.
      if (parseFloat(draft.annualSalary) < 120000) return "Annual salary must be at least ₹1,20,000 (₹10,000/month) to meet minimum wage requirements";
      return;
    case "pfStrategy":
      if (isEmpty(draft.pfStrategy)) return "Please pick a PF strategy";
      return;
    case "healthInsurance":
      // Optional — user can skip and set up later from the dashboard.
      return;
    case "healthCoverageType":
      if (draft.healthInsurance === "yes" && isEmpty(draft.healthCoverageType)) return "Please pick a coverage type";
      return;
    case "equipment":
      // Optional — user can skip and set up later from the dashboard.
      return;
    case "equipmentType":
      if (draft.equipment === "yes" && isEmpty(draft.equipmentType)) return "Please pick the equipment type";
      return;
    case "equipmentDetails":
      // Equipment details is optional — used only as supplementary spec info.
      return;
    case "equipmentLink":
      if (draft.equipment === "yes") {
        if (isEmpty(draft.equipmentLink)) return "Please paste the equipment URL";
        if (!isValidUrl(draft.equipmentLink)) return "Enter a valid URL";
      }
      return;
    case "equipmentScreenshot":
      if (draft.equipment === "yes" && isEmpty(draft.equipmentScreenshot)) return "Please upload a screenshot of the cart";
      return;
    case "finalAck":
      // Removed from the form — kept on the type for sessionStorage compat.
      return;
    case "sowAcknowledged":
      // SOW section removed from the form — kept on Draft for sessionStorage compat.
      return;
    case "engagementAcknowledged":
      if (!draft.engagementAcknowledged) return "Please acknowledge the engagement model";
      return;
  }
  return;
}

const STEP_FIELDS: Record<Step, (keyof Draft)[]> = {
  1: ["employeeName", "email", "phoneNumber", "gender"],
  2: ["company", "jobTitle", "seniority", "startDate", "workArrangement", "jobDescription", "probationDuration", "noticeDuringProbation", "noticePostProbation"],
  3: ["compCurrency", "annualSalary", "pfStrategy"],
  4: ["healthCoverageType", "equipmentType", "equipmentLink", "equipmentScreenshot"],
  5: ["engagementAcknowledged"],
};

function validateStep(step: Step, draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of STEP_FIELDS[step]) {
    const err = validateField(key, draft);
    if (err) errors[key] = err;
  }
  return errors;
}

// ── Reusable UI ───────────────────────────────────────────────────────────

function SectionCard({ title, description, action, required, children }: {
  title?: string; description?: string; action?: React.ReactNode;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-6">
        {title && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-foreground">
                {title}
                {required && <span className="ml-0.5 text-muted-foreground">*</span>}
              </h2>
              {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
          </div>
        )}
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center align-middle">
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground transition hover:text-foreground" strokeWidth={2} />
      <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-64 -translate-x-1/2 rounded-[8px] bg-foreground px-3 py-2 text-xs leading-snug text-background opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">{text}</span>
    </span>
  );
}

function Field({ label, required, info, error, children, action }: {
  label: string; required?: boolean; info?: string; error?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-sm-bold inline-flex items-center gap-1.5 text-foreground">
          <span>
            {label}
            {required && <span className="ml-0.5 text-muted-foreground">*</span>}
          </span>
          {info && <InfoTip text={info} />}
        </p>
        {action}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function FloatingShell({ focused, children, info, isFloating, error }: {
  focused: boolean; children: React.ReactNode; info?: string; isFloating: boolean; error?: string;
}) {
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : focused
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${borderClass}`}>
        {children}
      </div>
      {error
        ? <p className="px-1 text-xs font-medium text-destructive">{error}</p>
        : focused && info && <p className="px-1 text-xs text-muted-foreground">{info}</p>
      }
    </div>
  );
}

function TextInput({
  value, onChange, label, info, placeholder, autoFocus, type = "text",
  required, error, onBlur, prefix, suffix,
}: {
  value: string; onChange: (v: string) => void;
  label?: string; info?: string;
  placeholder?: string; autoFocus?: boolean; type?: string;
  required?: boolean; error?: string;
  onBlur?: () => void;
  prefix?: React.ReactNode; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  if (!label) {
    return (
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder} autoFocus={autoFocus}
        className={`text-body w-full rounded-[8px] border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
          error ? "border-destructive ring-destructive/20 focus:border-destructive focus:ring-destructive/20"
                : "border-border focus:border-brand-500 focus:ring-brand-100"
        }`}
      />
    );
  }
  const isFloating = focused || value.length > 0;
  return (
    <FloatingShell focused={focused} info={info} isFloating={isFloating} error={error}>
      <div className="flex items-center">
        {prefix}
        <div className="relative flex-1">
          <label className={`pointer-events-none absolute left-4 transition-all ${
            isFloating ? "top-1.5 text-[11px] font-medium text-muted-foreground" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
          }`}>
            {label}
            {required && <span className="ml-0.5 text-muted-foreground">*</span>}
          </label>
          <input
            type={type} value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            autoFocus={autoFocus}
            placeholder={isFloating ? placeholder : ""}
            className="w-full rounded-[8px] border-none bg-transparent px-4 pb-2 pt-6 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>
        {suffix}
      </div>
    </FloatingShell>
  );
}

function SimpleDropdown({ value, onChange, options, label, info, required, error, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[];
  label?: string; info?: string; required?: boolean; error?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!label) {
    return (
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className={`text-body inline-flex w-full items-center justify-between gap-2 rounded-[8px] border bg-card px-4 py-3.5 text-left transition ${
            open ? "border-brand-500 ring-2 ring-brand-100" : "border-border hover:border-foreground/20"
          } ${!value ? "text-muted-foreground" : "text-foreground"}`}>
          {value || placeholder || "Select…"}
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
            {options.map((opt) => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`text-body-sm flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition ${
                  value === opt ? "bg-brand-100 text-brand-500" : "text-foreground hover:bg-muted"
                }`}>
                {opt}
                {value === opt && <Check className="h-4 w-4 text-brand-500" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isFloating = open || value.length > 0;
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : open ? "border-brand-500 ring-2 ring-brand-100" : "border-border hover:border-foreground/30";

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${borderClass}`}>
        <label className={`pointer-events-none absolute left-4 z-10 transition-all ${
          isFloating ? "top-1.5 text-[11px] font-medium text-muted-foreground" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        }`}>
          {label}
          {required && <span className="ml-0.5 text-muted-foreground">*</span>}
        </label>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className={`relative block w-full rounded-[8px] bg-transparent px-4 text-left text-base text-foreground ${isFloating ? "pb-2 pt-6" : "py-4"}`}>
          <span className={value ? "" : "invisible"}>{value || "x"}</span>
        </button>
        <ChevronDown className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
            {options.map((opt) => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`text-body-sm flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition ${
                  value === opt ? "bg-brand-100 text-brand-500" : "text-foreground hover:bg-muted"
                }`}>
                {opt}
                {value === opt && <Check className="h-4 w-4 text-brand-500" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="px-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function PhoneInput({ value, onChange, error, onBlur }: {
  value: string; onChange: (v: string) => void;
  error?: string; onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : focused
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`relative flex items-stretch rounded-[8px] border bg-card transition ${borderClass}`}>
        {/* Pinned-top label across the full width of the field */}
        <label className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-muted-foreground">
          Phone number<span className="ml-0.5 text-muted-foreground">*</span>
        </label>
        {/* Fixed dial-code prefix — sits on the same baseline as the input
            text (both use pt-6 pb-2) so digits read as one continuous number. */}
        <span className="select-none pl-4 pt-6 pb-2 text-base text-muted-foreground">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className="flex-1 border-none bg-transparent pl-2 pr-4 pb-2 pt-6 text-base text-foreground focus:outline-none"
        />
      </div>
      {error && <p className="px-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function PillSegmentedControl<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`rounded-full border px-4 py-1.5 text-body-sm font-medium transition ${
            value === o.id
              ? "border-brand-500 bg-brand-50 text-brand-500"
              : "border-border bg-card text-foreground hover:border-foreground/30"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DateInput({ value, onChange, error, onBlur, label = "Start date with Wisemonk EOR", required }: {
  value: string; onChange: (v: string) => void; error?: string; onBlur?: () => void;
  label?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : focused
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${borderClass}`}>
        <label className={`pointer-events-none absolute left-4 z-10 transition-all ${
          isFloating ? "top-1.5 text-[11px] font-medium text-muted-foreground" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        }`}>
          {label}
          {required && <span className="ml-0.5 text-muted-foreground">*</span>}
        </label>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className={`block w-full rounded-[8px] border-none bg-transparent px-4 pb-2 pt-6 pr-10 text-base text-foreground focus:outline-none
            [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0
            ${value ? "" : "text-transparent"}`}
        />
        <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
      </div>
      {error && <p className="px-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean; onChange: () => void; label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title, description, info, enabled, onToggle, children,
}: {
  title: string; description?: string; info?: string;
  enabled: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-body-sm-bold inline-flex items-center gap-1.5 text-foreground">
            <span>{title}</span>
            {info && <InfoTip text={info} />}
          </p>
          {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        </div>
        <ToggleSwitch
          checked={enabled}
          onChange={onToggle}
          label={enabled ? `Disable ${title}` : `Enable ${title}`}
        />
      </div>
      {enabled && children}
    </div>
  );
}

function InlineCheckbox({ checked, onToggle, label }: {
  checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <button type="button" onClick={onToggle}
      className="flex items-start gap-3 px-1 py-1 text-left transition">
      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] transition ${
        checked ? "border border-foreground bg-foreground" : "border-2 border-border"
      }`}>
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-body-sm text-foreground">{label}</span>
    </button>
  );
}

/**
 * LabelCheckbox — like InlineCheckbox but renders the row as a <label>
 * wrapping a hidden <input type="checkbox">. This makes it valid HTML to
 * embed clickable elements (links, buttons) inside the label content.
 * Inner buttons should call stopPropagation so they don't toggle the box.
 */
function LabelCheckbox({ checked, onToggle, children }: {
  checked: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-1 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] transition ${
        checked ? "border border-foreground bg-foreground" : "border-2 border-border"
      }`}>
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-body-sm text-foreground">{children}</span>
    </label>
  );
}

function FileUpload({ fileName, onFile, error }: {
  fileName: string; onFile: (name: string) => void; error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (fileName) {
    const ext = fileName.split(".").pop()?.toUpperCase() ?? "FILE";
    return (
      <div className="flex items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-muted text-[10px] font-bold text-muted-foreground">
          {ext}
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <span className="truncate text-body-sm-bold text-foreground">{fileName}</span>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-body-sm text-left text-muted-foreground transition hover:text-foreground">
            Replace file
          </button>
        </div>
        <button type="button" onClick={() => onFile("")}
          aria-label="Remove file"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
          ×
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f.name); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) onFile(f.name);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border px-6 py-7 text-center transition ${
          error ? "border-destructive/50 bg-destructive/5"
                : dragOver ? "border-brand-500 bg-brand-50"
                : "border-dashed border-border bg-card hover:border-brand-500/60 hover:bg-brand-50/30"
        }`}
        style={{ borderWidth: error || dragOver ? "1.5px" : "1.5px" }}
      >
        <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-body-sm text-muted-foreground">
          Drag &amp; drop your file here, or{" "}
          <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="font-medium text-brand-500 hover:underline">click to browse</button>
        </p>
        <p className="text-body-sm text-muted-foreground">PDF, JPG, PNG (max 5MB)</p>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f.name); }}
      />
      {error && <p className="px-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function YesNoCheckGroup({ value, onChange }: {
  value: "yes" | "no" | ""; onChange: (v: "yes" | "no") => void;
}) {
  // Renders as radio buttons (round) since the choices are mutually exclusive.
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {(["yes", "no"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className="flex items-center gap-3 px-1 py-1 text-left transition"
        >
          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
            value === opt ? "border-foreground" : "border-border"
          }`}>
            {value === opt && <div className="h-2 w-2 rounded-full bg-foreground" />}
          </div>
          <span className="text-body-sm text-foreground">{opt === "yes" ? "Yes" : "No"}</span>
        </button>
      ))}
    </div>
  );
}

function AiAssistButton({ onClick, label = "Generate with AI" }: { onClick?: () => void; label?: string }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="inline-flex items-center gap-1 bg-transparent text-xs font-semibold transition hover:opacity-80">
      <Sparkles className="h-3.5 w-3.5 text-violet-500" strokeWidth={2.25} />
      <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">{label}</span>
    </button>
  );
}

// ── Number formatting helper ──────────────────────────────────────────────
function formatCurrencyINR(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "0";
  // Indian numbering: 1,00,000 instead of 100,000
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Cost calculator (fixed sidebar on step 3) ─────────────────────────────

function CostCalculator({ draft }: { draft: Draft }) {
  const [open, setOpen] = useState(false);
  const salary = parseFloat(draft.annualSalary) || 0;
  const bonus = draft.bonusEnabled
    ? draft.bonuses.reduce((sum, b) => sum + (parseFloat(b.value) || 0), 0)
    : 0;
  const employerPfYearly = draft.pfStrategy === "on_top" ? 21600 : 0;
  const total = salary + bonus + employerPfYearly;

  // Open and closed states are mutually exclusive — only one card visible at
  // a time. Open card has a chevron in the header to collapse back down.
  if (open) {
    return (
      <div className="overflow-hidden rounded-[12px] border border-[#eef0f3] bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded={true}
          aria-label="Collapse cost breakdown"
          className="flex w-full items-center justify-between gap-2 border-b border-[#eef0f3] px-4 py-3 text-left transition hover:bg-muted/40"
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-brand-500" strokeWidth={2} />
            <p className="text-body-sm-bold text-foreground">Cost breakdown</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </button>
        <div className="flex flex-col gap-2.5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-muted-foreground">Gross salary</span>
            <span className="text-body-sm tabular-nums text-foreground">₹{formatCurrencyINR(salary)}/yr</span>
          </div>
          {draft.bonusEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted-foreground">Bonus</span>
              <span className="text-body-sm tabular-nums text-foreground">₹{formatCurrencyINR(bonus)}/yr</span>
            </div>
          )}
          {draft.pfStrategy === "on_top" && (
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted-foreground">Employer PF</span>
              <span className="text-body-sm tabular-nums text-foreground">₹{formatCurrencyINR(employerPfYearly)}/yr</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#eef0f3] pt-2.5">
            <span className="text-body-sm-bold text-foreground">Total CTC</span>
            <span className="text-body-sm-bold tabular-nums text-foreground">₹{formatCurrencyINR(total)}/yr</span>
          </div>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
            Estimated annual cost based on the values you&apos;ve entered. Final figures may vary with statutory adjustments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={false}
      className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#eef0f3] bg-card px-4 py-3 shadow-sm transition hover:border-brand-500/40 hover:shadow"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <Calculator className="h-4 w-4 text-brand-500" strokeWidth={2} />
        </div>
        <div className="flex flex-col items-start gap-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total CTC</span>
          <span className="text-body-sm-bold tabular-nums text-foreground">
            {salary > 0 ? `₹${formatCurrencyINR(total)}/yr` : "—"}
          </span>
        </div>
      </div>
      <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}

// ── SOW preview link + modal ─────────────────────────────────────────────
// Inline clickable text that opens a populated SOW preview modal styled
// like the MSA modal on the org page. Read-only — the actual sign-off is
// the InlineCheckbox below the link.

function SowPreviewLink({ draft, text = "Statement of Work (SOW)", className }: {
  draft: Draft; text?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className ?? "font-bold text-foreground transition hover:text-brand-500"}
      >
        {text}
      </button>
      <SowPreviewModal draft={draft} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SowPreviewModal({ draft, open, onClose }: {
  draft: Draft; open: boolean; onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });

  const startDateFormatted = draft.startDate
    ? new Date(draft.startDate).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";
  const arrangementLabel =
    draft.workArrangement === "remote" ? "Remote"
    : draft.workArrangement === "hybrid" ? "Hybrid"
    : draft.workArrangement === "onsite" ? "On-site"
    : "—";
  const dash = "—";

  // Single-row helper used inside the SOW tables.
  const Row = ({ label, value }: { label: string; value: string }) => (
    <tr>
      <td className="w-[180px] border border-foreground/40 px-3 py-2 text-body-sm-bold align-top">{label}</td>
      <td className="border border-foreground/40 px-3 py-2 text-body-sm">{value || dash}</td>
    </tr>
  );

  // Portal to document.body — the trigger link lives inside a <p>, and
  // <p> isn't allowed to contain block-level elements like <table>/<div>.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Statement of Work preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Statement of Work</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body — populated SOW preview */}
        <div className="flex-1 overflow-y-auto px-8 py-6 text-body-sm leading-relaxed text-foreground">
          <h2 className="mb-5 text-center text-base font-bold uppercase tracking-wide text-foreground">
            Statement of Work
          </h2>
          <p className="mb-5">
            This Statement of Work (&ldquo;SOW&rdquo;) is issued under the Master Services
            Agreement between <strong className="font-bold">Storypeach Technologies Private Limited (DBA Wisemonk)</strong>
            {" "}and <strong className="font-bold">{draft.company || "[Customer]"}</strong>, and
            forms an addendum to that Agreement. By signing the acknowledgement on the
            previous step, the Customer authorises Wisemonk to issue this SOW.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">1. Employee details</h3>
          <table className="mb-5 w-full border-collapse">
            <tbody>
              <Row label="Full name" value={draft.employeeName} />
              <Row label="Work email" value={draft.email} />
              <Row label="Phone" value={`+91 ${draft.phoneNumber || ""}`.trim()} />
              <Row label="Gender" value={draft.gender} />
            </tbody>
          </table>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">2. Position &amp; engagement</h3>
          <table className="mb-5 w-full border-collapse">
            <tbody>
              <Row label="Customer (employer of contract)" value={draft.company} />
              <Row label="Job title" value={draft.jobTitle} />
              <Row label="Seniority" value={draft.seniority} />
              <Row label="Department" value={draft.department || dash} />
              <Row label="Start date" value={startDateFormatted} />
              <Row label="Work arrangement" value={arrangementLabel} />
              <Row label="Probation duration" value={draft.probationDuration} />
              <Row label="Notice (during probation)" value={draft.noticeDuringProbation} />
              <Row label="Notice (post probation)" value={draft.noticePostProbation} />
            </tbody>
          </table>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">3. Scope of work</h3>
          <p className="mb-5 whitespace-pre-line">
            {draft.jobDescription || "—"}
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">4. Compensation</h3>
          <table className="mb-5 w-full border-collapse">
            <tbody>
              <Row label="Currency" value={draft.compCurrency} />
              <Row
                label="Annual gross salary"
                value={draft.annualSalary ? `₹${formatCurrencyINR(draft.annualSalary)}` : dash}
              />
              <Row
                label="Bonus"
                value={(() => {
                  if (!draft.bonusEnabled || draft.bonuses.length === 0) return "Not included";
                  const summary = draft.bonuses.map((b, i) => {
                    const name = b.name || `Bonus ${i + 1}`;
                    const type = b.valueType === "fixed" ? "Fixed" : "Variable";
                    const value = formatCurrencyINR(b.value || "0");
                    const freq = b.frequency || "Frequency TBC";
                    return `${name} (${type}: ₹${value}, ${freq})`;
                  });
                  return `Yes — ${summary.join("; ")}`;
                })()}
              />
              <Row
                label="Performance incentive"
                value={draft.incentiveEnabled ? "Enabled — defined per Customer policy" : "Not included"}
              />
              <Row
                label="Perks"
                value={draft.perksEnabled
                  ? (draft.perkDetails || "Enabled — details to follow")
                  : "Not included"}
              />
              <Row
                label="Provident fund"
                value={
                  draft.pfStrategy === "on_top" ? "Employer PF added on top of salary (₹21,600/yr)"
                  : draft.pfStrategy === "within" ? "Employer PF adjusted within salary"
                  : "—"
                }
              />
            </tbody>
          </table>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">5. Benefits &amp; equipment</h3>
          <table className="mb-5 w-full border-collapse">
            <tbody>
              <Row
                label="Health insurance"
                value={
                  draft.healthInsurance === "yes"
                    ? `Yes — ${draft.healthCoverageType || "coverage TBC"}`
                    : draft.healthInsurance === "no" ? "No" : dash
                }
              />
              <Row
                label="Equipment provided"
                value={
                  draft.equipment === "yes"
                    ? `${draft.equipmentType || "Equipment"} — see cart screenshot`
                    : draft.equipment === "no" ? "No" : dash
                }
              />
              {draft.equipment === "yes" && (
                <Row label="Equipment link" value={draft.equipmentLink || dash} />
              )}
            </tbody>
          </table>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">6. Term &amp; governing terms</h3>
          <p className="mb-3">
            This SOW commences on the start date listed above and continues until terminated in
            accordance with the notice periods specified, or earlier as permitted by the
            governing Master Services Agreement. All terms not defined herein have the meaning
            ascribed to them in the MSA.
          </p>

          <p className="mt-6 rounded-[8px] bg-muted/50 px-4 py-3 text-body-sm text-muted-foreground">
            Issued under the Master Services Agreement signed on{" "}
            <strong className="font-bold text-foreground">{today}</strong>. The full executed
            SOW + Employee Agreement will be emailed once the invite is sent.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#eef0f3] px-6 py-4">
          <button
            type="button"
            className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] border border-border bg-card px-5 text-foreground transition hover:border-foreground/30"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] bg-primary px-5 text-primary-foreground transition hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Engagement model preview link + modal ─────────────────────────────────
// Same pattern as the SOW link/modal — clickable text in the body that
// opens a read-only preview of how Wisemonk engages this hire.

function EngagementPreviewLink({ text = "consultant engagement model", className }: {
  text?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className ?? "font-bold text-foreground transition hover:text-brand-500"}
      >
        {text}
      </button>
      <EngagementPreviewModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function EngagementPreviewModal({ open, onClose }: {
  open: boolean; onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Consultant engagement model"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Consultant engagement model</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body — formatted as a document, mirrors the MSA / SOW modal style */}
        <div className="flex-1 overflow-y-auto px-8 py-6 text-body-sm leading-relaxed text-foreground">
          <h2 className="mb-5 text-center text-base font-bold uppercase tracking-wide text-foreground">
            Consultant Engagement Model
          </h2>

          <p className="mb-5">
            This document describes the legal and operational structure under which Wisemonk
            engages each Platform User on behalf of the Customer. By acknowledging the engagement
            model, the Customer confirms its understanding and acceptance of the following.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">1. Employer of Record</h3>
          <p className="mb-3">
            <strong className="font-bold">1.1.</strong> Wisemonk acts as the local{" "}
            <strong className="font-bold">Employer of Record (EOR)</strong> for the Platform
            User. Wisemonk holds the sole legal employment relationship and is the named employer
            on the local employment contract.
          </p>
          <p className="mb-3">
            <strong className="font-bold">1.2.</strong> The Customer engages the Platform User
            through Wisemonk as a client/principal under the Master Services Agreement, not as a
            direct employer. There is no co-employment between the Customer and the Platform
            User.
          </p>
          <p className="mb-3">
            <strong className="font-bold">1.3.</strong> This structure is the standard Wisemonk
            engagement model for cross-border hiring and applies uniformly to every Platform
            User onboarded through this flow.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">2. Wisemonk responsibilities</h3>
          <p className="mb-3">
            <strong className="font-bold">2.1.</strong> Wisemonk shall execute the local
            employment contract with the Platform User in accordance with applicable local
            employment law.
          </p>
          <p className="mb-3">
            <strong className="font-bold">2.2.</strong> Wisemonk shall run monthly payroll,
            withhold and remit applicable taxes, and provide statutory benefits including
            provident fund compliance where applicable.
          </p>
          <p className="mb-3">
            <strong className="font-bold">2.3.</strong> Wisemonk assumes all local labour law
            risk and HR-related obligations, including handling of termination and severance in
            accordance with local notice rules.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">3. Customer responsibilities</h3>
          <p className="mb-3">
            <strong className="font-bold">3.1.</strong> The Customer shall direct the day-to-day
            work and deliverables of the Platform User, conduct performance reviews, and provide
            the tools, equipment, and system access necessary for the role.
          </p>
          <p className="mb-3">
            <strong className="font-bold">3.2.</strong> The Customer shall fund the Platform
            User&apos;s compensation by paying Wisemonk&apos;s monthly invoice (covering total
            cost to company plus the agreed service fee) on or before the due date.
          </p>
          <p className="mb-3">
            <strong className="font-bold">3.3.</strong> The Customer shall not direct the
            Platform User in any manner that is inconsistent with their classification as
            Wisemonk&apos;s employee, or with applicable local labour law.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">4. Invoicing &amp; payment</h3>
          <p className="mb-3">
            <strong className="font-bold">4.1.</strong> Wisemonk shall invoice the Customer
            monthly in advance. Each invoice covers the total cost to company for the relevant
            month plus Wisemonk&apos;s service fee, as set out in the applicable Statement of
            Work.
          </p>
          <p className="mb-3">
            <strong className="font-bold">4.2.</strong> Upon receipt of payment, Wisemonk shall
            disburse the Platform User&apos;s salary on the agreed pay date and remit
            taxes/statutory contributions to the relevant local authorities.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">5. Termination</h3>
          <p className="mb-3">
            <strong className="font-bold">5.1.</strong> Either party may end this engagement in
            accordance with the notice periods specified in the Statement of Work. Termination
            of the Platform User&apos;s employment shall follow local notice and severance rules,
            which Wisemonk shall manage.
          </p>
          <p className="mb-3">
            <strong className="font-bold">5.2.</strong> Costs related to termination, including
            statutory severance and any unused leave encashment, shall be invoiced to the
            Customer in accordance with the Statement of Work.
          </p>

          <h3 className="mb-2 mt-5 text-body font-bold text-foreground">6. Governing terms</h3>
          <p className="mb-3">
            <strong className="font-bold">6.1.</strong> This Consultant Engagement Model is
            governed by, and shall be read together with, the Master Services Agreement and the
            applicable Statement of Work. In the event of any conflict, the Master Services
            Agreement controls.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#eef0f3] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] bg-primary px-5 text-primary-foreground transition hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Step content ──────────────────────────────────────────────────────────

function StepContent({
  step, draft, set, errors, blur,
}: {
  step: Step; draft: Draft;
  set: <K extends keyof Draft>(key: K, val: Draft[K]) => void;
  errors: FieldErrors;
  blur: (key: keyof Draft) => void;
}) {
  switch (step) {

    case 1:
      return (
        <SectionCard title="Employee details">
          <TextInput
            label="Employee name" required
            error={errors.employeeName}
            value={draft.employeeName}
            onChange={(v) => set("employeeName", v)}
            onBlur={() => blur("employeeName")}
            placeholder="e.g. Aman Sharma"
          />
          <TextInput
            label="Email" required
            error={errors.email}
            value={draft.email}
            onChange={(v) => set("email", v)}
            onBlur={() => blur("email")}
            placeholder="e.g. aman@company.com"
          />
          <PhoneInput
            value={draft.phoneNumber}
            onChange={(v) => set("phoneNumber", v)}
            onBlur={() => blur("phoneNumber")}
            error={errors.phoneNumber}
          />
          <SimpleDropdown
            label="Gender" required
            error={errors.gender}
            value={draft.gender}
            onChange={(v) => set("gender", v)}
            options={GENDERS}
          />
        </SectionCard>
      );

    case 2:
      return (
        <>
          <SectionCard title="Employment details">
            <TextInput
              label="Company" required
              error={errors.company}
              value={draft.company}
              onChange={(v) => set("company", v)}
              onBlur={() => blur("company")}
            />
            <TextInput
              label="Job title" required
              error={errors.jobTitle}
              value={draft.jobTitle}
              onChange={(v) => set("jobTitle", v)}
              onBlur={() => blur("jobTitle")}
              placeholder="e.g. Sr. Product Designer"
            />
            <SimpleDropdown
              label="Seniority" required
              error={errors.seniority}
              value={draft.seniority}
              onChange={(v) => set("seniority", v)}
              options={SENIORITY_LEVELS}
            />
            <TextInput
              label="Department"
              value={draft.department}
              onChange={(v) => set("department", v)}
              placeholder="e.g. Product"
            />
            <DateInput
              required
              error={errors.startDate}
              value={draft.startDate}
              onChange={(v) => set("startDate", v)}
              onBlur={() => blur("startDate")}
            />
            <Field label="Work arrangement" required error={errors.workArrangement}>
              <PillSegmentedControl
                value={draft.workArrangement || "remote"}
                onChange={(v) => set("workArrangement", v)}
                options={[
                  { id: "remote", label: "Remote" },
                  { id: "hybrid", label: "Hybrid" },
                  { id: "onsite", label: "On-site" },
                ]}
              />
            </Field>
          </SectionCard>

          <SectionCard
            title="Job Description"
            required
            action={(() => {
              const role = draft.jobTitle || "Senior Product Designer";
              const company = draft.company || "Wisemonk";
              // Variants used for regeneration so each click yields different copy.
              const variants = [
                `As a ${role} at ${company}, you'll lead end-to-end product design for our core platform — collaborating with engineering and product partners to ship intuitive, high-quality experiences. Responsibilities include conducting user research, creating wireframes and high-fidelity prototypes, contributing to the design system, and mentoring junior designers. Required: 5+ years in product design, fluency with Figma, and a portfolio of shipped work in B2B SaaS.`,
                `We're hiring a ${role} to own the user experience for ${company}'s flagship product. You'll partner with PMs and engineers from discovery through launch, run usability sessions, design end-to-end flows, and evolve our component library. Bring 5+ years of product design experience, a strong systems-thinking mindset, and a portfolio that demonstrates measurable impact on shipped features.`,
                `${company} is looking for a ${role} who thrives on ambiguity. You'll define how new products feel, from initial sketches to pixel-perfect Figma specs, and you'll work closely with leadership to align design with business outcomes. Ideal candidates have 5+ years in B2B SaaS, fluency with modern design tooling, and a track record of mentoring designers.`,
              ];
              const generated = !!draft.jobDescription.trim();
              return (
                <AiAssistButton
                  label={generated ? "Regenerate" : "Generate with AI"}
                  onClick={() => {
                    // Pick a variant that isn't the current one when regenerating.
                    const current = draft.jobDescription;
                    const candidates = variants.filter((v) => v !== current);
                    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? variants[0];
                    set("jobDescription", next);
                  }}
                />
              );
            })()}
          >
            <textarea
              value={draft.jobDescription}
              onChange={(e) => set("jobDescription", e.target.value)}
              onBlur={() => blur("jobDescription")}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={5}
              className={`text-body w-full resize-none rounded-[8px] border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                errors.jobDescription
                  ? "border-destructive ring-destructive/20 focus:border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-brand-500 focus:ring-brand-100"
              }`}
            />
            {errors.jobDescription && <p className="text-xs font-medium text-destructive">{errors.jobDescription}</p>}
          </SectionCard>

          <SectionCard title="Probation & notice">
            <Field label="Probation period duration" required error={errors.probationDuration}>
              <SimpleDropdown
                value={draft.probationDuration}
                onChange={(v) => set("probationDuration", v)}
                options={PROBATION_DURATIONS}
                placeholder="Select"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Notice period (During probation)" required error={errors.noticeDuringProbation}>
                <SimpleDropdown
                  value={draft.noticeDuringProbation}
                  onChange={(v) => set("noticeDuringProbation", v)}
                  options={NOTICE_PERIODS_DURING_PROBATION}
                  placeholder="Select"
                />
              </Field>
              <Field label="Notice period (Post probation)" required error={errors.noticePostProbation}>
                <SimpleDropdown
                  value={draft.noticePostProbation}
                  onChange={(v) => set("noticePostProbation", v)}
                  options={NOTICE_PERIODS_POST_PROBATION}
                  placeholder="Select"
                />
              </Field>
            </div>
          </SectionCard>
        </>
      );

    case 3: {
      // Used inline in the bonus section to show "salary + bonus" preview.
      // The full CTC calculation lives in <CostCalculator/> below.
      const salary = parseFloat(draft.annualSalary) || 0;

      return (
        <>
          <SectionCard title="Compensation options">
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <SimpleDropdown
                value={draft.compCurrency}
                onChange={(v) => set("compCurrency", v)}
                options={COMP_CURRENCIES}
                placeholder="INR (₹)"
              />
              <TextInput
                label="Annual gross salary (excluding bonuses & benefits)"
                required
                error={errors.annualSalary}
                // Display with Indian comma grouping, store as raw digits.
                value={draft.annualSalary ? formatCurrencyINR(draft.annualSalary) : ""}
                onChange={(v) => set("annualSalary", v.replace(/[^\d]/g, ""))}
                onBlur={() => blur("annualSalary")}
              />
            </div>

            {/* Bonus toggle — supports multiple bonuses */}
            <ToggleRow
              title="Add Bonus"
              description="If the bonus is additional to the annual salary."
              info="Add a one-time, recurring, or performance-linked bonus on top of the annual salary."
              enabled={draft.bonusEnabled}
              onToggle={() => set("bonusEnabled", !draft.bonusEnabled)}
            >
              <div className="flex flex-col gap-2">
                {draft.bonuses.map((bonus, idx) => {
                  const updateBonus = (patch: Partial<Bonus>) => {
                    const next = draft.bonuses.map((b, i) => i === idx ? { ...b, ...patch } : b);
                    set("bonuses", next);
                  };
                  const removeBonus = () => {
                    set("bonuses", draft.bonuses.filter((_, i) => i !== idx));
                  };
                  return (
                    <div key={idx} className="flex flex-col gap-3 rounded-[8px] bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-body-sm-bold text-foreground">
                          Bonus {idx + 1}
                          {draft.bonuses.length > 1 && (
                            <span className="ml-1 text-muted-foreground">of {draft.bonuses.length}</span>
                          )}
                        </p>
                        {draft.bonuses.length > 1 && (
                          <button
                            type="button"
                            onClick={removeBonus}
                            aria-label={`Remove bonus ${idx + 1}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                      <SimpleDropdown
                        value={bonus.name}
                        onChange={(v) => updateBonus({ name: v })}
                        options={BONUS_NAMES}
                        placeholder="Bonus name"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <SimpleDropdown
                          value={bonus.currency}
                          onChange={(v) => updateBonus({ currency: v })}
                          options={COMP_CURRENCIES}
                          placeholder="Currency"
                        />
                        <div className="flex items-center gap-1 rounded-[8px] border border-border bg-card px-3">
                          <input
                            type="text"
                            value={bonus.value ? formatCurrencyINR(bonus.value) : ""}
                            onChange={(e) => updateBonus({ value: e.target.value.replace(/[^\d]/g, "") })}
                            placeholder="Bonus value"
                            className="text-body w-full bg-transparent py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateBonus({ valueType: bonus.valueType === "fixed" ? "variable" : "fixed" })}
                            className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                          >
                            {bonus.valueType === "fixed" ? "Fixed" : "Variable"}
                            <ChevronDown className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SimpleDropdown
                          value={bonus.frequency}
                          onChange={(v) => updateBonus({ frequency: v })}
                          options={BONUS_FREQUENCIES}
                          placeholder="Frequency"
                        />
                        <DateInput
                          label="Payout date"
                          value={bonus.payoutDate}
                          onChange={(v) => updateBonus({ payoutDate: v })}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Add another bonus — plain text link */}
                <button
                  type="button"
                  onClick={() => set("bonuses", [...draft.bonuses, blankBonus()])}
                  className="inline-flex items-center gap-1.5 self-start px-1 py-1 text-body-sm font-medium text-brand-500 transition hover:text-brand-600"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Add another bonus
                </button>

                {/* Salary + total bonus preview */}
                {(() => {
                  const totalBonus = draft.bonuses.reduce((sum, b) => sum + (parseFloat(b.value) || 0), 0);
                  return (
                    <div className="rounded-[8px] bg-brand-50/60 px-4 py-3">
                      <p className="text-body-sm text-foreground">
                        Employee&apos;s annual salary with bonus:{" "}
                        <span className="font-bold">₹{formatCurrencyINR(salary + totalBonus)}</span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            </ToggleRow>

            {/* Incentive toggle */}
            <ToggleRow
              title="Add incentive plan"
              description="Include performance-based or sales incentives."
              info="Variable pay tied to performance metrics — adds extra compensation when targets are met."
              enabled={draft.incentiveEnabled}
              onToggle={() => set("incentiveEnabled", !draft.incentiveEnabled)}
            >
              <div className="rounded-[8px] bg-yellow-50 px-4 py-3">
                <p className="text-body-sm-bold mb-1 text-foreground">Performance incentives enabled</p>
                <p className="text-body-sm text-muted-foreground">
                  You can offer bonuses or variable pay based on performance. Details are defined as per your policy. Incentives are discretionary and not guaranteed.
                </p>
              </div>
            </ToggleRow>

            {/* Perks toggle */}
            <ToggleRow
              title="Add perks"
              description="Offer lifestyle benefits or reimbursements as part of the employee's package."
              info="Examples: gym membership, learning stipend, work-from-home allowance, meal vouchers."
              enabled={draft.perksEnabled}
              onToggle={() => set("perksEnabled", !draft.perksEnabled)}
            >
              <div className="flex flex-col gap-3">
                <p className="text-body-sm-bold text-foreground">Perk details</p>
                <textarea
                  value={draft.perkDetails}
                  onChange={(e) => set("perkDetails", e.target.value)}
                  placeholder="Describe the perks provided to the employee."
                  rows={3}
                  className="text-body w-full resize-none rounded-[8px] border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div className="rounded-[8px] bg-yellow-50 px-4 py-3">
                  <p className="text-body-sm text-muted-foreground">
                    Perks form part of the employee&apos;s variable or equity-linked compensation. Both components are discretionary and subject to the company&apos;s policies, performance criteria, and approval processes.
                  </p>
                </div>
              </div>
            </ToggleRow>
          </SectionCard>

          <SectionCard
            title="Provident fund"
            description="Monthly retirement contribution by employer and employee"
          >
            <p className="text-body-sm text-muted-foreground">You can choose whether your contribution is:</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "on_top", title: "Add employer PF on top of salary (Recommended)", desc: "₹1,800/month to company cost" },
                { id: "within", title: "Include employer PF within salary", desc: "₹1,800/month adjusted within salary" },
              ] as const).map((opt) => (
                <button key={opt.id} type="button"
                  onClick={() => set("pfStrategy", opt.id)}
                  className={`flex items-start gap-3 rounded-[8px] border px-4 py-3.5 text-left transition ${
                    draft.pfStrategy === opt.id
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}>
                  <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    draft.pfStrategy === opt.id ? "border-brand-500 bg-brand-500" : "border-border"
                  }`}>
                    {draft.pfStrategy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className={`text-body-sm font-medium ${draft.pfStrategy === opt.id ? "text-brand-600" : "text-foreground"}`}>
                      {opt.title}
                    </span>
                    <span className="text-body-sm text-muted-foreground">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            {errors.pfStrategy && <p className="text-xs font-medium text-destructive">{errors.pfStrategy}</p>}
          </SectionCard>

          {/* Live cost calculator — sits below the Provident fund card.
              Collapsible breakdown style (Deel/Remote-like). */}
          <CostCalculator draft={draft} />
        </>
      );
    }

    case 4: {
      const healthExpanded = draft.healthInsurance === "yes";
      const equipmentExpanded = draft.equipment === "yes";
      return (
        <>
          {/* Two benefit cards — illustration left, content middle, Add button right */}
          <div className="flex flex-col gap-4">
            {/* ── Health insurance benefit ───────────────────────────── */}
            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              {!healthExpanded ? (
                <div className="flex items-stretch gap-4 p-4">
                  {/* Illustration tile */}
                  <div className="hidden h-[112px] w-[140px] shrink-0 items-center justify-center rounded-[8px] bg-brand-50 sm:flex">
                    <HeartHandshake className="h-14 w-14 text-brand-500" strokeWidth={1.5} />
                  </div>
                  {/* Content */}
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <p className="text-body-bold text-foreground">Health insurance</p>
                    <p className="text-body-sm text-muted-foreground">
                      Comprehensive medical coverage for consultations, hospitalisation, and prescriptions.
                    </p>
                  </div>
                  {/* Add button */}
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => set("healthInsurance", "yes")}
                      className="text-body-sm-bold inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-primary-foreground transition hover:bg-brand-600"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.25} />
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-brand-500" strokeWidth={1.75} />
                      <p className="text-body-bold text-foreground">Health insurance</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { set("healthInsurance", ""); set("healthCoverageType", ""); }}
                      className="text-body-sm font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                  <Field
                    label="Coverage type"
                    required
                    info="Defines who's covered under the plan — premium scales with the number of dependents included."
                    error={errors.healthCoverageType}
                  >
                    <SimpleDropdown
                      value={draft.healthCoverageType}
                      onChange={(v) => set("healthCoverageType", v)}
                      options={HEALTH_COVERAGE_TYPES}
                      placeholder="Select"
                    />
                  </Field>
                  {draft.healthCoverageType && (
                    <div className="flex items-start gap-3 rounded-[8px] bg-brand-50 px-4 py-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2} />
                      <p className="text-body-sm leading-relaxed text-muted-foreground">
                        The health insurance premium for the selected coverage type will be added to the total cost to company.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Equipment benefit ──────────────────────────────────── */}
            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              {!equipmentExpanded ? (
                <div className="flex items-stretch gap-4 p-4">
                  <div className="hidden h-[112px] w-[140px] shrink-0 items-center justify-center rounded-[8px] bg-amber-50 sm:flex">
                    <Laptop className="h-14 w-14 text-amber-500" strokeWidth={1.5} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-body-bold text-foreground">Equipment</p>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      Procure and deliver work-ready devices and accessories to your hire. Billed at OEM list price on your next invoice.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => set("equipment", "yes")}
                      className="text-body-sm-bold inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-primary-foreground transition hover:bg-brand-600"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.25} />
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-amber-500" strokeWidth={1.75} />
                      <p className="text-body-bold text-foreground">Equipment</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        set("equipment", "");
                        set("equipmentType", "");
                        set("equipmentDetails", "");
                        set("equipmentLink", "");
                        set("equipmentScreenshot", "");
                      }}
                      className="text-body-sm font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                  <Field label="Equipment type" required error={errors.equipmentType}>
                    <SimpleDropdown
                      value={draft.equipmentType}
                      onChange={(v) => set("equipmentType", v)}
                      options={EQUIPMENT_TYPES}
                      placeholder="Select"
                    />
                  </Field>
                  <Field label="Equipment details">
                    <input
                      type="text"
                      value={draft.equipmentDetails}
                      onChange={(e) => set("equipmentDetails", e.target.value)}
                      className="text-body w-full rounded-[8px] border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <p className="text-xs text-muted-foreground">Provide the model details or specifications, if needed.</p>
                  </Field>
                  <Field label="Equipment link" required error={errors.equipmentLink}>
                    <input
                      type="url"
                      value={draft.equipmentLink}
                      onChange={(e) => set("equipmentLink", e.target.value)}
                      onBlur={() => blur("equipmentLink")}
                      placeholder="e.g. https://store.apple.com/in/buy-mac/macbook-pro"
                      className={`text-body w-full rounded-[8px] border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                        errors.equipmentLink
                          ? "border-destructive ring-destructive/20 focus:border-destructive focus:ring-destructive/20"
                          : "border-border focus:border-brand-500 focus:ring-brand-100"
                      }`}
                    />
                  </Field>
                  {draft.equipmentType && (
                    <div className="rounded-[8px] bg-brand-50/60 px-4 py-3">
                      <p className="text-body-sm text-foreground">
                        Please share a screenshot of the final cart showing the selected model and specifications.
                      </p>
                    </div>
                  )}
                  <Field label="Upload screenshot" required error={errors.equipmentScreenshot}>
                    <FileUpload
                      fileName={draft.equipmentScreenshot}
                      onFile={(name) => set("equipmentScreenshot", name)}
                      error={errors.equipmentScreenshot}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    case 5: {
      return (
        <>
          {/* Consultant employment schedule acknowledgement */}
          <SectionCard title="Consultant Employment Schedule">
            <p className="text-body-sm text-muted-foreground">
              The{" "}
              <EngagementPreviewLink />
              {" "}defines how Wisemonk engages this hire — as the local Employer of Record
              (EOR), with you directing the day-to-day work.
            </p>
            <LabelCheckbox
              checked={draft.engagementAcknowledged}
              onToggle={() => set("engagementAcknowledged", !draft.engagementAcknowledged)}
            >
              I have reviewed and agree to the{" "}
              <EngagementPreviewLink
                text="consultant engagement model"
                className="font-bold text-foreground underline underline-offset-2 transition hover:text-brand-500"
              />
              .
            </LabelCheckbox>
            {errors.engagementAcknowledged && (
              <p className="text-xs font-medium text-destructive">{errors.engagementAcknowledged}</p>
            )}
          </SectionCard>
        </>
      );
    }
  }
}

// ── Help panel ───────────────────────────────────────────────────────────
//
// Slide-in chat-style support panel mirroring the client onboarding flow.
// Per-step suggestions (from STEP_HELP) live in a sidebar with a free-text
// composer. Suggestion clicks return the matched answer instantly; custom
// questions get a fallback that points to email support.

type ChatMessage = { role: "user" | "support"; text: string };
type HelpItem = { question: string; answer: string };

const STEP_HELP: Record<Step, { title: string; items: HelpItem[] }> = {
  1: {
    title: "Employee details",
    items: [
      { question: "What name should I enter?", answer: "Use the legal name as it appears on the employee's government-issued ID (PAN, Aadhaar, or passport). Mismatches between this name and the ID can delay payroll setup." },
      { question: "Why do you need their personal email?", answer: "We send their offer letter, onboarding instructions, and self-service portal access there. Use a personal email — work emails the employee may not yet have access to can cause them to miss key notifications." },
      { question: "Is the phone number mandatory?", answer: "Yes. We use it for OTP-based authentication on the employee portal and for occasional time-sensitive updates from our compliance team." },
      { question: "Can I edit these details later?", answer: "Most fields are editable from the dashboard until the offer is accepted. After that, sensitive fields (legal name, date of birth) require a verification step." },
    ],
  },
  2: {
    title: "Employment details",
    items: [
      { question: "What's the difference between EOR and contractor?", answer: "EOR (Employer of Record) means Wisemonk legally employs the person on your behalf — they get statutory benefits, PF, gratuity, and a full Indian employment contract. Contractor means they invoice you and handle their own taxes. EOR is the right choice for full-time hires; contractor suits short-term project work." },
      { question: "Which job title should I use?", answer: "Use the title the employee will use externally (e.g. on LinkedIn, business cards). It appears on their employment contract and offer letter, so be precise." },
      { question: "What does start date mean here?", answer: "It's the first day the employee will be on Wisemonk's payroll. We need at least 7 working days from invitation to start date for compliance and payroll setup. Earlier start dates are possible — talk to your CSM." },
      { question: "Can I change the start date later?", answer: "Yes, until the offer is accepted. After acceptance, date changes require updating the contract, which can take 2–3 business days." },
    ],
  },
  3: {
    title: "Compensation details",
    items: [
      { question: "Should I enter gross or CTC?", answer: "Enter the annual gross salary — the figure you'd put in the offer letter. We compute the full cost-to-company (including statutory contributions and our service fee) for you on the right." },
      { question: "What does the cost calculator include?", answer: "Gross salary + employer PF contribution + employer ESIC (if applicable) + gratuity provision + Wisemonk service fee. Health insurance and equipment, if added, are billed separately on your monthly invoice." },
      { question: "How is provident fund handled?", answer: "PF is mandatory for any employee earning under ₹15,000 basic per month and optional above that. We default to 'mandatory only' to optimise take-home pay; choose 'voluntary' if the employee wants the additional retirement savings." },
      { question: "Can the employee receive a sign-on bonus?", answer: "Yes — add it as a one-time bonus. It's payable with the first salary and taxable as regular income. We'll add the appropriate clause in the offer letter automatically." },
    ],
  },
  4: {
    title: "Employee benefits",
    items: [
      { question: "Is health insurance mandatory?", answer: "Not legally, but it's offered by 90%+ of employers in India and is the single biggest factor in offer acceptance. You can skip it now and add it later from your dashboard — but employees usually expect it on day one." },
      { question: "What does coverage type mean?", answer: "It defines who's insured — just the employee, employee + spouse, employee + family, or employee + family + parents. Premium scales with the number of dependents covered." },
      { question: "How does equipment shipping work?", answer: "Pick the equipment type, paste a link to the model on the OEM/retailer site, and upload a screenshot of the cart. We procure and deliver to the employee's address before their start date. Equipment is billed at OEM list price on your next invoice." },
      { question: "Can I add benefits later?", answer: "Yes — both health insurance and equipment can be added or changed later from the employee's dashboard profile. Click 'Skip for now' if you want to come back to this." },
    ],
  },
  5: {
    title: "Engagement model",
    items: [
      { question: "What is the engagement schedule?", answer: "It's a short legal acknowledgement that defines the EOR relationship: Wisemonk legally employs the hire in India, you direct the day-to-day work, and we handle compliance, payroll, and benefits. It doesn't replace the offer letter — it sits alongside the MSA you signed during organization onboarding." },
      { question: "Why do I need to acknowledge it?", answer: "It confirms you've reviewed how the engagement works under the EOR model. Without this acknowledgement, we can't generate the employee's offer letter or onboard them onto payroll." },
      { question: "Can I see the document before sending?", answer: "Yes — click the 'consultant engagement model' link to open the full text in a preview modal. You can also download a PDF copy for your records." },
      { question: "What happens after I send the invite?", answer: "The employee receives an email with their offer letter and onboarding instructions. They sign the offer, complete KYC, and we take it from there. You'll see live status updates on your dashboard." },
    ],
  },
};

function HelpPanel({ step, open, onClose }: {
  step: Step; open: boolean; onClose: () => void;
}) {
  const help = STEP_HELP[step];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ESC closes the panel.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset the conversation whenever the step changes — each screen starts fresh.
  useEffect(() => {
    setMessages([]);
    setInputText("");
  }, [step]);

  // Auto-scroll the thread to the latest message after each turn.
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  function answerFor(question: string): string {
    const q = question.trim().toLowerCase();
    const match = help.items.find((item) => item.question.toLowerCase() === q);
    if (match) return match.answer;
    const loose = help.items.find((item) =>
      q.length > 4 && (item.question.toLowerCase().includes(q) || q.includes(item.question.toLowerCase().slice(0, 20)))
    );
    if (loose) return loose.answer;
    return "Thanks for asking — I don't have a canned answer for that one. Our support team will get back to you within a few hours. For an immediate reply, email hello@wisemonk.io.";
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { role: "user", text: trimmed };
    const supportMsg: ChatMessage = { role: "support", text: answerFor(trimmed) };
    setMessages((prev) => [...prev, userMsg, supportMsg]);
    setInputText("");
  }

  // Hide already-asked suggestions so the chip list shrinks as the user explores.
  const askedSet = new Set(
    messages.filter((m) => m.role === "user").map((m) => m.text.toLowerCase())
  );
  const remainingSuggestions = help.items.filter(
    (item) => !askedSet.has(item.question.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col bg-card shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
          <h2 className="text-lg font-bold text-foreground">{help.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Conversation thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.map((msg, idx) =>
            msg.role === "user" ? (
              <div key={idx} className="mb-3 flex justify-end">
                <p className="max-w-[85%] rounded-[12px] rounded-tr-[2px] bg-brand-500 px-4 py-2.5 text-body-sm text-white">
                  {msg.text}
                </p>
              </div>
            ) : (
              <div key={idx} className="mb-5 flex max-w-[90%] flex-col rounded-[12px] rounded-tl-[2px] bg-muted px-4 py-3">
                <p className="text-body-sm leading-relaxed text-foreground">{msg.text}</p>
              </div>
            )
          )}

          {remainingSuggestions.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {messages.length === 0 ? "Suggested questions" : "More questions"}
              </p>
              <div className="flex flex-col gap-2">
                {remainingSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => send(item.question)}
                    className="rounded-[8px] border border-border bg-card px-3.5 py-2.5 text-left text-body-sm text-foreground transition hover:border-brand-500/40 hover:bg-brand-50"
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          className="flex items-end gap-2 border-t border-[#eef0f3] bg-card px-4 py-3"
          onSubmit={(e) => { e.preventDefault(); send(inputText); }}
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(inputText);
              }
            }}
            placeholder="Ask a question…"
            rows={1}
            className="flex-1 resize-none rounded-[8px] border border-border bg-card px-3.5 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            style={{ maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:hover:bg-gray-200"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </form>
      </aside>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function AddEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount. Restores both the draft and the
  // current step so users land back where they left off.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setDraft((d) => ({ ...d, ...(JSON.parse(saved) as Partial<Draft>) }));
      }
      const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
      if (savedStep) {
        const n = parseInt(savedStep, 10);
        if (n >= 1 && n <= 5) setStep(n as Step);
      }
    } catch { /* ignore parse errors */ }
    hydratedRef.current = true;
  }, []);

  // Debounced auto-save. Skips the very first render (post-hydration) so we
  // don't immediately overwrite restored data with the default state.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        localStorage.setItem(STORAGE_STEP_KEY, String(step));
      } catch { /* quota exceeded — silently ignore */ }
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, step]);

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
    if (errors[key]) {
      setErrors((e) => { const next = { ...e }; delete next[key]; return next; });
    }
  }

  function blur(key: keyof Draft) {
    // On blur we only surface format-level errors. An empty field is "not yet
    // filled" rather than "wrong" — those errors are only shown on submit and
    // (separately) keep the Save & continue button disabled.
    const val = draft[key];
    const isEmptyValue =
      typeof val === "string" ? !val.trim()
      : Array.isArray(val) ? val.length === 0
      : val === false;
    if (isEmptyValue) {
      setErrors((e) => { const next = { ...e }; delete next[key]; return next; });
      return;
    }
    const err = validateField(key, draft);
    setErrors((e) => {
      const next = { ...e };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }

  function handleContinue() {
    const stepErrors = validateStep(step, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    if (step < 5) setStep((s) => (s + 1) as Step);
    else {
      // Final step — send invite. Clear the saved draft so a return visit
      // starts fresh for the next employee onboarding.
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STEP_KEY);
      } catch { /* ignore */ }
      router.push("/onboarding/employee/sent");
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  const stepIsValid = Object.keys(validateStep(step, draft)).length === 0;
  const current = STEPS.find((s) => s.id === step)!;
  const progressPct = (step / 5) * 100;

  // Page heading + subtitle
  const pageTitle = step === 4 ? "Employee benefits" : "Add employee";
  const pageSubtitle =
    step === 1 ? "This information will ensure they receive the access and onboarding instructions."
    : step === 4 ? "Add either, both, or skip — these can also be set up later from your dashboard."
    : step === 5 ? "Confirm the engagement model before we send the invite."
    : "";

  return (
    <main className="min-h-screen bg-[var(--wm-bg-2)]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-card">
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-10">
          <div className="h-[39px] overflow-hidden">
            <Image
              src="/wisemonk-logo.png"
              alt="Wisemonk"
              width={270}
              height={54}
              priority
              className="block h-[54px] w-auto -translate-y-[15px] object-contain mix-blend-multiply"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-body-sm-bold inline-flex h-10 items-center rounded-[8px] bg-brand-100 px-4 text-brand-500 transition hover:bg-brand-100/70"
            >
              Need help?
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              aria-label="Close and exit"
              className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleContinue(); }}
        className="mx-auto flex max-w-[1130px] flex-col items-center gap-6 px-6 pt-12 pb-40"
      >
        {pageTitle && (
          <div className="flex w-[632px] max-w-full flex-col items-start gap-2 text-left">
            <h1 className="text-[32px] font-bold leading-none text-foreground">{pageTitle}</h1>
            {pageSubtitle && <p className="text-base text-muted-foreground">{pageSubtitle}</p>}
          </div>
        )}

        <div className="flex w-[632px] max-w-full flex-col gap-4">
          <StepContent step={step} draft={draft} set={set} errors={errors} blur={blur} />
        </div>
      </form>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card">
        <div className="h-1.5 w-full bg-brand-100">
          <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-10">
          <button type="button" onClick={handleBack}
            className="text-base font-bold inline-flex h-12 items-center gap-2 rounded-[8px] px-5 text-foreground transition hover:text-gray-600 active:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-4">
            {current.nextHint && (
              <p className="text-body-sm text-muted-foreground">
                Next: <span className="text-foreground">{current.nextHint}</span>
              </p>
            )}
            {step === 4 && (
              <button
                type="button"
                onClick={() => {
                  // Clear any partial benefit selections and advance.
                  set("healthInsurance", "");
                  set("healthCoverageType", "");
                  set("equipment", "");
                  set("equipmentType", "");
                  set("equipmentDetails", "");
                  set("equipmentLink", "");
                  set("equipmentScreenshot", "");
                  setStep(5);
                }}
                className="text-base font-bold inline-flex h-12 items-center rounded-[8px] border border-border bg-card px-6 text-foreground transition hover:border-foreground/30"
              >
                Skip for now
              </button>
            )}
            <button type="button" onClick={handleContinue}
              disabled={!stepIsValid}
              className="text-base font-bold inline-flex h-12 items-center rounded-[8px] bg-primary px-7 text-primary-foreground transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:hover:bg-gray-200">
              {step === 5 ? "Send invite" : "Save & continue"}
            </button>
          </div>
        </div>
      </div>

      <HelpPanel step={step} open={helpOpen} onClose={() => setHelpOpen(false)} />

    </main>
  );
}
