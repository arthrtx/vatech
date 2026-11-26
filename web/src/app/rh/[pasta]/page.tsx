import Link from "next/link";
import AppShell from "@/components/AppShell";
import { pastasRh } from "@/lib/rh";

export function generateStaticParams() {
  return pastasRh.map((p) => ({ pasta: p.slug }));
}

export default async function PastaRhPage({ params }: { params: Promise<{ pasta: string }> }) {
  const { pasta } = await params;
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
