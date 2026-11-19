import type { ReactNode } from "react";
import type { Fonte } from "@/lib/useFonte";
import { botaoSec, erro as erroCls } from "../ui";

interface Props<T> {
  titulo: string;
  fonte: Fonte<T>;
  mensagemErro: string;
  /** Linhas do skeleton: mesma geometria das linhas finais. */
  linhas: number;
  vazio: (dados: T) => boolean;
  vazioTitulo: string;
  vazioTexto: string;
  vazioAcao?: ReactNode;
  children: (dados: T) => ReactNode;
}

/** Um bloco com os 4 estados: a carregar (skeleton), erro, vazio, com dados. */
export default function BlocoEstado<T>({
  titulo,
  fonte,
  mensagemErro,
  linhas,
  vazio,
  vazioTitulo,
  vazioTexto,
  vazioAcao,
  children,
}: Props<T>) {
  let corpo: ReactNode;
  if (fonte.erro) {
    corpo = (
      <div role="alert" className={`${erroCls} flex flex-col items-start gap-2`}>
        <span>{mensagemErro}</span>
        <button type="button" className={botaoSec} onClick={fonte.tentar}>
          Tentar de novo
        </button>
      </div>
    );
  } else if (fonte.dados === null) {
    corpo = (
      <ul aria-busy="true" aria-label={`A carregar: ${titulo}`} className="flex flex-col gap-2">
        {Array.from({ length: linhas }, (_, i) => (
          <li
            key={i}
            aria-hidden="true"
            data-skeleton
            className="animate-pulse rounded-md border border-zinc-300 bg-white px-4 py-3 motion-reduce:animate-none"
          >
            <div className="h-4 w-4/5 rounded-md bg-zinc-200" />
            <div className="mt-2 h-3 w-1/2 rounded-md bg-zinc-200" />
          </li>
        ))}
      </ul>
    );
  } else if (vazio(fonte.dados)) {
    corpo = (
      <div className="rounded-md border border-dashed border-zinc-400 bg-white p-4 text-sm text-zinc-700">
        <p className="text-base font-medium text-zinc-900">{vazioTitulo}</p>
        <p>{vazioTexto}</p>
        {vazioAcao}
      </div>
    );
  } else {
    corpo = children(fonte.dados);
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {corpo}
    </section>
  );
}
