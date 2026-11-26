"use client";

import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { pastasRh as pastas, type PastaRh } from "@/lib/rh";

// TODO: token em falta — a referência usa uma fonte monoespaçada para os títulos; aqui fica `font-mono` do sistema.

function Pasta({ slug, nome, de, ate, aba }: PastaRh) {
  const { user } = useAuth();
  return (
    <li className="relative mt-5">
      <Link href={`/rh/${slug}`} className="group block rounded-cartao rounded-tl-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2">
      <div aria-hidden className={`absolute -top-5 left-0 h-8 w-[42%] rounded-t-[2rem] ${aba}`} />
      <div
        className={`relative flex min-h-40 flex-col justify-between gap-8 rounded-barra rounded-tl-none bg-gradient-to-br p-6 ring-1 ring-linha ${de} ${ate}`}
      >
        <span aria-hidden className="absolute right-4 top-3 flex h-7 w-12 items-center justify-center rounded-full bg-painel text-lg leading-none ring-1 ring-linha">
          ⋮
        </span>
        <h3 className="pt-5 font-mono text-lg">{nome}</h3>
        <div className="flex items-center justify-between border-t border-linha-forte/30 pt-3 text-sm text-texto-suave">
          {user ? <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-7 w-7 text-xs" /> : <span />}
          <span className="tabular-nums">0 itens</span>
        </div>
      </div>
      </Link>
    </li>
  );
}

export default function RhPage() {
  return (
    <AppShell soAdmin>
      <div className="flex flex-col gap-4">
        <h1 className="titulo-bento">RH</h1>
        <section aria-labelledby="rh-pastas" className="flex flex-col gap-2">
          <h2 id="rh-pastas" className="text-xl font-bold tracking-tight">
            Pastas <span className="ml-2 rounded-full bg-campo px-3 py-0.5 text-sm text-texto-suave">{pastas.length}</span>
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
