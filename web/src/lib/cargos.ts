/** Cargos de uma pessoa. «CEO» é reservado ao admin e não é oferecido no convite. */
export const CARGOS = ["Designer gráfico", "RH", "Desenvolvedor", "Diretora comercial", "Marketing", "Programador", "CEO"] as const;

export const CARGOS_CONVITE = CARGOS.filter((c) => c !== "CEO");
