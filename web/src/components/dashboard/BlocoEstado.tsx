import type { ReactNode } from "react";
import type { Fonte } from "@/lib/useFonte";
import { botaoSec, erro as erroCls, vidro } from "../ui";

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
  /** "recentes": fundo de cor do HUROH com o conteúdo num painel interior; "vidro": só vidro. */
  efeito?: "recentes" | "vidro";
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
          <li
            key={i}
            aria-hidden="true"
            data-skeleton
            className="animate-pulse rounded-controlo bg-painel/70 px-4 py-3 ring-1 ring-linha motion-reduce:animate-none"
          >
            <div className="h-4 w-4/5 rounded-controlo bg-trilho" />
            <div className="mt-2 h-3 w-1/2 rounded-controlo bg-trilho" />
          </li>
        ))}
      </ul>
    );
  } else if (vazio(fonte.dados)) {
    corpo = (
      <div className="rounded-controlo border border-dashed border-linha-forte bg-painel/60 p-4 text-sm text-texto-suave">
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
      className={`${vidro} ${efeito === "recentes" ? "arco efeito-recentes" : "brilho-violeta"} flex flex-col gap-3 p-5 motion-safe:animate-subir [animation-delay:120ms] lg:min-h-0 ${className}`}
    >
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {efeito === "recentes" ? (
        <div className="efeito-interior flex flex-col gap-2 rounded-cartao p-3 ring-1 ring-white/50 dark:ring-white/10 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:scroll-fino">
          {corpo}
        </div>
      ) : (
        <div className="flex flex-col gap-2 lg:-mx-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-1 lg:scroll-fino">{corpo}</div>
      )}
    </section>
  );
}
