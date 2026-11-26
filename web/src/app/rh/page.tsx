"use client";

import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

// Pastas da secção de RH (ainda sem conteúdo). Cores: tokens existentes de globals.css.
// TODO: token em falta — a referência usa uma fonte monoespaçada para os títulos; aqui fica `font-mono` do sistema.
const pastas = [
  { nome: "Gestão salarial", de: "from-violeta/45", ate: "to-violeta/20", aba: "bg-violeta/45" },
  { nome: "Gestão de estagiários", de: "from-primaria-suave", ate: "to-primaria-suave/60", aba: "bg-primaria-suave" },
  { nome: "Contratos", de: "from-pessego/55", ate: "to-pessego/25", aba: "bg-pessego/55" },
  { nome: "Documentos", de: "from-creme", ate: "to-laranja/20", aba: "bg-creme" },
] as const;

function Pasta({ nome, de, ate, aba }: (typeof pastas)[number]) {
  const { user } = useAuth();
  return (
    <li className="relative mt-5">
      <div aria-hidden className={`absolute -top-5 left-0 h-8 w-[42%] rounded-t-[1.5rem] ${aba}`} />
      <div
        className={`relative flex min-h-40 flex-col justify-between gap-8 rounded-cartao rounded-tl-none bg-gradient-to-br p-5 shadow-suave ring-1 ring-white/70 dark:ring-white/10 ${de} ${ate}`}
      >
        <span aria-hidden className="absolute right-4 top-3 flex h-7 w-12 items-center justify-center rounded-full bg-painel/70 text-lg leading-none ring-1 ring-white/70">
          ⋮
        </span>
        <h3 className="pt-5 font-mono text-lg">{nome}</h3>
        <div className="flex items-center justify-between border-t border-linha-forte/30 pt-3 text-sm text-texto-suave">
          {user ? <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-7 w-7 text-xs" /> : <span />}
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
          <ul className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {pastas.map((p) => (
              <Pasta key={p.nome} {...p} />
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
