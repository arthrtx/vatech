import Link from "next/link";
import type { ComponentType } from "react";

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
  /** Ícone decorativo no círculo, ao lado do rótulo. */
  Icone?: ComponentType<{ className?: string }>;
}

export default function CartaoContador({ rotulo, valor, aCarregar, ligacao, Icone }: Props) {
  return (
    <li className="efeito-transparente flex flex-col gap-2 rounded-cartao p-4 shadow-suave ring-1 ring-white/60 backdrop-blur-xl motion-safe:animate-subir dark:ring-white/10">
      {Icone && (
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-painel/50 text-positivo ring-1 ring-white/50 dark:bg-white/5 dark:ring-white/10">
          <Icone className="h-[18px] w-[18px]" />
        </span>
      )}
      {aCarregar ? (
        <div aria-hidden="true" data-skeleton className="animate-pulse motion-reduce:animate-none">
          <div className="h-11 w-3/5 rounded-controlo bg-trilho md:h-12" />
          <div className="mt-2 h-3 w-1/2 rounded-controlo bg-trilho" />
        </div>
      ) : (
        <>
          <p
            key={String(valor)}
            className={`text-4xl font-semibold leading-none tabular-nums motion-safe:animate-subir ${valor === null ? "text-texto-suave" : ""}`}
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
          <p className="mt-2 font-mono text-xs uppercase leading-snug tracking-wide text-texto-suave">{rotulo}</p>
        </>
      )}
      {ligacao && (
        <Link
          href={ligacao.href}
          className="mt-auto inline-flex min-h-8 items-center text-sm font-medium underline underline-offset-4 hover:text-rosa focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
        >
          {ligacao.texto}
        </Link>
      )}
    </li>
  );
}
