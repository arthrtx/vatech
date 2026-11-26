import Link from "next/link";
import type { ComponentType } from "react";
import Forma, { type TipoForma } from "./Forma";

type Cor = "rosa" | "violeta" | "positivo";

// Classes escritas por extenso para o Tailwind as encontrar. Texto sempre `text-texto` (o par de cada token nos dois temas);
// a forma é decorativa e fica no canto, longe do número.
const cores: Record<Cor, { fundo: string; forma: string; tipo: TipoForma }> = {
  violeta: { fundo: "bg-violeta", forma: "text-painel/45", tipo: "flor" },
  rosa: { fundo: "bg-rosa-suave", forma: "text-rosa/35", tipo: "coracao" },
  positivo: { fundo: "bg-positivo/20", forma: "text-positivo/30 dark:text-positivo/15", tipo: "estrela" },
};

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
  /** Ícone decorativo no círculo, ao lado do rótulo. */
  Icone?: ComponentType<{ className?: string }>;
  /** Cor de superfície do cartão (token existente). */
  cor?: Cor;
}

export default function CartaoContador({ rotulo, valor, aCarregar, ligacao, Icone, cor = "violeta" }: Props) {
  const c = cores[cor];
  return (
    <li
      className={`relative isolate flex min-h-52 flex-col justify-between gap-4 overflow-hidden rounded-barra p-5 text-texto motion-safe:animate-subir md:p-6 ${c.fundo}`}
    >
      <Forma tipo={c.tipo} className={`-right-8 -top-8 -z-10 h-32 w-32 ${c.forma}`} />
      <div className="flex items-start gap-3">
        {Icone && (
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-painel text-texto">
            <Icone className="h-5 w-5" />
          </span>
        )}
        <p className="max-w-[10rem] text-base font-semibold leading-snug md:text-lg">{rotulo}</p>
      </div>
      {aCarregar ? (
        <div aria-hidden="true" data-skeleton className="h-16 w-2/5 animate-pulse rounded-cartao bg-painel/60 motion-reduce:animate-none md:h-20" />
      ) : (
        <p key={String(valor)} className="text-7xl font-bold leading-none tracking-tighter tabular-nums motion-safe:animate-subir md:text-8xl">
          {valor === null ? (
            <>
              <span aria-hidden="true">-</span>
              <span className="sr-only">indisponível</span>
            </>
          ) : (
            valor
          )}
        </p>
      )}
      {ligacao && (
        <Link
          href={ligacao.href}
          className="inline-flex min-h-10 w-fit items-center whitespace-nowrap rounded-full bg-primaria px-5 text-sm font-semibold text-white transition-colors hover:bg-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2"
        >
          {ligacao.texto}
        </Link>
      )}
    </li>
  );
}
