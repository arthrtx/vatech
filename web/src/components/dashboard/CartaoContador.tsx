import Link from "next/link";
import type { ComponentType } from "react";

type Cor = "rosa" | "violeta" | "positivo";

// Classes escritas por extenso para o Tailwind as encontrar.
const cores: Record<Cor, { icone: string; barra: string }> = {
  rosa: { icone: "bg-rosa/15 text-rosa", barra: "bg-rosa" },
  violeta: { icone: "bg-violeta/25 text-texto", barra: "bg-violeta" },
  positivo: { icone: "bg-positivo/20 text-texto", barra: "bg-positivo" },
};

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
  /** Ícone decorativo no círculo, ao lado do rótulo. */
  Icone?: ComponentType<{ className?: string }>;
  /** Cor de identidade do cartão: só no ícone e na barrinha, nunca no texto. */
  cor?: Cor;
}

export default function CartaoContador({ rotulo, valor, aCarregar, ligacao, Icone, cor = "violeta" }: Props) {
  const c = cores[cor];
  return (
    <li className="flex flex-col gap-3 rounded-cartao bg-painel/80 p-3 shadow-suave ring-1 ring-white/70 backdrop-blur-xl motion-safe:animate-subir dark:ring-white/10 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold leading-snug text-texto md:text-lg">{rotulo}</p>
        {Icone && (
          <span aria-hidden="true" className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex ${c.icone}`}>
            <Icone className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      {aCarregar ? (
        <div aria-hidden="true" data-skeleton className="h-9 w-2/5 animate-pulse rounded-controlo bg-trilho motion-reduce:animate-none md:h-12" />
      ) : (
        <p
          key={String(valor)}
          className={`text-3xl font-bold leading-none tabular-nums motion-safe:animate-subir md:text-5xl ${valor === null ? "text-texto-suave" : ""}`}
        >
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
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span aria-hidden="true" className={`h-1 w-8 shrink-0 rounded-full ${c.barra}`} />
        {ligacao && (
          <Link
            href={ligacao.href}
            className="inline-flex min-h-9 items-center rounded-full border border-texto/15 bg-painel/40 px-3 text-xs font-medium text-texto shadow-sm backdrop-blur-md transition-colors hover:bg-painel/75 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria md:px-4 md:text-sm"
          >
            {ligacao.texto}
          </Link>
        )}
      </div>
    </li>
  );
}
