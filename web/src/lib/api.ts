export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEY = "vatech_token";

export type Papel = "admin" | "funcionario" | "estagiario";
export type TipoPedido = "ferias" | "ausencia" | "licenca";
export type SubtipoPedido = "medica" | "documentacao" | "falta_justificada";
export type EstadoPedido = "pendente" | "aprovado" | "recusado" | "cancelado";

export type EstadoConta = "pendente" | "aprovado" | "recusado";

export interface Convite {
  id: number;
  nome: string;
  email: string;
  papel: Exclude<Papel, "admin">;
  expira_em: string;
  /** Tipo personalizado (ausente em respostas antigas). */
  tipo_id?: number | null;
  tipo_nome?: string | null;
  /** Link de aceitação (em produção sem SMTP é o admin que o partilha). */
  link: string;
}

/** Dados públicos de um convite (GET /convites/{token}); `texto` é a mensagem do administrador. */
export interface ConvitePublico {
  nome: string;
  email: string;
  texto?: string;
}

export interface TextoConvite {
  texto: string;
  predefinido: boolean;
}

export type GrupoPermissao = "dia_a_dia" | "gestao";
export type PapelComPermissoes = "funcionario" | "estagiario";

export interface PermissaoCatalogo {
  chave: string;
  rotulo: string;
  grupo: GrupoPermissao;
}

export type MatrizPermissoes = Record<PapelComPermissoes, Record<string, boolean>>;

export interface Permissoes {
  catalogo: PermissaoCatalogo[];
  papeis: MatrizPermissoes;
}

/** Tipo personalizado de pessoa: herda o papel `base` e tem permissões próprias. */
export interface TipoPessoa {
  id: number;
  nome: string;
  base: PapelComPermissoes;
  permissoes: Record<string, boolean>;
  em_uso: number;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  empresa_id: number;
  /** Chaves de permissão concedidas (o admin tem todas). Ausente em respostas antigas: tratar como []. */
  permissoes?: string[];
  /** Tipo personalizado, se tiver. Ausente em respostas antigas: tratar como null. */
  tipo?: { id: number; nome: string } | null;
  tipo_id?: number | null;
  tipo_nome?: string | null;
  /** Ausente em respostas antigas: tratar como «aprovado». */
  estado_conta?: EstadoConta;
  avatar_url?: string | null;
  /** Opcional (Y-m-d). Aparece na agenda como «Aniversário de …». */
  data_nascimento?: string | null;
  /** Só estagiários: datas do estágio (Y-m-d). */
  estagio_inicio?: string | null;
  estagio_fim?: string | null;
  /** Só estagiários: horário de almoço (HH:MM, hora de Lisboa). */
  almoco_inicio?: string | null;
  almoco_fim?: string | null;
}

/** Marcação de presença do dia; entrada/saida em ISO8601, hora do servidor. */
export interface Presenca {
  id: number;
  user_id: number;
  user?: { id: number; nome: string };
  data: string;
  entrada: string;
  saida: string | null;
  /** true quando registada pelo botão «Esqueci de marcar presença». */
  atrasada: boolean;
  /** Minutos do almoço que caem entre a entrada e a saída; já descontados no total. */
  almoco_min?: number;
}

export type TipoOcorrencia = "falta" | "atraso";
export type MotivoOcorrencia = "imprevisto" | "doenca" | "transportes" | "outro";

/** Falta ou atraso comunicado pelo estagiário. */
export interface Ocorrencia {
  id: number;
  user_id: number;
  user?: { id: number; nome: string } | null;
  data: string;
  tipo: TipoOcorrencia;
  motivo: MotivoOcorrencia;
  descricao: string;
}

export interface Anexo {
  id: number;
  nome: string;
  mime: string;
  tamanho: number;
}

export interface FichaRh extends User {
  tipo_id?: number | null;
  tipo_nome?: string | null;
  n_ficheiros: number;
  n_infos: number;
}

export interface InfoRh {
  id: number;
  titulo: string;
  valor: string;
  criado_em: string;
}

export interface FicheiroRh {
  id: number;
  nome: string;
  tamanho: number;
  mime: string;
  criado_em: string;
}

export interface FichaRhDetalhe {
  user: User;
  infos: InfoRh[];
  ficheiros: FicheiroRh[];
}

export type TipoCompromisso = "reuniao" | "chamada" | "lembrete" | "outro";

/** Compromisso da agenda pessoal (só quem o marcou o vê). Horas em HH:MM. */
export interface Compromisso {
  id: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  titulo: string;
  tipo: TipoCompromisso;
  descricao: string | null;
}

/** Cor escolhida para as férias (valores exactos do servidor). */
export type CorFerias = "verde" | "violeta" | "laranja" | "pessego" | "escuro";

export interface Ponte {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
}

export interface Pedido {
  anexos?: Anexo[];
  id: number;
  empresa_id: number;
  user_id: number;
  tipo: TipoPedido;
  subtipo: SubtipoPedido | null;
  data_inicio: string;
  data_fim: string;
  /** Só ausências: horas (HH:MM) em que a pessoa está fora. */
  hora_inicio?: string | null;
  hora_fim?: string | null;
  observacao: string | null;
  urgente?: boolean;
  cor?: string | null;
  estado: EstadoPedido;
  decidido_por: number | null;
  decidido_em: string | null;
  /** Só licenças: quando o admin viu o aviso. */
  visto_em?: string | null;
  motivo_recusa: string | null;
  /** Só férias: dias úteis acima dos 22 do ano (0 se nenhum). */
  dias_excedentes?: number;
  user?: { id: number; nome: string };
}

/** Aniversário de alguém da empresa num dia do intervalo pedido (a API não revela o ano de nascimento). */
export interface Aniversario {
  user: { id: number; nome: string };
  data: string;
}

/** Pedido na agenda: completo (admin e proprios); de colegas so id, user, tipo, datas e estado. */
export interface PedidoAgenda {
  id: number;
  user?: { id: number; nome: string };
  tipo: TipoPedido;
  data_inicio: string;
  data_fim: string;
  estado: EstadoPedido;
  empresa_id?: number;
  user_id?: number;
  subtipo?: SubtipoPedido | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
  urgente?: boolean;
  cor?: string | null;
  decidido_por?: number | null;
  decidido_em?: string | null;
  motivo_recusa?: string | null;
}

export interface NovoPedido {
  tipo: TipoPedido;
  subtipo?: SubtipoPedido;
  data_inicio: string;
  data_fim: string;
  hora_inicio?: string;
  hora_fim?: string;
  observacao?: string;
  urgente?: boolean;
  /** Só férias: cor no mapa do ano. */
  cor?: CorFerias;
}

/** Dias por tipo de pedido (fixos): férias 22 por ano, até dias_max (25); null = sem limite; usados = pendente+aprovado do utilizador no ano corrente. */
export interface Limite {
  tipo: TipoPedido;
  dias_ano: number | null;
  /** Máximo que se pode pedir (férias: 25); os dias acima de dias_ano são excedente. */
  dias_max: number | null;
  /** Férias não gozadas do ano anterior (só > 0 em «ferias»); somam ao limite do ano. */
  transitados: number;
  usados: number;
}

/** Admin: cúmulo de férias por pessoa; por_marcar = dias_ano + transitados - usados (>= 0). */
export interface FeriasResumo {
  user_id: number;
  nome: string;
  dias_ano: number | null;
  dias_max: number | null;
  transitados: number;
  usados: number;
  por_marcar: number;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let memToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(token: string | null) {
  memToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage indisponivel: fica so em memoria
  }
}

export function getToken(): string | null {
  if (memToken) return memToken;
  try {
    memToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    memToken = null;
  }
  return memToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export function mensagemDeErro(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403 && /^(Ocorreu um erro\.|This action is unauthorized\.|)$/.test(err.message)) return "Não tem permissão para esta ação. Peça a um administrador.";
    return err.errors ? Object.values(err.errors).flat().join(" ") : err.message;
  }
  return "Não foi possível contactar o servidor.";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  let data: { message?: string; errors?: Record<string, string[]> } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== "/login") {
      setToken(null);
      onUnauthorized?.();
    }
    throw new ApiError(res.status, data?.message ?? "Ocorreu um erro.", data?.errors);
  }
  return data as T;
}

export const api = {
  login: async (email: string, password: string) => {
    const r = await request<{ token: string; user: User }>("POST", "/login", { email, password });
    setToken(r.token);
    return r.user;
  },
  convite: async (token: string) =>
    (await request<{ data: ConvitePublico }>("GET", `/convites/${encodeURIComponent(token)}`)).data,
  aceitarConvite: async (token: string, b: { password: string; password_confirmation: string; aceita_termos: boolean }) =>
    (await request<{ message: string }>("POST", `/convites/${encodeURIComponent(token)}/aceitar`, b)).message,
  reenviarConfirmacao: async (email: string) =>
    (await request<{ message: string }>("POST", "/email/reenviar", { email })).message,
  esqueciPassword: async (email: string) =>
    (await request<{ message: string }>("POST", "/esqueci-password", { email })).message,
  redefinirPassword: async (b: { token: string; email: string; password: string; password_confirmation: string }) =>
    (await request<{ message: string }>("POST", "/redefinir-password", b)).message,
  logout: async () => {
    try {
      await request<void>("POST", "/logout");
    } finally {
      setToken(null);
    }
  },
  me: async () => (await request<{ user: User }>("GET", "/me")).user,
  editarPerfil: async (b: {
    nome: string;
    email: string;
    password?: string;
    password_atual?: string;
    data_nascimento?: string | null;
    estagio_inicio?: string | null;
    estagio_fim?: string | null;
  }) =>
    (await request<{ user: User }>("PUT", "/me", b)).user,
  enviarAvatar: async (ficheiro: File) => {
    const f = new FormData();
    f.append("avatar", ficheiro);
    return (await request<{ user: User }>("POST", "/me/avatar", f)).user;
  },
  definirAlmoco: async (b: { almoco_inicio: string | null; almoco_fim: string | null }) =>
    (await request<{ user: User }>("PUT", "/me/almoco", b)).user,
  removerAvatar: async () => (await request<{ user: User }>("DELETE", "/me/avatar")).user,
  convites: {
    listar: async () => (await request<{ data: Convite[] }>("GET", "/funcionarios/convites")).data,
    criar: async (b: { nome: string; email: string; papel?: Convite["papel"]; tipo_id?: number | null }) =>
      (await request<{ data: Convite }>("POST", "/funcionarios/convites", b)).data,
    reenviar: async (id: number) => (await request<{ data: Convite }>("POST", `/funcionarios/convites/${id}/reenviar`)).data,
    revogar: (id: number) => request<void>("DELETE", `/funcionarios/convites/${id}`),
  },
  aprovarConta: async (id: number) => (await request<{ data: User }>("POST", `/funcionarios/${id}/aprovar`)).data,
  recusarConta: async (id: number) => (await request<{ data: User }>("POST", `/funcionarios/${id}/recusar`)).data,
  funcionarios: async () => (await request<{ data: User[] }>("GET", "/funcionarios")).data,
  presencaHoje: async () => (await request<{ data: Presenca | null }>("GET", "/presencas/hoje")).data,
  marcarEntrada: async () => (await request<{ data: Presenca }>("POST", "/presencas/entrada")).data,
  marcarSaida: async () => (await request<{ data: Presenca }>("POST", "/presencas/saida")).data,
  marcarPresencaAtrasada: async (corpo: { data: string; entrada: string; saida: string }) =>
    (await request<{ data: Presenca }>("POST", "/presencas/atrasada", corpo)).data,
  presencas: async (de: string, ate: string, userId?: number) =>
    (await request<{ data: Presenca[] }>("GET", `/presencas?de=${de}&ate=${ate}${userId ? `&user_id=${userId}` : ""}`)).data,
  ocorrencias: async (de: string, ate: string, userId?: number) =>
    (await request<{ data: Ocorrencia[] }>("GET", `/ocorrencias?de=${de}&ate=${ate}${userId ? `&user_id=${userId}` : ""}`)).data,
  registarOcorrencia: async (corpo: { data: string; tipo: TipoOcorrencia; motivo: MotivoOcorrencia; descricao: string }) =>
    (await request<{ data: Ocorrencia }>("POST", "/ocorrencias", corpo)).data,
  pedidos: async (estado?: EstadoPedido) =>
    (await request<{ data: Pedido[] }>("GET", `/pedidos${estado ? `?estado=${estado}` : ""}`)).data,
  agenda: async (de: string, ate: string) =>
    (await request<{ data: PedidoAgenda[] }>("GET", `/agenda?de=${de}&ate=${ate}`)).data,
  pontes: async (de?: string, ate?: string) =>
    (await request<{ data: Ponte[] }>("GET", `/pontes${de && ate ? `?de=${de}&ate=${ate}` : ""}`)).data,
  criarPonte: async (b: { nome: string; data_inicio: string; data_fim: string }) =>
    (await request<{ data: Ponte }>("POST", "/pontes", b)).data,
  apagarPonte: (id: number) => request<void>("DELETE", `/pontes/${id}`),
  compromissos: async (de: string, ate: string) =>
    (await request<{ data: Compromisso[] }>("GET", `/compromissos?de=${de}&ate=${ate}`)).data,
  criarCompromisso: async (b: {
    data: string;
    titulo: string;
    tipo: TipoCompromisso;
    hora_inicio?: string;
    hora_fim?: string;
    descricao?: string;
  }) => (await request<{ data: Compromisso }>("POST", "/compromissos", b)).data,
  apagarCompromisso: (id: number) => request<void>("DELETE", `/compromissos/${id}`),
  aniversarios: async (de: string, ate: string) =>
    (await request<{ data: Aniversario[] }>("GET", `/aniversarios?de=${de}&ate=${ate}`)).data,
  criarPedido: (b: NovoPedido) =>
    request<{ data: Pedido; avisos?: string[] }>("POST", "/pedidos", b),
  editarPedido: (id: number, b: NovoPedido) =>
    request<{ data: Pedido; avisos?: string[] }>("PUT", `/pedidos/${id}`, b),
  limites: async () => {
    const r = await request<{ data: Limite[]; prazo_ferias: string }>("GET", "/limites");
    return { limites: r.data, prazo_ferias: r.prazo_ferias };
  },
  feriasResumo: async () => {
    const r = await request<{ data: FeriasResumo[]; prazo_ferias: string }>("GET", "/ferias-resumo");
    return { resumo: r.data, prazo_ferias: r.prazo_ferias };
  },
  getPermissoes: async () => (await request<{ data: Permissoes }>("GET", "/definicoes/permissoes")).data,
  putPermissoes: async (papeis: MatrizPermissoes) =>
    (await request<{ data: Permissoes }>("PUT", "/definicoes/permissoes", { papeis })).data,
  getTipos: async () => (await request<{ data: TipoPessoa[] }>("GET", "/definicoes/tipos")).data,
  criarTipo: async (b: { nome: string; base: PapelComPermissoes; permissoes?: Record<string, boolean> }) =>
    (await request<{ data: TipoPessoa }>("POST", "/definicoes/tipos", b)).data,
  editarTipo: async (id: number, b: { nome?: string; permissoes?: Record<string, boolean> }) =>
    (await request<{ data: TipoPessoa }>("PUT", `/definicoes/tipos/${id}`, b)).data,
  apagarTipo: (id: number) => request<void>("DELETE", `/definicoes/tipos/${id}`),
  definirTipoPessoa: async (id: number, tipo_id: number | null, papel?: PapelComPermissoes) =>
    (await request<{ data: User }>("PUT", `/funcionarios/${id}/tipo`, papel ? { tipo_id, papel } : { tipo_id })).data,
  textoConvite: async () => (await request<{ data: TextoConvite }>("GET", "/definicoes/convite")).data,
  guardarTextoConvite: async (texto: string | null) =>
    (await request<{ data: TextoConvite }>("PUT", "/definicoes/convite", { texto })).data,
  apagarPedido: (id: number) => request<void>("DELETE", `/pedidos/${id}`),
  cancelarPedido: (id: number) => request<{ data: Pedido }>("POST", `/pedidos/${id}/cancelar`),
  melhorarTexto: async (texto: string) => (await request<{ texto: string }>("POST", "/texto/melhorar", { texto })).texto,
  enviarAnexos: async (pedidoId: number, ficheiros: File[]) => {
    const f = new FormData();
    for (const ficheiro of ficheiros) f.append("anexos[]", ficheiro);
    return (await request<{ data: Anexo[] }>("POST", `/pedidos/${pedidoId}/anexos`, f)).data;
  },
  apagarAnexo: (pedidoId: number, anexoId: number) => request<void>("DELETE", `/pedidos/${pedidoId}/anexos/${anexoId}`),
  /** Descarrega o ficheiro com o token (um link simples não leva o Authorization) e devolve um URL temporário. */
  urlDoAnexo: async (pedidoId: number, anexoId: number) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/pedidos/${pedidoId}/anexos/${anexoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Não foi possível abrir o ficheiro.");
    return URL.createObjectURL(await res.blob());
  },
  fichasRh: async () => (await request<{ data: FichaRh[] }>("GET", "/rh/fichas")).data,
  fichaRh: async (userId: number) => (await request<{ data: FichaRhDetalhe }>("GET", `/rh/fichas/${userId}`)).data,
  criarInfoRh: async (userId: number, b: { titulo: string; valor: string }) =>
    (await request<{ data: InfoRh }>("POST", `/rh/fichas/${userId}/infos`, b)).data,
  editarInfoRh: async (id: number, b: { titulo: string; valor: string }) =>
    (await request<{ data: InfoRh }>("PUT", `/rh/infos/${id}`, b)).data,
  apagarInfoRh: (id: number) => request<void>("DELETE", `/rh/infos/${id}`),
  enviarFicheiroRh: async (userId: number, ficheiro: File) => {
    const f = new FormData();
    f.append("ficheiro", ficheiro);
    return (await request<{ data: FicheiroRh }>("POST", `/rh/fichas/${userId}/ficheiros`, f)).data;
  },
  apagarFicheiroRh: (id: number) => request<void>("DELETE", `/rh/ficheiros/${id}`),
  /** Descarrega com o token e devolve um URL temporário (libertar com URL.revokeObjectURL). */
  urlDoFicheiroRh: async (id: number) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/rh/ficheiros/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Não foi possível abrir o ficheiro.");
    return URL.createObjectURL(await res.blob());
  },
  licencasPorVer: async () => (await request<{ data: Pedido[] }>("GET", "/pedidos?licencas_por_ver=1")).data,
  marcarLicencaVista: async (id: number) =>
    (await request<{ data: Pedido }>("POST", `/pedidos/${id}/visto`)).data,
  aprovar: async (id: number) =>
    (await request<{ data: Pedido }>("POST", `/pedidos/${id}/aprovar`)).data,
  recusar: async (id: number, motivo_recusa: string) =>
    (await request<{ data: Pedido }>("POST", `/pedidos/${id}/recusar`, { motivo_recusa })).data,
};
