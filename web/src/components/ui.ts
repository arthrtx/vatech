// Classes partilhadas, com os tokens de globals.css (medidos nas referências, ver docs/DESIGN.md).
export const input =
  "w-full rounded-full border border-linha-forte bg-painel px-5 py-2 text-base text-texto focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
// Campo de texto de várias linhas: mesmo desenho do `input`, com raio de cartão (uma pílula alta ficaria oval).
export const areaTexto = input.replace("rounded-full", "rounded-cartao").replace("px-5", "px-4");
export const botao =
  "min-h-11 rounded-full bg-primaria px-5 py-2 text-sm font-semibold text-white hover:bg-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 disabled:opacity-50";
export const botaoSec =
  "min-h-11 rounded-full border border-linha-forte bg-painel px-5 py-2 text-sm font-semibold text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 disabled:opacity-50";
export const label = "mb-1 block text-sm font-medium text-texto";
export const botaoPerigo =
  "min-h-11 rounded-full border border-perigo bg-painel px-5 py-2 text-sm font-semibold text-perigo hover:bg-perigo-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-perigo focus-visible:ring-offset-2 disabled:opacity-50";
export const erro = "rounded-controlo border border-rosa bg-rosa-suave px-3 py-2 text-sm text-texto";
// Cartão sólido do estilo bento (sem vidro nem blur). Junta forma-* e cartao-bento de globals.css se precisares de decoração.
export const vidro = "rounded-barra border border-linha bg-painel";
// Botões em pílula do cartão de boas-vindas: secundário (contorno) e principal (escuro).
export const acao =
  "inline-flex min-h-12 items-center gap-2 rounded-full border border-linha-forte bg-painel px-6 text-sm font-semibold text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
export const acaoDestaque =
  "inline-flex min-h-12 items-center gap-2 rounded-full bg-primaria px-6 text-sm font-semibold text-white hover:bg-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
