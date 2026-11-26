import type { ReactNode } from "react";

/** Moldura bento das páginas sem AppShell (login, recuperar, redefinir): cartão do formulário + painel decorativo. */
export default function AuthQuadro({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo p-4 md:p-8">
      <div className="grid w-full max-w-4xl gap-4 rounded-painel border border-linha bg-campo p-3 md:grid-cols-[1fr_0.85fr] md:p-4">
        <section className="cartao-bento flex flex-col justify-center gap-6 rounded-barra p-6 sm:p-10">
          <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 fill-rosa/25">
            <path d="M80 8c30-6 66 14 72 46s-14 52-30 70-46 32-72 22S6 118 10 84 50 14 80 8Z" />
          </svg>
          <div className="relative z-10 flex flex-col gap-6">{children}</div>
        </section>
        <aside aria-hidden="true" className="relative hidden min-h-80 overflow-hidden rounded-barra bg-barra md:block">
          <svg viewBox="0 0 320 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <path className="fill-violeta/70" d="M320 0v210c-40 30-96 24-130-12s-30-96 4-130S270 14 320 0Z" />
            <path className="fill-rosa" d="M0 420V300c44-22 96-8 120 30s14 70-6 90Z" />
            <path className="fill-pessego/80" d="M150 420c-8-44 20-84 62-92s86 14 108 44v48Z" />
            <circle cx="70" cy="90" r="46" className="fill-laranja/80" />
            <circle cx="248" cy="290" r="20" className="fill-creme/90" />
          </svg>
        </aside>
      </div>
    </main>
  );
}
