"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Download,
  File,
  Info,
  Plus,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

// ── Stage / Step config ───────────────────────────────────────────────────

type Step = 1|2|3|4|5|6|7|8;

const STAGES = [
  { label: "KYC",              steps: [1,2,3,4] as Step[] },
  { label: "Business Profile", steps: [5,6]     as Step[] },
  { label: "Review & sign",    steps: [7,8]     as Step[] },
];

function stageOf(step: Step) {
  for (let i = 0; i < STAGES.length; i++) {
    if ((STAGES[i].steps as number[]).includes(step)) {
      return {
        index: i,
        label: STAGES[i].label,
        stepInStage: STAGES[i].steps.indexOf(step) + 1,
        totalInStage: STAGES[i].steps.length,
      };
    }
  }
  return { index: 0, label: "KYC", stepInStage: 1, totalInStage: 4 };
}

// ── Static options ────────────────────────────────────────────────────────

const DESIGNATIONS = [
  "CEO","CFO","COO","CTO","Managing Director","Director",
  "Vice President","Authorized Signatory","Partner","Other",
];

const INDIA_ENTITY_TYPES = [
  "Private Limited Company",
  "Public Limited Company",
  "Limited Liability Partnership (LLP)",
  "Branch Office",
  "Liaison Office",
  "Project Office",
  "Wholly Owned Subsidiary",
  "Other",
];

const ENTITY_TYPES = [
  "Private Limited Company","Public Limited Company","LLP",
  "Partnership Firm","Sole Proprietorship","Branch Office",
  "Liaison Office","Trust","Other",
];

const COUNTRIES = [
  { id:"in", label:"India",          code:"in" },
  { id:"us", label:"United States",  code:"us" },
  { id:"gb", label:"United Kingdom", code:"gb" },
  { id:"sg", label:"Singapore",      code:"sg" },
  { id:"de", label:"Germany",        code:"de" },
  { id:"ae", label:"UAE",            code:"ae" },
  { id:"au", label:"Australia",      code:"au" },
  { id:"ca", label:"Canada",         code:"ca" },
  { id:"nl", label:"Netherlands",    code:"nl" },
];

const CURRENCIES = ["USD","EUR","GBP","SGD","AUD","CAD","AED","INR"];

// State / province lists per country. Used to populate the State dropdown
// dynamically based on country of incorporation. Countries not listed here
// fall back to a free-text input.
const STATES_BY_COUNTRY: Record<string, string[]> = {
  us: [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
    "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
    "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
    "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
    "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
    "Wisconsin","Wyoming","District of Columbia",
  ],
  in: [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
    "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
    "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
    "Uttarakhand","West Bengal",
    "Andaman & Nicobar Islands","Chandigarh","Dadra & Nagar Haveli and Daman & Diu",
    "Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
  ],
  ca: [
    "Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador",
    "Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan",
    "Northwest Territories","Nunavut","Yukon",
  ],
  au: [
    "New South Wales","Victoria","Queensland","Western Australia","South Australia",
    "Tasmania","Australian Capital Territory","Northern Territory",
  ],
  de: [
    "Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse",
    "Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate",
    "Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia",
  ],
};

const INDUSTRIES = [
  "Technology / SaaS","Financial Services","Healthcare / Pharma",
  "E-commerce / Retail","Manufacturing","Consulting / Professional Services",
  "Media / Entertainment","Education","Logistics / Supply Chain",
  "Legal / Compliance","Other",
];

// Pre-written one-line company descriptions used by the "Auto generate" button.
// Picked deterministically from the selected Industry. Once a real Claude
// endpoint is wired up these become the fallback only.
const INDUSTRY_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
  "Technology / SaaS": [
    "We build cloud-native software products for mid-market enterprises across global markets.",
    "We develop B2B SaaS tools that help engineering teams ship and operate software faster.",
    "We create developer infrastructure and APIs that power modern digital products.",
  ],
  "Financial Services": [
    "We provide regulated financial products and advisory services to institutional and retail clients.",
    "We operate a fintech platform that handles payments, lending, and treasury for businesses.",
    "We offer wealth management and capital markets services for high-net-worth clients.",
  ],
  "Healthcare / Pharma": [
    "We develop healthcare technology and clinical workflow products used by hospitals and providers.",
    "We research, manufacture, and distribute pharmaceutical products under regulatory oversight.",
    "We deliver digital health and telemedicine services that improve patient outcomes.",
  ],
  "E-commerce / Retail": [
    "We operate an e-commerce platform that sells consumer products direct to customers globally.",
    "We run an online marketplace connecting independent sellers with buyers across categories.",
    "We design, manufacture, and retail consumer goods through both online and physical channels.",
  ],
  "Manufacturing": [
    "We manufacture and supply industrial products to OEMs and enterprise customers.",
    "We design and produce specialty components for automotive, aerospace, and electronics industries.",
    "We operate manufacturing facilities that produce consumer and industrial goods at scale.",
  ],
  "Consulting / Professional Services": [
    "We provide management and strategy consulting to mid-market and enterprise clients.",
    "We deliver professional advisory and implementation services across industries.",
    "We offer specialized consulting in operations, technology, and organizational transformation.",
  ],
  "Media / Entertainment": [
    "We produce and distribute digital media content across streaming and broadcast platforms.",
    "We run a media network that publishes editorial content, podcasts, and video programming.",
    "We create entertainment IP and license it across film, gaming, and merchandise markets.",
  ],
  "Education": [
    "We build online learning products that help students and professionals acquire new skills.",
    "We operate accredited education programs that combine instructor-led and digital learning.",
    "We provide training and certification programs for working professionals across sectors.",
  ],
  "Logistics / Supply Chain": [
    "We provide third-party logistics, warehousing, and last-mile delivery services for businesses.",
    "We operate a freight and supply-chain platform that moves goods across international markets.",
    "We build logistics technology that helps shippers optimize routing, inventory, and fulfilment.",
  ],
  "Legal / Compliance": [
    "We provide legal advisory and regulatory compliance services to enterprises and law firms.",
    "We operate a legaltech platform that automates contract review, compliance, and disputes.",
    "We offer specialized legal services covering corporate, regulatory, and dispute resolution work.",
  ],
  "Other": [
    "We deliver products and services to enterprise and consumer customers across multiple markets.",
  ],
};

function generateCompanyDescription(industry: string, companyName: string): string {
  const pool = INDUSTRY_DESCRIPTION_TEMPLATES[industry] ?? INDUSTRY_DESCRIPTION_TEMPLATES["Other"];
  // Deterministic pick based on company name so re-clicking returns the same suggestion
  // (acts like a cached response). Falls back to first template when name is empty.
  if (!companyName) return pool[0];
  let h = 0;
  for (let i = 0; i < companyName.length; i++) h = ((h << 5) - h + companyName.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

const TEAM_SIZE_OPTS = ["1–10","11–50","51–200","201–500","501–1,000","1,000+"];

const SANCTIONS_ITEMS = [
  { id:"legit_funds",  label:"I confirm that all funds used for payroll purposes are sourced from legitimate and traceable business activities." },
  { id:"no_sanctions", label:"I declare that neither the company nor any of its directors or Ultimate Beneficial Owners (UBOs) are listed on any international sanctions or embargo lists." },
  { id:"aml",          label:"I affirm that my company complies with Anti-Money Laundering (AML) and Counter Financing of Terrorism (CFT) laws in its jurisdiction." },
  { id:"no_pep",       label:"I confirm that none of the directors or UBOs of my company are considered Politically Exposed Persons (PEPs), nor are they closely associated with a PEP." },
];

const SENSITIVE_DATA_OPTS = [
  { id:"pii",       label:"Personal Identifiable Information (PII)" },
  { id:"health",    label:"Health / medical records" },
  { id:"financial", label:"Financial / payment data" },
  { id:"children",  label:"Data involving minors" },
  { id:"biometric", label:"Biometric data" },
  { id:"none",      label:"No sensitive data involved" },
];

const REGULATORY_OPTS = [
  { id:"rbi",   label:"RBI — Reserve Bank of India" },
  { id:"sebi",  label:"SEBI — Securities & Exchange Board of India" },
  { id:"fca",   label:"FCA — Financial Conduct Authority (UK)" },
  { id:"sec",   label:"SEC — Securities & Exchange Commission (US)" },
  { id:"hipaa", label:"HHS OCR — US Health & Human Services (HIPAA)" },
  { id:"gdpr",  label:"DPA — EU Data Protection Authority (GDPR)" },
  { id:"pdpa",  label:"PDPC — Singapore Personal Data Protection Commission" },
  { id:"other", label:"Other regulator" },
  { id:"none",  label:"Not regulated / no specific regulator" },
];

// ── Draft type ─────────────────────────────────────────────────────────────

type Draft = {
  // Step 1 — Tell us about your organization
  signatoryName: string;
  designation: string;
  legalCompanyName: string;
  entityType: string;
  teamSize: string;
  countryOfIncorporation: string;
  companyWebsite: string;
  noCompanyWebsite: boolean;
  directors: { name: string; idFileName: string }[];
  hasMajorityOwner: boolean;
  ubos: { name: string; percent: string; relationship: string }[];
  // Legacy single-value fields (kept for sessionStorage hydration compat)
  directorName: string;
  govIdFileName: string;
  beneficialOwnerName: string;
  beneficialOwnerPercent: string;
  beneficialOwnerRelationship: string;
  // Step 2 — Let's set up your business
  addressStreet: string;
  addressCity: string;
  addressCountry: string;
  addressState: string;
  addressZip: string;
  proofFileName: string;
  billingCurrency: string;
  sameAsRegisteredAddressForBilling: boolean;
  willReceiveBillingComms: boolean;
  billingContactName: string;
  billingContactEmail: string;
  // Step 3 — Compliance declaration
  taxRegNumber: string;
  taxCertFileName: string;
  sanctionsChecked: string[];
  prohibitedIndustriesAck: boolean;
  // Step 1 (moved from old "About your business" screen)
  companyDescription: string;
  industry: string;
  // Step 4 — Your presence in India
  hasIndiaEntity: string;
  indiaEntityType: string;
  indiaEntityName: string;
  indiaEntityTaxId: string;
  travelToIndia: string;
  signingAuthority: string;
  fixedDesk: string;
  // Step 5 — Data & regulation
  sensitiveDataTypes: string[];
  regulatoryBodies: string[];
  // Step 6 — Our partnership terms
  msaReviewed: boolean;
  // Legacy / unused (kept to avoid breaking sessionStorage hydration)
  registeredAddress: string;
};

const DEFAULT_DRAFT: Draft = {
  // Step 1
  signatoryName: "", designation: "",
  legalCompanyName: "", entityType: "", teamSize: "", countryOfIncorporation: "",
  companyWebsite: "", noCompanyWebsite: false,
  directors: [], hasMajorityOwner: false, ubos: [],
  directorName: "", govIdFileName: "",
  beneficialOwnerName: "", beneficialOwnerPercent: "", beneficialOwnerRelationship: "",
  // Step 2
  addressStreet: "", addressCity: "", addressCountry: "", addressState: "", addressZip: "",
  proofFileName: "",
  billingCurrency: "", sameAsRegisteredAddressForBilling: true,
  willReceiveBillingComms: false, billingContactName: "", billingContactEmail: "",
  // Step 1 (moved from old "About your business" screen)
  companyDescription: "", industry: "",
  // Step 3
  taxRegNumber: "", taxCertFileName: "",
  sanctionsChecked: [], prohibitedIndustriesAck: false,
  // Steps 4-5
  hasIndiaEntity: "", indiaEntityType: "", indiaEntityName: "", indiaEntityTaxId: "",
  travelToIndia: "", signingAuthority: "", fixedDesk: "",
  sensitiveDataTypes: [], regulatoryBodies: [],
  // Step 6
  msaReviewed: false,
  // Legacy
  registeredAddress: "",
};

const STORAGE_KEY = "wm_org_draft";
const STORAGE_STEP_KEY = "wm_org_step";

// ── Validation ─────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof Draft, string>>;

const isEmpty = (v: string) => !v || !v.trim();
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidUrl = (v: string) => /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[\w\-./?%&=]*)?$/i.test(v.trim());
// Names: must have at least two parts (first + last), each at least 2 letters.
// Letters / hyphens / apostrophes / periods only. Allows non-Latin scripts via \p{L}.
const isValidPersonName = (v: string) => {
  const s = v.trim().replace(/\s+/g, " ");
  if (!/^[\p{L}'.-]+(?:\s[\p{L}'.-]+)+$/u.test(s)) return false;
  const parts = s.split(" ");
  if (parts.length < 2) return false;
  // Every part must have at least 2 letter characters.
  return parts.every((p) => (p.match(/\p{L}/gu) ?? []).length >= 2);
};
// Postal: 3-12 chars, alphanumeric (with optional space/hyphen)
const isValidPostalCode = (v: string) => /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/.test(v.trim());
// Tax reg: at least 5 alphanumeric chars (with optional dashes)
const isValidTaxReg = (v: string) => /^[A-Za-z0-9][A-Za-z0-9\s-]{3,}$/.test(v.trim());

/**
 * Validate a single field. Returns an error message or undefined if valid.
 * Used both on blur (per-field) and on submit (run for every field on the step).
 */
function validateField(key: keyof Draft, draft: Draft): string | undefined {
  switch (key) {
    case "signatoryName":
      if (isEmpty(draft.signatoryName)) return "Please enter your full name";
      if (!isValidPersonName(draft.signatoryName)) return "Please enter your first and last name (each at least 2 letters)";
      return;
    case "designation":
      if (isEmpty(draft.designation)) return "Please enter your job title";
      return;
    case "legalCompanyName":
      if (isEmpty(draft.legalCompanyName)) return "Please enter your company's legal name";
      if (draft.legalCompanyName.trim().length < 2) return "Company name is too short";
      return;
    case "entityType":
      if (isEmpty(draft.entityType)) return "Please select an entity type";
      return;
    case "companyDescription":
      if (isEmpty(draft.companyDescription)) return "Please describe what your company does";
      if (draft.companyDescription.trim().length < 10) return "Please provide a bit more detail (at least 10 characters)";
      return;
    case "industry":
      if (isEmpty(draft.industry)) return "Please select an industry";
      return;
    case "teamSize":
      if (isEmpty(draft.teamSize)) return "Please select your team size";
      return;
    case "countryOfIncorporation":
      if (isEmpty(draft.countryOfIncorporation)) return "Please select a country";
      return;
    case "companyWebsite":
      if (draft.noCompanyWebsite) return;
      if (isEmpty(draft.companyWebsite)) return "Please enter your company website";
      if (!isValidUrl(draft.companyWebsite)) return "Enter a valid URL (e.g. https://acme.com)";
      return;
    case "addressStreet":
      if (isEmpty(draft.addressStreet)) return "Please enter your street address";
      if (draft.addressStreet.trim().length < 5) return "Street address is too short";
      return;
    case "addressCity":
      if (isEmpty(draft.addressCity)) return "Please enter your city";
      if (!/^[\p{L}][\p{L}\s.'-]{1,}$/u.test(draft.addressCity.trim())) return "Enter a valid city name";
      return;
    case "addressCountry":
      // No longer collected on the form — country is sourced from step 1's
      // `countryOfIncorporation`. Kept in Draft for sessionStorage compat only.
      return;
    case "addressState":
      if (isEmpty(draft.addressState)) return "Please enter your state/province";
      return;
    case "addressZip":
      if (isEmpty(draft.addressZip)) return "Please enter your postal code";
      if (!isValidPostalCode(draft.addressZip)) return "Enter a valid postal code";
      return;
    case "proofFileName":
      // Optional — proof of address can be supplied later via the dashboard.
      return;
    case "billingCurrency":
      if (isEmpty(draft.billingCurrency)) return "Please select a billing currency";
      return;
    case "billingContactName":
      if (draft.sameAsRegisteredAddressForBilling) return;
      if (isEmpty(draft.billingContactName)) return "Please enter the billing contact name";
      if (!isValidPersonName(draft.billingContactName)) return "Please enter the contact's first and last name (each at least 2 letters)";
      return;
    case "billingContactEmail":
      if (draft.sameAsRegisteredAddressForBilling) return;
      if (isEmpty(draft.billingContactEmail)) return "Please enter the billing contact email";
      if (!isValidEmail(draft.billingContactEmail)) return "Enter a valid email address (e.g. name@company.com)";
      return;
    case "directors": {
      const ds = draft.directors;
      if (!ds.length || ds.every((d) => isEmpty(d.name) && !d.idFileName)) return "Please add at least one director";
      for (const d of ds) {
        if (isEmpty(d.name) || !isValidPersonName(d.name)) return "Enter each director's first and last name (each at least 2 letters)";
        if (!d.idFileName) return "Upload a government ID for each director";
      }
      return;
    }
    case "ubos": {
      if (!draft.ubos.length) return "Please add at least one beneficial owner";
      for (const u of draft.ubos) {
        if (isEmpty(u.name) || !isValidPersonName(u.name)) return "Enter each owner's first and last name (each at least 2 letters)";
        const pct = parseFloat(u.percent);
        if (isEmpty(u.percent) || isNaN(pct) || pct < 25 || pct > 100) return "Enter an ownership percentage between 25 and 100 for each owner";
      }
      return;
    }
    case "taxRegNumber":
      if (isEmpty(draft.taxRegNumber)) return "Please enter your tax registration number";
      if (!isValidTaxReg(draft.taxRegNumber)) return "Enter a valid tax registration number (at least 5 characters, letters/numbers)";
      return;
    case "taxCertFileName":
      if (!draft.taxCertFileName) return "Please upload your tax certificate";
      return;
    case "sanctionsChecked":
      if (draft.sanctionsChecked.length !== SANCTIONS_ITEMS.length) return "Please confirm all four declarations to continue";
      return;
    case "prohibitedIndustriesAck":
      if (!draft.prohibitedIndustriesAck) return "Please acknowledge the prohibited industries declaration";
      return;
    case "hasIndiaEntity":
      if (isEmpty(draft.hasIndiaEntity)) return "Please select an option";
      return;
    case "indiaEntityType":
      if (draft.hasIndiaEntity !== "yes") return;
      if (isEmpty(draft.indiaEntityType)) return "Please select the type of entity";
      return;
    case "indiaEntityName":
      if (draft.hasIndiaEntity !== "yes") return;
      if (isEmpty(draft.indiaEntityName)) return "Please enter the registered name of your India entity";
      return;
    case "indiaEntityTaxId":
      if (draft.hasIndiaEntity !== "yes") return;
      if (isEmpty(draft.indiaEntityTaxId)) return "Please enter your India tax ID (PAN / CIN / GSTIN)";
      if (!isValidTaxReg(draft.indiaEntityTaxId)) return "Enter a valid ID (at least 5 characters, letters/numbers)";
      return;
    case "sensitiveDataTypes":
      if (draft.sensitiveDataTypes.length === 0) return "Please select at least one option (or 'No sensitive data involved')";
      return;
    case "regulatoryBodies":
      if (draft.regulatoryBodies.length === 0) return "Please select at least one option (or 'Not regulated')";
      return;
    case "msaReviewed":
      if (!draft.msaReviewed) return "Please send the agreement for signature to continue";
      return;
  }
  return;
}

const STEP_FIELDS: Record<Step, (keyof Draft)[]> = {
  1: ["signatoryName","designation","legalCompanyName","entityType","companyDescription","industry","teamSize","countryOfIncorporation","companyWebsite"],
  2: ["legalCompanyName","addressStreet","addressCity","addressState","addressZip"],
  3: ["billingCurrency","billingContactName","billingContactEmail","taxRegNumber","taxCertFileName","directors","ubos"],
  4: ["sanctionsChecked","prohibitedIndustriesAck"],
  5: ["hasIndiaEntity","indiaEntityType","indiaEntityName","indiaEntityTaxId"],
  6: ["sensitiveDataTypes","regulatoryBodies"],
  7: [],
  8: ["msaReviewed"],
};

function validateStep(step: Step, draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of STEP_FIELDS[step]) {
    const err = validateField(key, draft);
    if (err) errors[key] = err;
  }
  return errors;
}

// ── Reusable field components ─────────────────────────────────────────────

const PROHIBITED_ACTIVITIES = [
  "Arms, weapons, ammunition, or explosives",
  "Gambling, betting, or online casinos",
  "Adult entertainment or pornography",
  "Narcotics, illegal drugs, or related trade",
  "Shell companies or anonymous ownership structures",
  "Postal services, MLM schemes, or pyramid models",
  "Unlicensed money services, lending, or investment businesses",
  "Unregulated foreign exchange or remittance businesses",
  "Counterfeit goods or intellectual property infringement",
  "Environmental crimes (illegal mining, logging, wildlife trafficking)",
  "Cryptocurrency or digital asset businesses (e.g., exchanges, wallets, ICOs, DeFi platforms)",
];

function ProhibitedIndustriesBlock({ checked, onToggle }: {
  checked: boolean; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-3">
        <div
          onClick={onToggle}
          className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[2px] transition ${
            checked ? "border border-brand-500 bg-brand-500" : "border-2 border-border"
          }`}
        >
          {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        </div>
        <span className="text-body-sm text-foreground">
          I hereby declare that my company is not involved in any prohibited or high-risk activities,
          including but not limited to the following.
        </span>
      </label>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-body-sm-bold inline-flex w-fit items-center gap-1.5 text-brand-500 hover:text-brand-600"
      >
        View activities
        <ChevronDown
          className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {expanded && (
        <div className="rounded-[8px] border border-[#eef0f3] bg-card p-4">
          <p className="text-body-sm-bold mb-2 text-foreground">
            Your company does not engage in any of the following activities:
          </p>
          <ul className="ml-4 list-disc space-y-1 text-body-sm text-muted-foreground">
            {PROHIBITED_ACTIVITIES.map((activity) => (
              <li key={activity}>{activity}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Builds and downloads a plain-text copy of the MSA. No real PDF asset exists in
// this prototype, so we generate the document client-side from the same content
// shown in the signing modal.
function downloadMsaCopy(customerSummary: string) {
  const today = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const body = [
    "MASTER SERVICES AGREEMENT",
    "",
    "Wisemonk: Storypeach Technologies Private Limited, India DBA Wisemonk",
    `Customer: ${customerSummary || "—"}`,
    `Effective Date: ${today}    Initial Term: 1 year`,
    "",
    "This Master Services Agreement, together with its exhibits (the \"Agreement\"),",
    "is entered into as of the Effective Date by and between Wisemonk and Customer.",
    "",
    "1. Services",
    "1.1. Customer and each Wisemonk Member may, during the Term, from time to time",
    "     enter into one or more scope of work agreements (each a \"SOW\").",
    "1.2. Customer hereby retains Wisemonk to provide the Wisemonk Services in",
    "     accordance with any mutually executed SOW.",
    "",
    "Review and sign in the portal. Wisemonk will countersign (Aastha Goyal,",
    "Director, Wisemonk) to fully execute the agreement.",
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Master_Service_Agreement.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function PartnershipTermsCard({ msaReviewed, signatoryName, customerSummary, onSign }: {
  msaReviewed: boolean;
  signatoryName: string;
  customerSummary: string;
  onSign: () => void;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);

  return (
    <>
      <div className="rounded-[8px] bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <p className="text-base text-foreground">
            This agreement explains how we&apos;ll work together including payments,
            compliance, and confidentiality to keep everything transparent and secure.
          </p>

          {/* PDF view / download row */}
          <div className="flex items-center gap-4 rounded-[8px] border border-[#eef0f3] bg-card px-4 py-3">
            <File className="h-6 w-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <button
              type="button"
              onClick={() => setSignOpen(true)}
              className="flex flex-1 flex-col text-left"
            >
              <span className="text-base font-bold text-foreground">Master_Service_Agreement.pdf</span>
              <span className="text-body-sm text-brand-500 transition hover:text-brand-600 hover:underline">Click to view the file</span>
            </button>
            <button
              type="button"
              onClick={() => downloadMsaCopy(customerSummary)}
              className="rounded-[8px] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Download MSA"
            >
              <Download className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </div>

          {/* What happens next info box */}
          <div className="rounded-[8px] bg-brand-50/60 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2} />
              <div className="flex flex-col gap-1.5">
                <p className="text-body-sm-bold text-foreground">What happens next?</p>
                <p className="text-body-sm text-muted-foreground">
                  Click <strong className="font-bold text-foreground">Review and sign</strong> to read
                  the full agreement and sign it directly here in the portal. Once you sign,
                  Wisemonk will countersign — the agreement is then fully executed and
                  we&apos;ll email you a copy.
                </p>
              </div>
            </div>
          </div>

          {inviteSentTo && (
            <div className="flex items-start gap-2 rounded-[8px] border border-brand-500/20 bg-brand-50/60 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />
              <p className="text-body-sm text-foreground">
                Signing invitation sent to <strong className="font-bold">{inviteSentTo}</strong>.
                We&apos;ll email you once they&apos;ve signed.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] border border-brand-500 bg-card px-5 text-brand-500 transition hover:bg-brand-50"
            >
              Invite someone else to sign
            </button>
            <button
              type="button"
              onClick={() => setSignOpen(true)}
              className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] bg-primary px-5 text-primary-foreground transition hover:bg-brand-600"
            >
              {msaReviewed ? "Signed ✓" : "Review and sign"}
            </button>
          </div>
        </div>
      </div>

      <MsaSignModal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        defaultName={signatoryName}
        customerSummary={customerSummary}
        onSigned={() => {
          setSignOpen(false);
          onSign();
        }}
      />

      <InviteToSignModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          setInviteSentTo(email);
        }}
      />
    </>
  );
}

// ── Invite-someone-else-to-sign modal ──────────────────────────────────────
// Collects the signer's name + email. No real email is dispatched in this
// prototype — submitting surfaces an in-card confirmation via onInvited.
function InviteToSignModal({ open, onClose, onInvited }: {
  open: boolean;
  onClose: () => void;
  onInvited: (email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setEmail(""); setTouched(false); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const nameValid = isValidPersonName(name);
  const emailValid = isValidEmail(email);
  const canSend = nameValid && emailValid;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite someone else to sign"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        className="absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative flex w-full max-w-[460px] flex-col gap-5 rounded-[12px] bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-foreground">Invite someone else to sign</h2>
            <p className="text-body-sm text-muted-foreground">
              We&apos;ll email this person a secure link to review and sign the agreement on
              behalf of your company.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <TextInput
            label="Full name"
            required
            value={name}
            onChange={setName}
            onBlur={() => setTouched(true)}
            error={touched && !nameValid ? "Please enter their first and last name" : undefined}
          />
          <TextInput
            label="Email address"
            required
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(true)}
            error={touched && !emailValid ? "Enter a valid email address" : undefined}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] border border-border bg-card px-5 text-foreground transition hover:border-foreground/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { setTouched(true); if (canSend) onInvited(email.trim()); }}
            aria-disabled={!canSend}
            className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] bg-primary px-5 text-primary-foreground transition hover:bg-brand-600 aria-disabled:bg-gray-300 aria-disabled:text-gray-600 aria-disabled:hover:bg-gray-300"
          >
            Send invitation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MSA in-portal signing modal ────────────────────────────────────────────

function MsaSignModal({ open, onClose, defaultName, customerSummary, onSigned }: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  customerSummary: string;
  onSigned: () => void;
}) {
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Pre-fill the signature with the signatory name when the modal opens.
  useEffect(() => {
    if (open && defaultName) setSignature(defaultName);
    if (open) setAgreed(false);
  }, [open, defaultName]);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
  const canSign = signature.trim().length >= 2 && agreed;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Master Service Agreement"
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
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Master Service Agreement</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable agreement body — matches the layout of the actual
            9-page Wisemonk MSA PDF (parties table, recitals, definitions,
            then numbered clauses). */}
        <div className="flex-1 overflow-y-auto px-8 py-6 text-body-sm leading-relaxed text-foreground">
          {/* Centered title */}
          <h2 className="mb-5 text-center text-base font-bold uppercase tracking-wide text-foreground">
            Master Services Agreement
          </h2>

          {/* Parties / term / signatures table */}
          <table className="mb-6 w-full border-collapse">
            <tbody>
              <tr>
                <td className="w-[140px] border border-foreground/40 px-3 py-2.5 text-body-sm-bold align-top">Wisemonk</td>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm" colSpan={3}>
                  Storypeach Technologies Private Limited, India DBA Wisemonk
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm-bold align-top">Customer</td>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm" colSpan={3}>
                  {customerSummary || "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm-bold align-top">Effective Date</td>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm">{today}</td>
                <td className="w-[120px] border border-foreground/40 px-3 py-2.5 text-body-sm-bold align-top">Initial Term</td>
                <td className="w-[100px] border border-foreground/40 px-3 py-2.5 text-body-sm">1 year</td>
              </tr>
              <tr>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm-bold align-top">Signatures</td>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm">Wisemonk</td>
                <td className="border border-foreground/40 px-3 py-2.5 text-body-sm" colSpan={2}>Customer</td>
              </tr>
            </tbody>
          </table>

          {/* Preamble */}
          <p className="mb-5">
            This <strong className="font-bold">Master Services Agreement</strong>, together with its
            exhibits (the &ldquo;Agreement&rdquo;), is entered into as of the Effective Date by
            and between Wisemonk and Customer. For purposes of this Agreement, Wisemonk and
            Customer will be referred to individually as a &ldquo;Party&rdquo; and together as
            the &ldquo;Parties.&rdquo;
          </p>

          {/* Recitals */}
          <h3 className="mb-2 mt-6 text-body font-bold text-foreground">RECITALS</h3>
          <p className="mb-3">
            <strong className="font-bold">WHEREAS,</strong> for the purpose of this Agreement, an
            &ldquo;Affiliate&rdquo; is any entity which is (i) a subsidiary of any Wisemonk
            Member; (ii) a subsidiary of the same entity or controlled by the same entity or
            individual; or (iii) any other entity or company operating in partnership with
            Wisemonk under a separate written agreement. Wisemonk and Affiliates together are
            referred as Wisemonk
          </p>
          <p className="mb-3">
            <strong className="font-bold">WHEREAS,</strong> Wisemonk is engaged in the business
            of providing Customers with specialized consultants who are onboarded on the
            Wisemonk platform for the provision thereof of certain human resource management and
            other related services hereunder (&ldquo;Platform Users&rdquo; and &ldquo;Wisemonk
            Services&rdquo;, respectively); and
          </p>
          <p className="mb-3">
            <strong className="font-bold">WHEREAS,</strong> Wisemonk provides as part of the
            Wisemonk Services a software-as-a-service solution that allows Customers to
            seamlessly manage relationships with local and international independent contractors,
            including, the receipt of services from Platform Users (the &ldquo;Wisemonk
            Platform&rdquo;); and
          </p>
          <p className="mb-3">
            <strong className="font-bold">WHEREAS,</strong> Customer desires to obtain from
            Wisemonk, and Wisemonk desires to provide to Customer, the Wisemonk Services and a
            license to access and use the Wisemonk Platform, subject to the terms and conditions
            of this Agreement.
          </p>

          {/* Definitions */}
          <h3 className="mb-2 mt-6 text-body font-bold text-foreground">DEFINITIONS</h3>
          <p className="mb-3">
            For the purposes of this Agreement, in addition to terms defined elsewhere in this
            Agreement, the following terms shall have the meanings set forth below:
          </p>
          <p className="mb-3">
            (i) <strong className="font-bold">&ldquo;Platform User&rdquo;</strong> means a
            specialized consultant who: (a) is onboarded on the Wisemonk platform; (b) is
            employed by Wisemonk; (c) is assigned to perform services for Customer;
          </p>
          <p className="mb-3">
            (ii) <strong className="font-bold">&ldquo;SOW&rdquo;</strong> or{" "}
            <strong className="font-bold">&ldquo;Scope of Work&rdquo;</strong> means: (a) a
            detailed document that serves as an addendum to this Agreement; (b) specifies
            particular Wisemonk Services to be provided; (c) specifies the payment terms
          </p>
          <p className="mb-3">
            (iii) <strong className="font-bold">&ldquo;Wisemonk&rdquo;</strong> means Storypeach
            Technologies Private Limited, India; and its respective Affiliates.
          </p>
          <p className="mb-3">
            (iv) <strong className="font-bold">&ldquo;Wisemonk Platform&rdquo;</strong> means the
            software-as-a-service solution provided by Wisemonk;
          </p>
          <p className="mb-3">
            (v) <strong className="font-bold">&ldquo;Wisemonk Services&rdquo;</strong> means any
            services specified in an applicable SOW
          </p>

          <p className="mb-5">
            <strong className="font-bold">NOW, THEREFORE,</strong> in consideration of the mutual
            covenants and promises set forth below, and other good and valuable consideration,
            the receipt of which is hereby acknowledged, the Parties hereby agree as follows:
          </p>

          {/* Services */}
          <ol className="ml-6 list-decimal space-y-4">
            <li className="font-bold text-foreground">
              <span className="font-bold">Services</span>
              <div className="mt-2 font-normal">
                <p className="mb-3">
                  <strong className="font-bold">1.1.</strong> Customer and each Wisemonk Member
                  may, during the Term (as defined below), from time to time enter into one or
                  more scope of work agreements for the provision of the Wisemonk Services (each
                  a &ldquo;Scope of Work&rdquo; or &ldquo;SOW&rdquo;). Each SOW shall be a
                  separate addendum to this Agreement.
                </p>
                <p className="mb-3">
                  <strong className="font-bold">1.2.</strong> Customer hereby retains Wisemonk to
                  provide the Wisemonk Services in accordance with any mutually executed SOW.
                </p>
              </div>
            </li>
          </ol>

          <p className="mt-6 text-body-sm text-muted-foreground">
            By typing your name below and clicking <strong className="font-bold text-foreground">Agree &amp; Sign</strong>,
            you agree this constitutes your electronic signature with the same legal effect as
            a handwritten signature under applicable e-sign laws.
          </p>
        </div>

        {/* Signature row */}
        <div className="grid grid-cols-2 gap-6 border-t border-[#eef0f3] px-6 pt-4">
          <div className="flex flex-col">
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to sign"
              className="border-b border-foreground/40 bg-transparent pb-1 text-2xl text-foreground placeholder:text-muted-foreground/60 focus:border-brand-500 focus:outline-none"
              style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontStyle: "italic" }}
            />
            <p className="mt-1 text-xs text-muted-foreground">Enter your full name (Client signature)</p>
          </div>
          <div className="flex flex-col">
            <div className="border-b border-dashed border-foreground/30 pb-1 text-2xl text-muted-foreground/50"
              style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontStyle: "italic" }}
            >
              Pending
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aastha Goyal · Director, Wisemonk · Countersigns after you sign
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-3 px-6 py-4">
          {/* Acknowledgement checkbox — gates the Agree & Sign button */}
          <button
            type="button"
            onClick={() => setAgreed((a) => !a)}
            className="flex items-start gap-3 px-1 py-1 text-left transition"
          >
            <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] transition ${
              agreed ? "border border-foreground bg-foreground" : "border-2 border-border"
            }`}>
              {agreed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-body-sm text-foreground">
              I have read and agree to the terms of this Master Service Agreement,
              and confirm that I&apos;m authorised to sign on behalf of the Client.
            </span>
          </button>

          <button
            type="button"
            onClick={() => canSign && onSigned()}
            disabled={!canSign}
            className="text-base font-bold inline-flex h-12 w-full items-center justify-center rounded-[8px] bg-primary px-7 text-primary-foreground transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            Agree &amp; Sign
          </button>
          <button
            type="button"
            onClick={() => downloadMsaCopy(customerSummary)}
            className="text-base font-bold inline-flex h-12 w-full items-center justify-center rounded-[8px] border border-border bg-card text-foreground transition hover:border-foreground/30"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: {
  title?: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-6">
        {title && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description && (
              <p className="text-body-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * HelpPanel — slide-in chat-style onboarding support panel for the current step.
 * Shows suggested questions (from STEP_HELP), a conversation thread, and a
 * free-text input. Suggestion clicks return the matched answer instantly;
 * custom questions get a fallback response pointing to email support.
 */
type ChatMessage = { role: "user" | "support"; text: string };

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
    // Loose match — find any item whose question contains the user input or vice versa.
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

        {/* Conversation thread (scrollable) */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-6">
          {/* Conversation messages */}
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

          {/* Suggested questions (chips) */}
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

        {/* Input — composer at the bottom */}
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

/**
 * InfoBanner — light-blue, info-icon-prefixed callout used for contextual notes
 * (e.g. "Note: This information will be used for invoicing…").
 *
 *   <InfoBanner prefix="Note">This information is used for billing.</InfoBanner>
 *   <InfoBanner>Just plain copy with no bold prefix.</InfoBanner>
 */
function InfoBanner({ prefix, children }: {
  prefix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[8px] bg-brand-50 px-4 py-3.5">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={2} />
      <p className="text-body-sm leading-relaxed text-foreground">
        {prefix && <span className="font-bold">{prefix}: </span>}
        <span className="text-muted-foreground">{children}</span>
      </p>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center align-middle">
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground transition hover:text-foreground" strokeWidth={2} />
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-64 -translate-x-1/2 rounded-[8px] bg-foreground px-3 py-2 text-xs leading-snug text-background opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function AiAssistButton({ onClick, label = "AI assist" }: { onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      // Prevent the adjacent input from blurring on click — without this the input's
      // onBlur fires first, the field exits floating state, the button unmounts, and
      // the click handler never executes.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center gap-1 bg-transparent text-xs font-semibold transition hover:opacity-80"
    >
      <Sparkles className="h-3.5 w-3.5 text-violet-500" strokeWidth={2.25} />
      <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
        {label}
      </span>
    </button>
  );
}

function Field({ label, required, hint, info, ai, error, children }: {
  label: string; required?: boolean; hint?: string; info?: string;
  ai?: { onClick?: () => void; label?: string };
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-sm-bold inline-flex items-center gap-1.5 text-foreground">
          <span>
            {label}
            {required && <span className="ml-0.5 text-muted-foreground">*</span>}
          </span>
          {info && <InfoTip text={info} />}
        </p>
        {ai && <AiAssistButton onClick={ai.onClick} label={ai.label} />}
      </div>
      {children}
      {error && <p data-field-error="true" className="text-xs font-medium text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Floating-label inputs ─────────────────────────────────────────────────
// Behavior: the label sits inside the input as a placeholder when empty.
// On focus or when filled, it floats to the top of the input. `info` is
// revealed inline beneath the input only while focused.

function FloatingShell({
  focused, onContainerClick, children, info, ai, isFloating, error,
}: {
  focused: boolean;
  onContainerClick?: () => void;
  children: React.ReactNode;
  info?: string;
  ai?: { onClick?: () => void; label?: string };
  isFloating: boolean;
  error?: string;
}) {
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : focused
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div className="flex flex-col gap-1.5">
      <div
        onClick={onContainerClick}
        className={`relative rounded-[8px] border bg-card transition ${borderClass}`}
      >
        {ai && isFloating && (
          <div className="absolute right-3 top-1.5 z-10">
            <AiAssistButton onClick={ai.onClick} label={ai.label} />
          </div>
        )}
        {children}
      </div>
      {error
        ? <p data-field-error="true" className="px-1 text-xs font-medium text-destructive">{error}</p>
        : focused && info && (
            <p className="px-1 text-xs text-muted-foreground">{info}</p>
          )
      }
    </div>
  );
}

function TextInput({
  id, value, onChange, label, info, ai, placeholder, autoFocus, type = "text", required, error, onBlur,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  label?: string; info?: string;
  ai?: { onClick?: () => void; label?: string };
  placeholder?: string; autoFocus?: boolean; type?: string;
  required?: boolean; error?: string;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  // Legacy path: no label → render plain input (used inside <Field/>).
  if (!label) {
    return (
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder} autoFocus={autoFocus}
        className={`text-body w-full rounded-[8px] border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
          error
            ? "border-destructive ring-destructive/20 focus:border-destructive focus:ring-destructive/20"
            : "border-border focus:border-brand-500 focus:ring-brand-100"
        }`}
      />
    );
  }
  const isFloating = focused || value.length > 0;
  // Show the AI assist button whenever the field is focused (empty or filled,
  // so users can regenerate). Hide it when the field is not focused so the
  // unfocused state stays clean.
  const showAi = focused;
  return (
    <FloatingShell focused={focused} info={info} ai={showAi ? ai : undefined} isFloating={isFloating} error={error}>
      <label
        className={`pointer-events-none absolute left-4 transition-all ${
          isFloating
            ? "top-1.5 text-[11px] font-medium text-muted-foreground"
            : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        }`}
      >
        {label}
        {required && <span className="ml-0.5 text-muted-foreground">*</span>}
      </label>
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        autoFocus={autoFocus}
        placeholder={isFloating ? placeholder : ""}
        className="w-full rounded-[8px] border-none bg-transparent px-4 pb-2 pt-6 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
    </FloatingShell>
  );
}

function EmailInput(props: {
  id?: string; value: string; onChange: (v: string) => void;
  label?: string; info?: string;
  ai?: { onClick?: () => void; label?: string };
  placeholder?: string;
}) {
  return <TextInput {...props} type="email" />;
}

// Name field for a beneficial owner — suggests matching director names in a
// dropdown as the user types (a UBO is often also a director).
function UboNameField({ value, onChange, suggestions }: {
  value: string; onChange: (v: string) => void; suggestions: string[];
}) {
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isFloating = focused || value.length > 0;
  const q = value.trim().toLowerCase();
  const matches = suggestions.filter((n) => n && n.toLowerCase().includes(q) && n.toLowerCase() !== q);
  const open = focused && matches.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <FloatingShell focused={focused} isFloating={isFloating}>
        <label className={`pointer-events-none absolute left-4 transition-all ${
          isFloating ? "top-1.5 text-[11px] font-medium text-muted-foreground" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        }`}>
          Beneficial owner full name<span className="ml-0.5 text-muted-foreground">*</span>
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={isFloating ? "e.g. Jane Smith" : ""}
          className="w-full rounded-[8px] border-none bg-transparent px-4 pb-2 pt-6 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </FloatingShell>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-[8px] border border-border bg-card py-1 shadow-[0_8px_24px_rgba(34,39,51,0.1)]">
          <li className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Directors</li>
          {matches.map((n, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => { onChange(n); setFocused(false); }}
                className="flex w-full items-center px-3 py-2 text-left text-body-sm text-foreground transition hover:bg-brand-50"
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TextArea({
  id, value, onChange, label, info, ai, placeholder, rows = 4,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  label?: string; info?: string;
  ai?: { onClick?: () => void; label?: string };
  placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  if (!label) {
    return (
      <textarea
        id={id} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        className="text-body w-full resize-none rounded-[8px] border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    );
  }
  const isFloating = focused || value.length > 0;
  return (
    <FloatingShell focused={focused} info={info} ai={ai} isFloating={isFloating}>
      <label
        className={`pointer-events-none absolute left-4 transition-all ${
          isFloating
            ? "top-1.5 text-[11px] font-medium text-muted-foreground"
            : "top-4 text-base text-muted-foreground"
        }`}
      >
        {label}
      </label>
      <textarea
        id={id} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={isFloating ? placeholder : ""}
        rows={rows}
        className="w-full resize-none rounded-[8px] border-none bg-transparent px-4 pb-3 pt-6 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
    </FloatingShell>
  );
}

function SimpleDropdown({ value, onChange, options, placeholder, label, info, required, error }: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string; label?: string; info?: string;
  required?: boolean; error?: string;
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

  // Legacy: no label → render plain dropdown (used inside <Field/>).
  if (!label) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`text-body inline-flex w-full items-center justify-between gap-2 rounded-[8px] border bg-card px-4 py-3.5 text-left transition ${
            open ? "border-brand-500 ring-2 ring-brand-100" : "border-border hover:border-foreground/20"
          } ${!value ? "text-muted-foreground" : "text-foreground"}`}
        >
          {value || placeholder || "Select…"}
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`text-body-sm flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition ${
                  value === opt ? "bg-brand-100 text-brand-500" : "text-foreground hover:bg-muted"
                }`}
              >
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
    : open
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${borderClass}`}>
        <label
          className={`pointer-events-none absolute left-4 z-10 transition-all ${
            isFloating
              ? "top-1.5 text-[11px] font-medium text-muted-foreground"
              : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
          }`}
        >
          {label}
          {required && <span className="ml-0.5 text-muted-foreground">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`relative block w-full rounded-[8px] bg-transparent px-4 text-left text-base text-foreground ${
            isFloating ? "pb-2 pt-6" : "py-4"
          }`}
        >
          <span className={value ? "" : "invisible"}>{value || "x"}</span>
        </button>
        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`text-body-sm flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition ${
                  value === opt ? "bg-brand-100 text-brand-500" : "text-foreground hover:bg-muted"
                }`}
              >
                {opt}
                {value === opt && <Check className="h-4 w-4 text-brand-500" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error
        ? <p data-field-error="true" className="px-1 text-xs font-medium text-destructive">{error}</p>
        : open && info && (
            <p className="px-1 text-xs text-muted-foreground">{info}</p>
          )
      }
    </div>
  );
}

// Free-text input with type-ahead suggestions. Replaces a hard dropdown so
// users can type their own title while still getting matching suggestions.
function AutocompleteInput({
  value, onChange, options, label, info, required, error, onBlur, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: string[];
  label?: string; info?: string; required?: boolean; error?: string;
  onBlur?: () => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    }
    if (focused) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [focused]);

  const q = value.trim().toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q);
  const showList = focused && q.length > 0 && matches.length > 0;

  const isFloating = focused || value.length > 0;
  const borderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : focused
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${borderClass}`}>
        <label
          className={`pointer-events-none absolute left-4 z-10 transition-all ${
            isFloating
              ? "top-1.5 text-[11px] font-medium text-muted-foreground"
              : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
          }`}
        >
          {label}
          {required && <span className="ml-0.5 text-muted-foreground">*</span>}
        </label>
        <input
          type="text"
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          placeholder={isFloating ? placeholder : ""}
          className="w-full rounded-[8px] border-none bg-transparent px-4 pb-2 pt-6 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        {showList && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
            {matches.map((opt) => (
              <button
                key={opt} type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt); setFocused(false); }}
                className="text-body-sm flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-foreground transition hover:bg-muted"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {error
        ? <p data-field-error="true" className="px-1 text-xs font-medium text-destructive">{error}</p>
        : focused && info && (
            <p className="px-1 text-xs text-muted-foreground">{info}</p>
          )
      }
    </div>
  );
}

function CountryDropdown({ value, onChange, label, info, required, error }: {
  value: string; onChange: (v: string) => void; label?: string; info?: string;
  required?: boolean; error?: string;
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
  const sel = COUNTRIES.find((c) => c.id === value);
  const isFloating = open || !!sel;

  const Menu = open && (
    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-card p-1 shadow-lg">
      {COUNTRIES.map((c) => (
        <button
          key={c.id} type="button"
          onClick={() => { onChange(c.id); setOpen(false); }}
          className={`text-body-sm flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition ${
            value === c.id ? "bg-brand-100 text-brand-500" : "text-foreground hover:bg-muted"
          }`}
        >
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://flagcdn.com/w80/${c.code}.png`} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border" />
            {c.label}
          </span>
          {value === c.id && <Check className="h-4 w-4 text-brand-500" strokeWidth={2} />}
        </button>
      ))}
    </div>
  );

  // Legacy: no label.
  if (!label) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`text-body inline-flex w-full items-center justify-between gap-2 rounded-[8px] border bg-card px-4 py-3.5 text-left transition ${
            open ? "border-brand-500 ring-2 ring-brand-100" : "border-border hover:border-foreground/20"
          }`}
        >
          <span className="flex items-center gap-3">
            {sel ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w80/${sel.code}.png`} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border" />
                <span>{sel.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select a country</span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        </button>
        {Menu}
      </div>
    );
  }

  const cdBorderClass = error
    ? "border-destructive ring-2 ring-destructive/20"
    : open
      ? "border-brand-500 ring-2 ring-brand-100"
      : "border-border hover:border-foreground/30";
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className={`relative rounded-[8px] border bg-card transition ${cdBorderClass}`}>
        <label
          className={`pointer-events-none absolute left-4 z-10 transition-all ${
            isFloating
              ? "top-1.5 text-[11px] font-medium text-muted-foreground"
              : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
          }`}
        >
          {label}
          {required && <span className="ml-0.5 text-muted-foreground">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`relative block w-full rounded-[8px] bg-transparent px-4 pr-10 text-left text-base text-foreground ${
            isFloating ? "pb-2 pt-6" : "py-4"
          }`}
        >
          {sel ? (
            <span className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://flagcdn.com/w80/${sel.code}.png`} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border" />
              <span>{sel.label}</span>
            </span>
          ) : (
            <span className="invisible">x</span>
          )}
        </button>
        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
        {Menu}
      </div>
      {error
        ? <p data-field-error="true" className="px-1 text-xs font-medium text-destructive">{error}</p>
        : open && info && (
            <p className="px-1 text-xs text-muted-foreground">{info}</p>
          )
      }
    </div>
  );
}

function FileUploadField({ fileName, onFile, hint, error }: {
  fileName: string; onFile: (name: string) => void; hint?: string; error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Filled state — show file card with remove button
  if (fileName) {
    return (
      <div className="flex flex-col gap-1.5">
        {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
        <div className="flex items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-3.5">
          <File className="h-6 w-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-body-sm-bold text-foreground">{fileName}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-body-sm text-left text-muted-foreground transition hover:text-foreground"
            >
              Replace file
            </button>
          </div>
          <button
            type="button"
            onClick={() => onFile("")}
            aria-label="Remove file"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file.name);
          }}
        />
      </div>
    );
  }

  // Empty state — drop zone matching reference design
  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file.name);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed px-6 py-9 text-center transition ${
          dragOver
            ? "border-brand-500 bg-brand-50"
            : error
              ? "border-destructive bg-destructive/5 hover:border-destructive"
              : "border-border bg-card hover:border-brand-500/60 hover:bg-brand-50/30"
        }`}
        style={{ borderWidth: "1.5px" }}
      >
        <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-body-sm text-muted-foreground">
          Drag &amp; drop your file here, or{" "}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="font-medium text-brand-500 transition hover:text-brand-600 hover:underline"
          >
            click to browse
          </button>
        </p>
        <p className="text-body-sm text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
      </div>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file.name);
        }}
      />
    </div>
  );
}

function RadioGroup({ options, value, onChange }: {
  options: { id: string; label: string; desc?: string; warn?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex items-start gap-3 rounded-[8px] border px-4 py-3.5 text-left transition ${
            value === opt.id
              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
              : "border-border bg-card hover:border-foreground/20"
          }`}
        >
          <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
            value === opt.id ? "border-brand-500 bg-brand-500" : "border-border"
          }`}>
            {value === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className={`text-body-sm font-medium ${value === opt.id ? "text-brand-600" : "text-foreground"}`}>
              {opt.label}
            </span>
            {opt.desc && <span className="text-body-sm text-muted-foreground">{opt.desc}</span>}
          </div>
          {opt.warn && value === opt.id && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
          )}
        </button>
      ))}
    </div>
  );
}

function InlineCheckbox({ checked, onToggle, label }: {
  checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 px-1 py-1 text-left transition"
    >
      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] transition ${
        checked ? "border border-brand-500 bg-brand-500" : "border-2 border-border"
      }`}>
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-body-sm text-foreground">{label}</span>
    </button>
  );
}

function MultiCheckGroup({ items, checked, onChange }: {
  items: { id: string; label: string }[];
  checked: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id]);
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const on = checked.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className="flex items-start gap-3 px-1 py-1 text-left transition"
          >
            <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] transition ${
              on ? "border border-brand-500 bg-brand-500" : "border-2 border-border"
            }`}>
              {on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-body-sm text-foreground">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount — restore draft + step.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Draft>;
        // Drop fully-empty director/UBO entries left over from older drafts
        // so the section starts collapsed (fields only show after "Add").
        if (Array.isArray(parsed.directors)) {
          parsed.directors = parsed.directors.filter((d) => d && (d.name?.trim() || d.idFileName));
        }
        if (Array.isArray(parsed.ubos)) {
          parsed.ubos = parsed.ubos.filter((u) => u && (u.name?.trim() || u.percent?.trim() || u.relationship?.trim()));
        }
        setDraft((d) => ({ ...d, ...parsed }));
      }
      const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
      if (savedStep) {
        const n = parseInt(savedStep, 10);
        if (n >= 1 && n <= 8) setStep(n as Step);
      }
    } catch { /* ignore parse errors */ }
    hydratedRef.current = true;
  }, []);

  // Debounced auto-save to localStorage. Skips the first render after
  // hydration so we don't overwrite restored data with the default state.
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
    // Clear the error on this field as the user edits it.
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  // Validate a single field (called on blur) — surfaces only format-level
  // errors. Empty fields are treated as "not yet filled" (no error shown);
  // the disabled Save & continue button signals incompleteness instead.
  // Required-but-empty errors only surface when the user explicitly submits.
  function validateOnBlur(key: keyof Draft) {
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
      // Bring the first error into view so the feedback isn't missed on long steps.
      requestAnimationFrame(() => {
        const el = document.querySelector("[data-field-error='true']");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setErrors({});
    if (step < 8) setStep((s) => (s + 1) as Step);
    else router.push("/onboarding/employee");
  }

  // Triggered by the "Send for signature" button on the MSA card. Confirms via
  // toast, clears the org-form draft (we're done with it), then routes into
  // the employee onboarding flow.
  function handleMsaSign() {
    set("msaReviewed", true);
    setToast("Agreement sent for signature. Let's get your first employee onboarded.");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP_KEY);
    } catch { /* ignore */ }
    setTimeout(() => {
      router.push("/onboarding/employee");
    }, 1400);
  }

  // Derived: is every required field on the current step filled & valid?
  // Used to enable the primary action button only when the step is complete.
  const stepIsValid = Object.keys(validateStep(step, draft)).length === 0;

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  const info = stageOf(step);

  // Progress: stage-based (matches Figma — smooth fill across stages)
  const progressPct = ((info.index + info.stepInStage / info.totalInStage) / STAGES.length) * 100;

  // Per-step page heading + subtitle (each onboarding step has its own title block).
  const stagePageTitle = STEP_TITLE[step];
  const stagePageSubtitle =
    step === 1
      ? <>These details help us create your <strong className="font-bold">partnership terms</strong> agreement and complete the account setup.</>
      : STEP_DESC[step];

  return (
    <main className="min-h-screen bg-[var(--wm-bg-2)]">

      {/* ── Sticky header (1440 max, 40px side padding, 20px vertical) ── */}
      <header className="sticky top-0 z-30 bg-card">
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-10">
          <Image
            src="/wisemonk/wisemonk-logo.png"
            alt="Wisemonk"
            width={307}
            height={65}
            priority
            className="block h-[34px] w-auto object-contain"
          />
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
              onClick={() => setExitOpen(true)}
              aria-label="Close and exit"
              className="flex h-10 w-10 items-center justify-center rounded-[8px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Form area (centered, 832px wide cards, 48px top, 128px bottom) ── */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleContinue(); }}
        className="mx-auto flex max-w-[1130px] flex-col items-center gap-6 px-6 pt-12 pb-40"
      >
        {/* Left-aligned title block */}
        <div className="flex w-[832px] max-w-full flex-col items-start gap-2 text-left">
          <h1 className="text-[32px] font-bold leading-none text-foreground">
            {stagePageTitle}
          </h1>
          {stagePageSubtitle && (
            <p className="text-base text-muted-foreground">{stagePageSubtitle}</p>
          )}
        </div>

        {/* Card stack — StepContent renders one or more SectionCards */}
        <div className="flex w-[832px] max-w-full flex-col gap-4">
          <StepContent step={step} draft={draft} set={set} errors={errors} blur={validateOnBlur} onMsaSign={handleMsaSign} />
        </div>
      </form>

      {/* ── Fixed footer (full width, 6px progress + 80px button bar, 40px side padding) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card">
        {/* Progress bar — 6px tall, light blue track, brand fill */}
        <div className="h-1.5 w-full bg-brand-100">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Button bar — 80px tall total, buttons at 40px side padding */}
        <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-10">
          <button
            type="button"
            onClick={handleBack}
            className="text-base font-bold inline-flex h-12 items-center gap-2 rounded-[8px] px-5 text-foreground transition hover:text-gray-600 active:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {/* Step 8 (MSA) has no footer action — the "Send for signature"
              button on the card itself drives the flow. Steps 1-7 keep the
              standard Next hint + continue button. */}
          {step < 8 && (
            <div className="flex items-center gap-4">
              <p className="text-body-sm text-muted-foreground">
                Next: <span className="text-foreground">{STEP_TITLE[(step + 1) as Step]}</span>
              </p>
              <button
                type="button"
                onClick={handleContinue}
                aria-disabled={!stepIsValid}
                className="text-base font-bold inline-flex h-12 items-center rounded-[8px] bg-primary px-7 text-primary-foreground transition hover:bg-brand-600 aria-disabled:bg-gray-300 aria-disabled:text-gray-600 aria-disabled:hover:bg-gray-300"
              >
                {step === 7 ? "Continue" : "Save & continue"}
              </button>
            </div>
          )}
        </div>
      </div>

      <HelpPanel step={step} open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Exit confirmation — progress is auto-saved, but a misclick on the X
          shouldn't drop the user out of the flow without warning. */}
      {exitOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exit onboarding"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            onClick={(e) => e.target === e.currentTarget && setExitOpen(false)}
            className="absolute inset-0"
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-[420px] flex-col gap-5 rounded-[12px] bg-card p-6 shadow-2xl">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-foreground">Leave onboarding?</h2>
              <p className="text-body-sm text-muted-foreground">
                Your progress is saved automatically, so you can pick up right where you
                left off. Are you sure you want to exit?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] border border-border bg-card px-5 text-foreground transition hover:border-foreground/30"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-body-sm-bold inline-flex h-11 items-center rounded-[8px] bg-primary px-5 text-primary-foreground transition hover:bg-brand-600"
              >
                Exit onboarding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast — appears centred-top, auto-dismissed by the redirect that
          fires shortly after "Send for signature". */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-6 z-50 flex max-w-[480px] -translate-x-1/2 items-start gap-3 rounded-[8px] border border-brand-500/20 bg-card px-4 py-3 shadow-lg"
        >
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
          <p className="text-body-sm font-medium text-foreground">{toast}</p>
        </div>
      )}
    </main>
  );
}

// ── Step titles + descriptions ────────────────────────────────────────────

const STEP_TITLE: Record<Step, string> = {
  1:  "Tell us about your organization",
  2:  "Let's set up your business",
  3:  "Billing, tax & ownership",
  4:  "Compliance declaration",
  5:  "Your presence in India",
  6:  "Data & regulation",
  7:  "Submitted for review",
  8:  "Our partnership terms",
};

// ── Contextual help content for the right-side help panel ────────────────

type HelpItem = { question: string; answer: string };
const STEP_HELP: Record<Step, { title: string; intro: string; items: HelpItem[] }> = {
  1: {
    title: "About your organization",
    intro: "We use these details to draft your service agreement and run basic KYC checks. The legal name, country, and entity type are the most important — they determine your tax routing and contract structure.",
    items: [
      { question: "Why do you ask for my full name and job title?", answer: "We address communications to you and confirm you're authorised to sign agreements on behalf of your company. The title isn't legally binding on its own — it just helps us route signing requests appropriately." },
      { question: "Why does the legal company name matter?", answer: "It appears on the service agreement and tax invoices. Use the exact spelling as it appears on your government registration certificate. Mismatched names can cause invoice rejections and KYC failures later." },
      { question: "What if my company doesn't have a website yet?", answer: "Tick the 'We don't have company website' checkbox. We'll skip this field. New companies, stealth-mode startups, and entities without a public presence are common and not a problem." },
      { question: "What's the company description for?", answer: "It helps us check that your business isn't in a restricted industry, and informs the wording of your service agreement. One sentence is enough — no marketing language needed." },
    ],
  },
  2: {
    title: "Business address",
    intro: "Your registered business address is required for KYC verification and to correctly route tax invoices. Use the address that appears on your incorporation documents.",
    items: [
      { question: "Why do I need to upload proof of address?", answer: "It's a standard KYC requirement. Acceptable documents include a utility bill, bank statement, or property tax receipt — anything that shows your company name and the registered address dated within the last 3 months." },
      { question: "What if my mailing address is different?", answer: "Use the registered legal address here. You can specify a different mailing address as part of the billing contact in the next step." },
      { question: "What file formats are supported?", answer: "PDF, JPG, or PNG, up to 10 MB. Drag-and-drop or click to browse. Make sure the file is readable — blurry scans may delay verification." },
    ],
  },
  3: {
    title: "Billing, tax & ownership",
    intro: "We collect billing, tax, and ownership details together because they're all part of the same KYC + invoicing flow. Inaccurate information here delays your first invoice, so take your time.",
    items: [
      { question: "Why is the billing currency required?", answer: "All invoices and statements will be denominated in the currency you pick. You can request changes later, but it can affect tax rates and FX margins, so pick the currency you actually want to be invoiced in." },
      { question: "What's a tax registration number?", answer: "The unique identifier issued by your country's tax authority — GSTIN in India, VAT in the EU/UK, EIN in the US, ABN in Australia, etc. We use it to issue compliant invoices and report taxes correctly." },
      { question: "Who counts as a director or UBO?", answer: "A director is anyone listed on your incorporation certificate. A UBO (Ultimate Beneficial Owner) is any individual holding 25% or more of the company directly or indirectly. Most companies have at least one of each — and they're often the same person." },
      { question: "Why do you ask about 25% ownership?", answer: "Anti-money-laundering rules require us to identify any individual who effectively controls or benefits from the company. If anyone holds 25%+, we'll need their details for KYC. Ticking the box helps us route you correctly." },
      { question: "Will I have to upload an ID for every owner?", answer: "Only the primary director's government ID is required at this step. If we need additional documents for other UBOs, we'll request them during verification." },
    ],
  },
  4: {
    title: "Compliance declaration",
    intro: "These declarations confirm your company meets standard anti-money-laundering and sanctions-screening requirements. They're required by financial regulators globally — every onboarded business has to confirm them.",
    items: [
      { question: "Why do I have to confirm all four boxes?", answer: "Each box covers a separate regulatory requirement: legitimate funds source (AML), no sanctions exposure (OFAC/UN/EU/HMT), AML/CFT compliance, and no PEP involvement. We can't proceed without all four — no exceptions." },
      { question: "What's a Politically Exposed Person (PEP)?", answer: "A current or former public official, judicial officer, senior military officer, executive of a state-owned enterprise, or a close family member or associate of any of the above. If you're unsure, err on the side of caution and uncheck the PEP box — we'll follow up." },
      { question: "What are 'prohibited industries'?", answer: "Click 'View activities' under the prohibited industries section to see the full list. Common items include arms/weapons, gambling, adult content, unregulated financial services, and crypto/virtual asset service providers without licensing." },
      { question: "What if my company is in a high-risk but legal industry?", answer: "If you're regulated (e.g. licensed crypto exchange, fintech), select that on the next steps and we'll request the relevant licenses. We work with most regulated industries — just not unlicensed/grey-market activities." },
    ],
  },
  5: {
    title: "Your presence in India",
    intro: "If you already have an India entity, your local taxes flow through it and the contractor work won't create new tax exposure. If you don't, this section helps us flag any Permanent Establishment (PE) risk before it becomes a problem.",
    items: [
      { question: "What counts as an 'India entity'?", answer: "A registered private limited company, branch office, liaison office, project office, or LLP in India. A representative or local agent on a contract does not count — it must be a registered entity in your name." },
      { question: "What is Permanent Establishment (PE) risk?", answer: "PE is a tax concept where foreign income becomes taxable in India because of activities conducted there. Triggers include having a fixed office, employees physically working in India for extended periods, or someone who can sign contracts on your behalf." },
      { question: "I'm not sure — should I tick yes or no?", answer: "Tick yes only if you have a formally registered entity that you'd list on your tax return. Hiring an Indian contractor through Wisemonk does NOT count as your own India presence — that's exactly what we're set up to handle for you." },
    ],
  },
  6: {
    title: "Data & regulation",
    intro: "We use this to add the right protective language to your contract — data handling clauses for sensitive information, plus regulator-specific clauses if your business is overseen by one.",
    items: [
      { question: "What counts as 'sensitive information'?", answer: "PII (names, IDs, addresses), health/medical data, financial/payment data, biometric data, and data involving minors. If your contractors will see any of these, tick the relevant boxes and we'll add appropriate confidentiality + data protection clauses." },
      { question: "Why do I need to disclose regulators?", answer: "Regulated industries (banking, healthcare, securities, etc.) need specific contract clauses around audit rights, data retention, breach notification, and supervisory cooperation. Picking your regulator triggers those clauses automatically." },
      { question: "What if multiple regulators apply?", answer: "Tick all that apply. The clauses are additive — having both GDPR and HIPAA in your contract is fine and doesn't create conflicts." },
      { question: "What if no regulator applies to us?", answer: "Tick 'Not regulated / no specific regulator'. Your contract will use the standard data-protection language without industry-specific overlays." },
    ],
  },
  7: {
    title: "Submitted for review",
    intro: "Your onboarding details have been submitted. Our verification team reviews them — typically within 8 business hours — before the agreement step opens.",
    items: [
      { question: "What happens during review?", answer: "We verify your company, ownership and compliance details. You'll get an email the moment your Master Service Agreement is ready to sign." },
      { question: "How long does it take?", answer: "Most submissions are reviewed within 8 business hours. You don't need to do anything until you hear from us." },
    ],
  },
  8: {
    title: "Our partnership terms",
    intro: "This is the Master Service Agreement (MSA) — it confirms how Wisemonk partners with your company. Once you send it for signature, our e-sign partner Zoho handles the rest. You can review the PDF before signing.",
    items: [
      { question: "What does the MSA cover?", answer: "Payment terms, compliance responsibilities, confidentiality, data protection, indemnities, and governing law. It's a master agreement — individual contractor SOWs sit beneath it." },
      { question: "Can I review it before signing?", answer: "Yes — click 'Review and sign' to open the agreement directly in the portal. You can scroll through every clause and only sign when you're ready. The agreement also includes a Download PDF option for offline review." },
      { question: "What if someone else needs to sign?", answer: "Click 'Invite someone else to sign' and you can specify the legal signatory's name and email. Zoho will route the signature request to them directly." },
      { question: "How long does signing take?", answer: "The signature flow is fully digital — most users sign within 5 minutes of receiving the email. Once signed, your account moves to active status and you can start onboarding contractors." },
    ],
  },
};

const STEP_DESC: Record<Step, string> = {
  1:  "These details help us create your partnership terms agreement and complete the account setup.",
  2:  "Add your company's registered business address.",
  3:  "Verify ownership, add your tax ID, and tell us how to bill you.",
  4:  "Provide your company's compliance details to complete setup.",
  5:  "",
  6:  "We use this to set the right background checks and contract clauses.",
  7:  "We're reviewing your details before the agreement step.",
  8:  "This agreement confirms how Wisemonk partners with your company.",
};

// ── Per-step field content ────────────────────────────────────────────────

function StepContent({
  step,
  draft,
  set,
  errors,
  blur,
  onMsaSign,
}: {
  step: Step;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, val: Draft[K]) => void;
  errors: FieldErrors;
  blur: (key: keyof Draft) => void;
  onMsaSign: () => void;
}) {
  switch (step) {

    // ── Stage 1 — KYC & MSA ──────────────────────────────────────────

    case 1:
      // Step 1: Tell us about your organization (3 cards)
      return (
        <>
          <SectionCard title="Basic Information">
            <TextInput
              label="Your full name"
              required
              error={errors.signatoryName}
              info="Your full name as you'd like us to address you."
              value={draft.signatoryName}
              onChange={(v) => set("signatoryName", v)}
              onBlur={() => blur("signatoryName")}
              placeholder="e.g. Jane Smith"
            />
            <AutocompleteInput
              label="Your job title"
              required
              error={errors.designation}
              info="Start typing — pick a suggestion or enter your own title."
              value={draft.designation}
              onChange={(v) => set("designation", v)}
              onBlur={() => blur("designation")}
              options={DESIGNATIONS}
              placeholder="e.g. CEO"
            />
          </SectionCard>

          <SectionCard title="Company Information">
            <TextInput
              label="Company name"
              required
              error={errors.legalCompanyName}
              info="Use the exact name on your government registration certificate. This goes on the agreement."
              value={draft.legalCompanyName}
              onChange={(v) => set("legalCompanyName", v)}
              onBlur={() => blur("legalCompanyName")}
              placeholder="e.g. Acme Technologies Pte. Ltd."
            />
            <SimpleDropdown
              label="Entity type"
              required
              error={errors.entityType}
              info="Different company types use different invoicing and tax routes. Pick the one on your registration."
              value={draft.entityType}
              onChange={(v) => set("entityType", v)}
              options={ENTITY_TYPES}
            />
            <SimpleDropdown
              label="Industry"
              required
              error={errors.industry}
              info="Some industries (finance, healthcare, defence) need extra paperwork — we'll handle it for you automatically."
              value={draft.industry}
              onChange={(v) => set("industry", v)}
              options={INDUSTRIES}
            />
            {!draft.noCompanyWebsite && (
              <TextInput
                label="Company website"
                required
                error={errors.companyWebsite}
                info="Public-facing URL we can verify your business with."
                value={draft.companyWebsite}
                onChange={(v) => set("companyWebsite", v)}
                onBlur={() => blur("companyWebsite")}
                placeholder="e.g. https://acme.com"
              />
            )}
            <InlineCheckbox
              checked={draft.noCompanyWebsite}
              onToggle={() => {
                const next = !draft.noCompanyWebsite;
                set("noCompanyWebsite", next);
                // Clear the website value + error when toggling on so we don't carry stale data.
                if (next) set("companyWebsite", "");
              }}
              label="We don't have company website."
            />
            <TextInput
              label="Company description"
              required
              error={errors.companyDescription}
              info="We use this to draft your service agreement and check that your business isn't in a restricted industry."
              value={draft.companyDescription}
              onChange={(v) => set("companyDescription", v)}
              onBlur={() => blur("companyDescription")}
              placeholder="e.g. We build cloud-native security software for mid-market enterprises."
            />
            <SimpleDropdown
              label="Team size"
              required
              error={errors.teamSize}
              info="Approximate number of people working at your company globally."
              value={draft.teamSize}
              onChange={(v) => set("teamSize", v)}
              options={TEAM_SIZE_OPTS}
            />
            <CountryDropdown
              label="Country of incorporation"
              required
              error={errors.countryOfIncorporation}
              info="We use this to apply the right tax rules. Indian and foreign clients follow different paths."
              value={draft.countryOfIncorporation}
              onChange={(v) => set("countryOfIncorporation", v)}
            />
          </SectionCard>
        </>
      );

    case 2:
      // Step 2: Let's set up your business (3 cards + note callout)
      return (
        <>
          <SectionCard title="Business Address">
            <TextInput
              label="Legal company name"
              required
              error={errors.legalCompanyName}
              info="Use the exact name on your government registration certificate."
              value={draft.legalCompanyName}
              onChange={(v) => set("legalCompanyName", v)}
              onBlur={() => blur("legalCompanyName")}
            />
            <TextInput
              label="Street address"
              required
              error={errors.addressStreet}
              info="Enter the street, building, and suite number of your registered business address."
              value={draft.addressStreet}
              onChange={(v) => set("addressStreet", v)}
              onBlur={() => blur("addressStreet")}
              placeholder="123 Business Street, Suit 100"
            />
            <TextInput
              label="City"
              required
              error={errors.addressCity}
              info="Enter your company's city or office location."
              value={draft.addressCity}
              onChange={(v) => set("addressCity", v)}
              onBlur={() => blur("addressCity")}
            />
            {STATES_BY_COUNTRY[draft.countryOfIncorporation] ? (
              <SimpleDropdown
                label="State/Province"
                required
                error={errors.addressState}
                info="State, province, or region of your registered address."
                value={draft.addressState}
                onChange={(v) => set("addressState", v)}
                options={STATES_BY_COUNTRY[draft.countryOfIncorporation]}
              />
            ) : (
              <TextInput
                label="State/Province"
                required
                error={errors.addressState}
                info="State, province, or region of your registered address."
                value={draft.addressState}
                onChange={(v) => set("addressState", v)}
                onBlur={() => blur("addressState")}
              />
            )}
            <TextInput
              label="Postal / ZIP code"
              required
              error={errors.addressZip}
              info="ZIP, PIN, or postal code of your registered address."
              value={draft.addressZip}
              onChange={(v) => set("addressZip", v)}
              onBlur={() => blur("addressZip")}
            />
            <Field
              label="Upload proof of registered business address"
              info="Acceptable documents: utility bill, bank statement, lease agreement, property tax receipt, or certificate of incorporation — any official document showing your company name and registered address dated within the last 3 months."
            >
              <FileUploadField
                fileName={draft.proofFileName}
                onFile={(name) => set("proofFileName", name)}
              />
            </Field>
          </SectionCard>
        </>
      );

    case 3:
      // Step 3: Billing, tax & ownership — 4 cards
      return (
        <>
          <InfoBanner prefix="Note">
            This information is used for invoicing, billing communications, payment processing, and KYC verification. Please ensure all details are accurate.
          </InfoBanner>

          <SectionCard title="Billing Information">
            <SimpleDropdown
              label="Billing currency"
              required
              error={errors.billingCurrency}
              info="Currency we'll use for invoices and statements."
              value={draft.billingCurrency}
              onChange={(v) => set("billingCurrency", v)}
              options={["USD","EUR","GBP","SGD","INR","AUD","CAD"]}
            />
            <InlineCheckbox
              checked={draft.sameAsRegisteredAddressForBilling}
              onToggle={() => {
                const next = !draft.sameAsRegisteredAddressForBilling;
                set("sameAsRegisteredAddressForBilling", next);
                if (next) {
                  set("billingContactName", "");
                  set("billingContactEmail", "");
                }
              }}
              label="Use the same address for billing purposes"
            />

            {!draft.sameAsRegisteredAddressForBilling && (
              <>
                <TextInput
                  label="Billing contact full name"
                  required
                  error={errors.billingContactName}
                  info="The person on your team responsible for invoices and billing communications."
                  value={draft.billingContactName}
                  onChange={(v) => set("billingContactName", v)}
                  onBlur={() => blur("billingContactName")}
                />
                <TextInput
                  label="Billing contact email address"
                  required
                  error={errors.billingContactEmail}
                  info="We'll send invoices, payment reminders, and billing updates to this email."
                  value={draft.billingContactEmail}
                  onChange={(v) => set("billingContactEmail", v)}
                  onBlur={() => blur("billingContactEmail")}
                />
              </>
            )}
          </SectionCard>

          <SectionCard title="Tax & Compliance Information">
            <TextInput
              label="Tax registration no."
              required
              error={errors.taxRegNumber}
              info="GSTIN, VAT, EIN, or equivalent tax registration number for your jurisdiction."
              value={draft.taxRegNumber}
              onChange={(v) => set("taxRegNumber", v)}
              onBlur={() => blur("taxRegNumber")}
            />
            <Field label="Upload tax certificate (PDF, JPG, or PNG)" required error={errors.taxCertFileName}>
              <FileUploadField
                fileName={draft.taxCertFileName}
                onFile={(name) => set("taxCertFileName", name)}
                error={errors.taxCertFileName}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Ownership & Management">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2} />
              <p className="text-body-sm text-muted-foreground">
                These details are encrypted and stored securely as part of your client onboarding.
              </p>
            </div>
            {/* Directors — one or more */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[15px] font-bold text-foreground">Directors</p>
                <p className="text-body-sm text-muted-foreground">Add every active director listed on your incorporation certificate.</p>
              </div>
              {draft.directors.map((d, i) => (
                <div key={i} className={`flex flex-col gap-4 ${i > 0 ? "border-t border-border pt-5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm-bold text-foreground">Director {i + 1}</span>
                    {draft.directors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => set("directors", draft.directors.filter((_, idx) => idx !== i))}
                        className="inline-flex items-center gap-1 text-body-sm font-medium text-muted-foreground transition hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <TextInput
                    label="Name of director"
                    required
                    info="Full legal name as it appears on the incorporation certificate."
                    value={d.name}
                    onChange={(v) => set("directors", draft.directors.map((x, idx) => idx === i ? { ...x, name: v } : x))}
                    placeholder="e.g. John Doe"
                  />
                  <Field label="Upload government ID" required info="Passport, national ID card, or Aadhaar.">
                    <FileUploadField
                      fileName={d.idFileName}
                      onFile={(name) => set("directors", draft.directors.map((x, idx) => idx === i ? { ...x, idFileName: name } : x))}
                    />
                  </Field>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("directors", [...draft.directors, { name: "", idFileName: "" }])}
                className="inline-flex items-center gap-1.5 self-start rounded-[8px] border border-dashed border-border px-4 py-2 text-body-sm font-bold text-brand-500 transition hover:border-brand-500 hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" /> {draft.directors.length ? "Add another director" : "Add director"}
              </button>
              {errors.directors && <p className="px-1 text-xs font-medium text-destructive">{errors.directors}</p>}
            </div>

            {/* Beneficial owners (UBOs) — one or more; may be the same person as a director */}
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <div>
                <p className="text-[15px] font-bold text-foreground">Beneficial owners (UBOs)</p>
                <p className="text-body-sm text-muted-foreground">
                  Add anyone who directly or indirectly holds ownership in your company. A UBO can be the same person as a director.
                </p>
              </div>
              {draft.ubos.map((u, i) => {
                const directorNames = draft.directors.map((d) => d.name.trim()).filter(Boolean);
                return (
                  <div key={i} className={`flex flex-col gap-4 ${i > 0 ? "border-t border-border pt-5" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm-bold text-foreground">Beneficial owner {i + 1}</span>
                      {draft.ubos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set("ubos", draft.ubos.filter((_, idx) => idx !== i))}
                          className="inline-flex items-center gap-1 text-body-sm font-medium text-muted-foreground transition hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                    <UboNameField
                      value={u.name}
                      onChange={(v) => set("ubos", draft.ubos.map((x, idx) => idx === i ? { ...x, name: v } : x))}
                      suggestions={directorNames}
                    />
                    <TextInput
                      label="Ownership held (%)"
                      required
                      type="number"
                      info="Percentage owned directly or indirectly (25–100)."
                      value={u.percent}
                      onChange={(v) => set("ubos", draft.ubos.map((x, idx) => idx === i ? { ...x, percent: v } : x))}
                      placeholder="e.g. 40"
                    />
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => set("ubos", [...draft.ubos, { name: "", percent: "", relationship: "" }])}
                className="inline-flex items-center gap-1.5 self-start rounded-[8px] border border-dashed border-border px-4 py-2 text-body-sm font-bold text-brand-500 transition hover:border-brand-500 hover:bg-brand-50"
              >
                <Plus className="h-4 w-4" /> Add beneficial owner
              </button>
              {errors.ubos && <p className="px-1 text-xs font-medium text-destructive">{errors.ubos}</p>}
            </div>
          </SectionCard>
        </>
      );

    case 4:
      // Step 4: Compliance declaration — 2 cards (sanctions + prohibited industries)
      return (
        <>
          <SectionCard title="Sanctions, AML &amp; PEP declarations">
            <p className="text-body-sm text-muted-foreground">
              Please confirm the following to verify your company&apos;s compliance status:
            </p>
            <MultiCheckGroup
              items={SANCTIONS_ITEMS}
              checked={draft.sanctionsChecked}
              onChange={(ids) => set("sanctionsChecked", ids)}
            />
            {errors.sanctionsChecked && (
              <p className="text-xs font-medium text-destructive">{errors.sanctionsChecked}</p>
            )}
          </SectionCard>

          <SectionCard title="Prohibited / High-Risk Industries">
            <ProhibitedIndustriesBlock
              checked={draft.prohibitedIndustriesAck}
              onToggle={() => set("prohibitedIndustriesAck", !draft.prohibitedIndustriesAck)}
            />
            {errors.prohibitedIndustriesAck && (
              <p className="text-xs font-medium text-destructive">{errors.prohibitedIndustriesAck}</p>
            )}
          </SectionCard>
        </>
      );

    // ── Stage 2 — Business Profile ───────────────────────────────────

    case 5:
      return (
        <SectionCard title="India entity">
          <Field
            label="Does your company have an office or registered entity in India?"
            required
            error={errors.hasIndiaEntity}
            info="If you already have an India entity, your local taxes go through that entity."
          >
            <RadioGroup
              value={draft.hasIndiaEntity}
              onChange={(v) => {
                set("hasIndiaEntity", v);
                if (v !== "yes") {
                  set("indiaEntityType", "");
                  set("indiaEntityName", "");
                  set("indiaEntityTaxId", "");
                }
              }}
              options={[
                { id:"yes", label:"Yes — we have a legal entity, branch, or liaison office in India." },
                { id:"no",  label:"No — we have no legal presence in India." },
              ]}
            />
          </Field>

          {draft.hasIndiaEntity === "yes" && (
            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand-50 text-brand-500">
                  <Building2 className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-body-sm-bold text-foreground">Your India entity</p>
                  <p className="text-body-sm text-muted-foreground">A few details about your registered presence in India.</p>
                </div>
              </div>
              <div className="flex flex-col gap-5 p-5">
              <AutocompleteInput
                label="Type of India entity"
                required
                error={errors.indiaEntityType}
                info="The legal form of your registered presence in India."
                value={draft.indiaEntityType}
                onChange={(v) => set("indiaEntityType", v)}
                onBlur={() => blur("indiaEntityType")}
                options={INDIA_ENTITY_TYPES}
                placeholder="e.g. Private Limited Company"
              />
              <TextInput
                label="Registered entity name in India"
                required
                error={errors.indiaEntityName}
                info="The exact legal name as registered with the Indian Registrar of Companies."
                value={draft.indiaEntityName}
                onChange={(v) => set("indiaEntityName", v)}
                onBlur={() => blur("indiaEntityName")}
                placeholder="e.g. Acme Technologies India Pvt Ltd"
              />
              <TextInput
                label="India tax ID (PAN / CIN / GSTIN)"
                required
                error={errors.indiaEntityTaxId}
                info="Your entity's Indian tax registration — PAN, CIN, or GSTIN."
                value={draft.indiaEntityTaxId}
                onChange={(v) => set("indiaEntityTaxId", v)}
                onBlur={() => blur("indiaEntityTaxId")}
                placeholder="e.g. AABCA1234C"
              />
              </div>
            </div>
          )}
        </SectionCard>
      );

    case 6:
      return (
        <>
          <SectionCard title="Sensitive data handling">
            <Field
              label="Will the consultant work with any sensitive information?"
              required
              error={errors.sensitiveDataTypes}
              info="We adjust background checks and add data-protection clauses based on what they handle. Tick all that apply."
            >
              <MultiCheckGroup
                items={SENSITIVE_DATA_OPTS}
                checked={draft.sensitiveDataTypes}
                onChange={(ids) => set("sensitiveDataTypes", ids)}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Regulatory oversight">
            <Field
              label="Is your company watched over by any regulators?"
              required
              error={errors.regulatoryBodies}
              info="Regulated industries need specific clauses (data agreements, audit rights, etc.) added to the contract."
            >
              <MultiCheckGroup
                items={REGULATORY_OPTS}
                checked={draft.regulatoryBodies}
                onChange={(ids) => set("regulatoryBodies", ids)}
              />
            </Field>
          </SectionCard>
        </>
      );

    // ── Stage 3 — Review & sign ──────────────────────────────────────

    case 7:
      // Interstitial: details submitted, awaiting verification before MSA.
      return (
        <div className="rounded-[16px] border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">Thanks — your details are submitted</h2>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
            Our team will review your submission and verify the details. Once approved, we&apos;ll
            email you to review and sign your Master Service Agreement.
          </p>
          <div className="mx-auto mt-6 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-4 py-2 text-body-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-brand-500" strokeWidth={2} />
            Typically reviewed within 8 business hours
          </div>
        </div>
      );

    case 8: {
      // Dedicated MSA screen — "Our partnership terms".
      // "Review and sign" opens the in-portal signing modal. After signing
      // it triggers the same handler that shows a toast and routes into
      // the employee flow.
      const country = COUNTRIES.find((c) => c.id === draft.countryOfIncorporation)?.label ?? "";
      // Build "Legal Co, street city state postal country" — matches the
      // Customer row format in the actual MSA PDF.
      const customerParts = [
        draft.legalCompanyName,
        [draft.addressStreet, draft.addressCity, draft.addressState, draft.addressZip].filter(Boolean).join(" "),
        country,
      ].filter(Boolean);
      const customerSummary = customerParts.join(", ");
      return (
        <PartnershipTermsCard
          msaReviewed={draft.msaReviewed}
          signatoryName={draft.signatoryName}
          customerSummary={customerSummary}
          onSign={onMsaSign}
        />
      );
    }

  }
}
