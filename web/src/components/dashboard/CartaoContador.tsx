import Link from "next/link";
import { vidro } from "../ui";

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
}

export default function CartaoContador({ rotulo, valor, aCarregar, ligacao }: Props) {
  return (
    <li className={`${vidro} p-4 motion-safe:animate-subir nth-1:efeito-saldo nth-2:efeito-mes nth-3:efeito-metal md:p-5`}>
      {aCarregar ? (
        <div aria-hidden="true" data-skeleton className="animate-pulse motion-reduce:animate-none">
          <div className="h-11 w-3/5 rounded-controlo bg-trilho md:h-12" />
          <div className="mt-2 h-3 w-1/2 rounded-controlo bg-trilho" />
        </div>
      ) : (
        <>
          <p
            key={String(valor)}
            className={`text-4xl font-semibold leading-none tabular-nums motion-safe:animate-subir md:text-5xl ${valor === null ? "text-texto-suave" : ""}`}
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
          className="mt-2 inline-flex min-h-10 items-center text-sm font-medium underline underline-offset-4 hover:text-rosa focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
        >
          {ligacao.texto}
        </Link>
      )}
    </li>
  );
}
