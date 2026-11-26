import type { ReactNode } from "react";
import type { Fonte } from "@/lib/useFonte";
import { botaoSec, erro as erroCls } from "../ui";
import Forma from "./Forma";

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
  /** Classes extra de grelha (ex.: lg:col-span-2). */
  className?: string;
  /** Só muda a forma decorativa do canto: "recentes" = flor pêssego, "vidro" = mancha violeta. */
  efeito?: "recentes" | "vidro";
}

/** Um cartão bento com os 4 estados: a carregar (skeleton), erro, vazio, com dados. */
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
  className = "",
  efeito = "vidro",
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
          <li key={i} aria-hidden="true" data-skeleton className="animate-pulse rounded-cartao bg-campo px-4 py-3 motion-reduce:animate-none">
            <div className="h-4 w-4/5 rounded-controlo bg-trilho" />
            <div className="mt-2 h-3 w-1/2 rounded-controlo bg-trilho" />
          </li>
        ))}
      </ul>
    );
  } else if (vazio(fonte.dados)) {
    corpo = (
      <div className="rounded-cartao border border-dashed border-linha-forte bg-campo p-4 text-sm text-texto-suave">
        <p className="text-base font-medium text-texto">{vazioTitulo}</p>
        <p>{vazioTexto}</p>
        {vazioAcao}
      </div>
    );
  } else {
    corpo = children(fonte.dados);
  }

  return (
    <section
      className={`relative isolate flex flex-col gap-4 overflow-hidden rounded-barra border border-linha bg-painel p-6 motion-safe:animate-subir [animation-delay:120ms] ${className}`}
    >
      {efeito === "recentes" ? (
        <Forma tipo="flor" className="-right-10 -top-10 -z-10 h-36 w-36 text-pessego/70" />
      ) : (
        <Forma tipo="mancha" className="-right-10 -top-10 -z-10 h-36 w-36 text-violeta/55" />
      )}
      <h2 className="text-2xl font-bold leading-tight tracking-tight">{titulo}</h2>
      <div className="flex flex-col gap-2">{corpo}</div>
    </section>
  );
}
