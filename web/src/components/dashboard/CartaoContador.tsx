import Link from "next/link";

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
}

// TODO: token em falta (tamanho do numero grande, a confirmar na validacao do design).
export default function CartaoContador({ rotulo, valor, aCarregar, ligacao }: Props) {
  return (
    <li className="rounded-md border border-zinc-300 bg-white p-3 md:p-4">
      {aCarregar ? (
        <div aria-hidden="true" data-skeleton className="animate-pulse motion-reduce:animate-none">
          <div className="h-11 w-3/5 rounded-md bg-zinc-200 md:h-12" />
          <div className="mt-2 h-3 w-1/2 rounded-md bg-zinc-200" />
        </div>
      ) : (
        <>
          <p className={`text-4xl font-semibold leading-none md:text-5xl ${valor === null ? "text-zinc-400" : ""}`}>
            {valor === null ? (
              <>
                <span aria-hidden="true">-</span>
                <span className="sr-only">indisponível</span>
              </>
            ) : (
              valor
            )}
          </p>
          <p className="mt-2 text-xs uppercase leading-snug tracking-wide text-zinc-700">{rotulo}</p>
        </>
      )}
      {ligacao && (
        <Link
          href={ligacao.href}
          className="mt-2 inline-flex min-h-10 items-center text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          {ligacao.texto}
        </Link>
      )}
    </li>
  );
}
