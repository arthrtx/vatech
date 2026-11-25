export const tipos = { ferias: "Férias", ausencia: "Ausência", licenca: "Licença" } as const;
export const subtipos = {
  medica: "Médica",
  documentacao: "Documentação",
  falta_justificada: "Falta justificada",
} as const;
export const estados = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado" } as const;

/** "2026-12-01" para "01/12/2026". */
export const formatarData = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export const papeis: Record<"admin" | "funcionario" | "estagiario", string> = {
  admin: "Administrador",
  funcionario: "Funcionário",
  estagiario: "Estagiário",
};
