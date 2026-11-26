// Pastas da secção de RH. Cores: tokens existentes de globals.css.
export const pastasRh = [
  { slug: "gestao-salarial", nome: "Gestão salarial", de: "from-violeta/45", ate: "to-violeta/20", aba: "bg-violeta/45" },
  { slug: "gestao-de-estagiarios", nome: "Gestão de estagiários", de: "from-primaria-suave", ate: "to-primaria-suave/60", aba: "bg-primaria-suave" },
  { slug: "contratos", nome: "Contratos", de: "from-pessego/55", ate: "to-pessego/25", aba: "bg-pessego/55" },
  { slug: "documentos", nome: "Documentos", de: "from-creme", ate: "to-laranja/20", aba: "bg-creme" },
] as const;

export type PastaRh = (typeof pastasRh)[number];
