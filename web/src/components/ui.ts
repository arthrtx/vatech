// Classes partilhadas, só com utilidades do sistema de design (cor, raio, sombra e alvo por token).
// Foco: o anel vem do `:focus-visible` global do sistema, por isso não se anula aqui.
const campo =
  "w-full rounded-md border border-text-3 bg-surface-2 px-4 text-md text-text-1 transition-colors duration-[var(--ds-motion-base)] ease-ds placeholder:text-text-3 hover:border-text-2 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-3 md:text-base";
export const input = `${campo} min-h-touch`;
// Campo de texto de várias linhas: mesmo desenho do `input`, com altura livre.
export const areaTexto = `${campo} py-3`;
const botaoBase =
  "inline-flex min-h-touch items-center justify-center gap-3 rounded-md px-6 text-sm font-bold whitespace-nowrap select-none transition-colors duration-[var(--ds-motion-base)] ease-ds disabled:cursor-not-allowed disabled:opacity-50";
export const botao = `${botaoBase} ds-press border border-transparent bg-accent text-on-accent hover:bg-accent-hover [--ds-press-colour:color-mix(in_srgb,var(--ds-accent)_40%,transparent)]`;
export const botaoSec = `${botaoBase} border-2 border-line-strong bg-transparent font-semibold text-text-1 hover:bg-wash`;
export const label = "mb-1 block text-sm font-semibold text-text-1";
export const botaoPerigo = `${botaoBase} border-2 border-critical bg-transparent font-semibold text-critical-ink hover:bg-critical-wash`;
export const erro = "rounded-md border border-critical-edge bg-critical-wash px-3 py-2 text-sm text-critical-ink";
// Cartão sólido do sistema: superfície, borda fina e sombra de superfície. O raio é o de superfície.
export const vidro = "rounded-lg border border-line bg-surface-1 shadow-surface";
// Botões do cartão de boas-vindas: secundário (contorno) e principal. Alvo confortável de 48px.
export const acao = `${botaoSec} min-h-touch-comfort gap-2`;
export const acaoDestaque = `${botao} min-h-touch-comfort gap-2`;
