"use client";

import AppShell from "@/components/AppShell";

// Pastas da secção de RH (ainda sem conteúdo). Cores: tokens existentes de globals.css.
// TODO: token em falta — a referência usa uma fonte monoespaçada para os títulos; aqui fica `font-mono` do sistema.
const pastas = [
  { nome: "Gestão salarial", cor: "bg-violeta/30" },
  { nome: "Gestão de estagiários", cor: "bg-primaria-suave" },
  { nome: "Contratos", cor: "bg-pessego/40" },
  { nome: "Avaliações de desempenho", cor: "bg-laranja/25" },
  { nome: "Formação", cor: "bg-rosa-suave" },
  { nome: "Documentos", cor: "bg-creme" },
] as const;

function Pasta({ nome, cor }: { nome: string; cor: string }) {
  return (
    <li className="relative mt-4">
      <div aria-hidden className={`absolute -top-3 left-5 h-6 w-28 rounded-t-2xl ${cor}`} />
      <div className={`relative flex min-h-36 flex-col justify-between gap-6 rounded-cartao p-5 ring-1 ring-white/70 dark:ring-white/10 ${cor}`}>
        <h3 className="font-mono text-base">{nome}</h3>
        <div className="flex items-center justify-between border-t border-linha-forte/30 pt-3 text-sm text-texto-suave">
          <span>RH</span>
          <span className="tabular-nums">0 itens</span>
        </div>
      </div>
    </li>
  );
}

export default function RhPage() {
  return (
    <AppShell soAdmin>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">RH</h1>
        <section aria-labelledby="rh-pastas" className="flex flex-col gap-2">
          <h2 id="rh-pastas" className="text-lg font-medium">
            Pastas <span className="ml-2 rounded-full bg-campo px-2 py-0.5 text-sm text-texto-suave">{pastas.length}</span>
          </h2>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {pastas.map((p) => (
              <Pasta key={p.nome} {...p} />
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
