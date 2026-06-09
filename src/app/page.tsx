import Link from "next/link";

export default function Home() {
  const cards = [
    {
      href: "/onboarding/organization",
      title: "Organization onboarding",
      desc: "KYC, business profile and MSA signing for the client entity.",
    },
    {
      href: "/onboarding/employee",
      title: "Employee onboarding",
      desc: "Identity, documents and bank details for the onboarded employee.",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Wisemonk EOR — Onboarding</h1>
        <p className="text-sm text-muted-foreground">Pick a flow to preview.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-md"
          >
            <h2 className="text-base font-medium">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
