"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { pastasRh } from "@/lib/rh";

export default function PastaRhPage() {
  const { pasta } = useParams<{ pasta: string }>();
  const atual = pastasRh.find((p) => p.slug === pasta);
  return (
    <AppShell soAdmin>
      <div className="flex flex-col gap-4">
        <Link href="/rh" className="self-start text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria">
          Voltar ao RH
        </Link>
        <h1 className="text-2xl font-semibold">{atual ? atual.nome : "Pasta não encontrada"}</h1>
      </div>
    </AppShell>
  );
}
