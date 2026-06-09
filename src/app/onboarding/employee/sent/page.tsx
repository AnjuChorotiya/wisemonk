"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export default function InviteSentPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--wm-bg-2)]">
      {/* Sticky header — matches the rest of the onboarding flow */}
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
        </div>
      </header>

      {/* Centered confirmation card */}
      <div className="mx-auto flex max-w-[632px] flex-col items-center px-6 pt-24 pb-40 text-center">
        {/* Success icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <Check className="h-8 w-8 text-brand-500" strokeWidth={2.5} />
        </div>

        <h1 className="text-[32px] font-bold leading-tight text-foreground">
          Invite sent successfully
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          We&apos;ve emailed the offer letter and onboarding instructions to your new
          hire. They&apos;ll receive next steps within a few minutes.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/onboarding/employee")}
            className="text-base font-bold inline-flex h-12 items-center rounded-[8px] border border-border bg-card px-6 text-foreground transition hover:border-foreground/30"
          >
            Add another employee
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-base font-bold inline-flex h-12 items-center rounded-[8px] bg-primary px-7 text-primary-foreground transition hover:bg-brand-600"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
