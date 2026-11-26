import type { User } from "./api";

export type Permissao =
  | "pedir_ferias"
  | "pedir_ausencia"
  | "pedir_licenca"
  | "anexar_documentos"
  | "marcar_presenca"
  | "registar_ocorrencias"
  | "criar_compromissos"
  | "melhorar_texto"
  | "aprovar_pedidos"
  | "ver_presencas_empresa"
  | "gerir_pontes"
  | "convidar_pessoas";

type Quem = Pick<User, "papel" | "permissoes"> | null | undefined;

/** O admin tem sempre tudo; os outros só o que o admin concedeu (ausência de dados = nada). */
export function temPermissao(user: Quem, chave: Permissao): boolean {
  if (!user) return false;
  if (user.papel === "admin") return true;
  return (user.permissoes ?? []).includes(chave);
}

/** Pode criar pelo menos um tipo de pedido (férias, ausência ou licença). */
export function podePedir(user: Quem): boolean {
  return (["pedir_ferias", "pedir_ausencia", "pedir_licenca"] as const).some((c) => temPermissao(user, c));
}

/** Permissões do grupo «dia a dia» (as de gestão só existem por concessão do admin). */
export const CHAVES_DIA_A_DIA: Permissao[] = [
  "pedir_ferias",
  "pedir_ausencia",
  "pedir_licenca",
  "anexar_documentos",
  "marcar_presenca",
  "registar_ocorrencias",
  "criar_compromissos",
  "melhorar_texto",
];
