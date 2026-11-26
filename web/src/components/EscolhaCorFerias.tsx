"use client";

import type { CorFerias } from "@/lib/api";

/**
 * Paleta do mapa (tokens da plataforma), pela mesma ordem da atribuição automática por pessoa.
 * Férias: cor cheia; ausência e licença: cor suave; pendente: só contorno tracejado.
 */
export const paleta = [
  { chave: "verde", rotulo: "Verde", cheia: "bg-positivo", suave: "bg-positivo/40", anel: "border-positivo", texto: "text-texto" },
  { chave: "violeta", rotulo: "Violeta", cheia: "bg-violeta", suave: "bg-violeta/40", anel: "border-violeta", texto: "text-texto" },
  { chave: "laranja", rotulo: "Laranja", cheia: "bg-laranja", suave: "bg-laranja/40", anel: "border-laranja", texto: "text-texto" },
  { chave: "pessego", rotulo: "Pêssego", cheia: "bg-pessego", suave: "bg-pessego/40", anel: "border-pessego", texto: "text-texto" },
  { chave: "escuro", rotulo: "Escuro", cheia: "bg-primaria", suave: "bg-primaria/30", anel: "border-primaria", texto: "text-white" },
] as const;

export type CorPaleta = (typeof paleta)[number];

/** Cor da paleta para o valor do servidor; desconhecido ou vazio devolve undefined (cor automática). */
export const corDaChave = (chave: string | null | undefined): CorPaleta | undefined => paleta.find((c) => c.chave === chave);

const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";

/** Cinco botões redondos, um por cor, com nome acessível; o escolhido leva anel. */
export default function EscolhaCorFerias({ valor, onChange, rotulo = "Cor das férias" }: { valor: CorFerias; onChange: (c: CorFerias) => void; rotulo?: string }) {
  return (
    <div role="group" aria-label={rotulo} className="flex items-center gap-2">
      {paleta.map((c) => (
        <button
          key={c.chave}
          type="button"
          aria-label={c.rotulo}
          aria-pressed={valor === c.chave}
          title={c.rotulo}
          onClick={() => onChange(c.chave)}
          className={`h-7 w-7 rounded-full ${c.cheia} ring-offset-2 ring-offset-painel ${foco} ${valor === c.chave ? "ring-2 ring-texto" : "ring-1 ring-linha-forte"}`}
        />
      ))}
    </div>
  );
}
