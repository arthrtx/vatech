// Classes partilhadas, com os tokens de globals.css (medidos nas referências, ver docs/DESIGN.md).
export const input =
  "w-full rounded-controlo border border-linha-forte bg-painel px-3 py-2 text-base text-texto focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
export const botao =
  "rounded-controlo bg-primaria px-4 py-2 text-sm font-medium text-white hover:bg-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 disabled:opacity-50";
export const botaoSec =
  "rounded-controlo border border-linha-forte bg-painel px-4 py-2 text-sm font-medium text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 disabled:opacity-50";
export const label = "mb-1 block text-sm font-medium text-texto";
export const botaoPerigo =
  "rounded-controlo border border-perigo bg-painel px-4 py-2 text-sm font-medium text-perigo hover:bg-perigo-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-perigo focus-visible:ring-offset-2 disabled:opacity-50";
export const erro = "rounded-controlo border border-rosa bg-rosa-suave px-3 py-2 text-sm text-texto";
// Widget em vidro fosco (como no HUROH): usar sobre o fundo quente; junta brilho-* e arco de globals.css.
export const vidro = "rounded-cartao bg-painel/45 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10";
// Botões redondos do cartão de boas-vindas: vidro (secundário) e verde da marca (principal).
export const acao =
  "inline-flex min-h-12 items-center gap-2 rounded-full bg-painel/55 px-6 text-sm font-semibold text-texto ring-1 ring-white/70 backdrop-blur-xl hover:bg-primaria-suave dark:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
export const acaoDestaque =
  "inline-flex min-h-12 items-center gap-2 rounded-full bg-positivo px-6 text-sm font-semibold text-barra hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
