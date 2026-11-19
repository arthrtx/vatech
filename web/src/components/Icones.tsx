// Ícones de linha no estilo da referência (traço fino, pontas arredondadas, monocromático).
// SVG inline para não acrescentar dependências. Sem setas nem chevrons (docs/DESIGN.md).

type Props = { className?: string };

function Base({ className = "h-5 w-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconePedidos(p: Props) {
  return (
    <Base {...p}>
      <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z" />
      <path d="M14 3v3.5A1.5 1.5 0 0 0 15.5 8H19" />
      <path d="M9 13h6M9 17h4" />
    </Base>
  );
}

export function IconeAgenda(p: Props) {
  return (
    <Base {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Base>
  );
}

export function IconeFuncionarios(p: Props) {
  return (
    <Base {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 14.8c2 .6 3.5 2.5 3.5 5.2" />
    </Base>
  );
}

export function IconeUtilizador(p: Props) {
  return (
    <Base {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </Base>
  );
}

export function IconeSair(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 3v8" />
      <path d="M7.2 6a7.5 7.5 0 1 0 9.6 0" />
    </Base>
  );
}

export function IconePesquisa(p: Props) {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Base>
  );
}

export function IconeDashboard(p: Props) {
  return (
    <Base {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Base>
  );
}

export function IconeDefinicoes(p: Props) {
  return (
    <Base {...p}>
      <path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}
