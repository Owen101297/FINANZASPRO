import { Wallet2 } from "lucide-react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
          <Wallet2 className="size-7 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">FinanzasPro</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Control total de tus finanzas personales
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-6 shadow-xl shadow-black/5">
        {children}
      </div>
    </>
  );
}
