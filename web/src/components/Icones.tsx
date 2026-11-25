// Ícones de linha no estilo da referência (traço fino, pontas arredondadas, monocromático).
// SVG inline para não acrescentar dependências. Sem setas nem chevrons (docs/DESIGN.md), exceto IconeSeta.

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

/** Agenda no menu: caderno com lombada e linhas, para se distinguir do Calendário. */
export function IconeAgendaMenu(p: Props) {
  return (
    <Base {...p}>
      <rect x="5" y="3.5" width="14.5" height="17" rx="2.5" />
      <path d="M9 3.5v17M12.5 8.5h4M12.5 12h4M12.5 15.5h2.5" />
    </Base>
  );
}

export function IconeCalendario(p: Props) {
  return (
    <Base {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
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

export function IconeSol(p: Props) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Base>
  );
}

export function IconeSino(p: Props) {
  return (
    <Base {...p}>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </Base>
  );
}

export function IconeLua(p: Props) {
  return (
    <Base {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Base>
  );
}

export function IconeOlho(p: Props) {
  return (
    <Base {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </Base>
  );
}

// Sem seta (docs/DESIGN.md): bandeja com um traço a entrar.
export function IconeDescarregar(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 4v10" />
      <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
    </Base>
  );
}

export function IconeFechar(p: Props) {
  return (
    <Base {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

/** Seta de navegação (anterior/seguinte); exceção pedida para o seletor de ano do Calendário. */
export function IconeSeta({ direcao, ...p }: Props & { direcao: "esquerda" | "direita" }) {
  return (
    <Base {...p}>
      <path d={direcao === "esquerda" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
    </Base>
  );
}
