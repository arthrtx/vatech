export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEY = "vatech_token";

export type Papel = "admin" | "funcionario" | "estagiario";
export type TipoPedido = "ferias" | "ausencia" | "licenca";
export type SubtipoPedido = "medica" | "documentacao" | "falta_justificada";
export type EstadoPedido = "pendente" | "aprovado" | "recusado";

export interface User {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  empresa_id: number;
  avatar_url?: string | null;
  /** Só estagiários: datas do estágio (Y-m-d). */
  estagio_inicio?: string | null;
  estagio_fim?: string | null;
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
}

export interface Anexo {
  id: number;
  nome: string;
  mime: string;
  tamanho: number;
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
  observacao: string | null;
  estado: EstadoPedido;
  decidido_por: number | null;
  decidido_em: string | null;
  motivo_recusa: string | null;
  user?: { id: number; nome: string };
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
  observacao?: string | null;
  decidido_por?: number | null;
  decidido_em?: string | null;
  motivo_recusa?: string | null;
}

export interface NovoPedido {
  tipo: TipoPedido;
  subtipo?: SubtipoPedido;
  data_inicio: string;
  data_fim: string;
  observacao?: string;
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
    estagio_inicio?: string | null;
    estagio_fim?: string | null;
  }) =>
    (await request<{ user: User }>("PUT", "/me", b)).user,
  enviarAvatar: async (ficheiro: File) => {
    const f = new FormData();
    f.append("avatar", ficheiro);
    return (await request<{ user: User }>("POST", "/me/avatar", f)).user;
  },
  removerAvatar: async () => (await request<{ user: User }>("DELETE", "/me/avatar")).user,
  funcionarios: async () => (await request<{ data: User[] }>("GET", "/funcionarios")).data,
  criarFuncionario: async (b: { nome: string; email: string; password: string; papel: Papel }) =>
    (await request<{ data: User }>("POST", "/funcionarios", b)).data,
  editarFuncionario: async (id: number, b: { nome: string; email: string; password?: string; papel?: Papel }) =>
    (await request<{ data: User }>("PUT", `/funcionarios/${id}`, b)).data,
  apagarFuncionario: (id: number) => request<void>("DELETE", `/funcionarios/${id}`),
  presencaHoje: async () => (await request<{ data: Presenca | null }>("GET", "/presencas/hoje")).data,
  marcarEntrada: async () => (await request<{ data: Presenca }>("POST", "/presencas/entrada")).data,
  marcarSaida: async () => (await request<{ data: Presenca }>("POST", "/presencas/saida")).data,
  marcarPresencaAtrasada: async (corpo: { data: string; entrada: string; saida: string }) =>
    (await request<{ data: Presenca }>("POST", "/presencas/atrasada", corpo)).data,
  presencas: async (de: string, ate: string, userId?: number) =>
    (await request<{ data: Presenca[] }>("GET", `/presencas?de=${de}&ate=${ate}${userId ? `&user_id=${userId}` : ""}`)).data,
  pedidos: async (estado?: EstadoPedido) =>
    (await request<{ data: Pedido[] }>("GET", `/pedidos${estado ? `?estado=${estado}` : ""}`)).data,
  agenda: async (de: string, ate: string) =>
    (await request<{ data: PedidoAgenda[] }>("GET", `/agenda?de=${de}&ate=${ate}`)).data,
  criarPedido: (b: NovoPedido) =>
    request<{ data: Pedido; avisos?: string[] }>("POST", "/pedidos", b),
  editarPedido: (id: number, b: NovoPedido) =>
    request<{ data: Pedido; avisos?: string[] }>("PUT", `/pedidos/${id}`, b),
  apagarPedido: (id: number) => request<void>("DELETE", `/pedidos/${id}`),
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
  aprovar: async (id: number) =>
    (await request<{ data: Pedido }>("POST", `/pedidos/${id}/aprovar`)).data,
  recusar: async (id: number, motivo_recusa: string) =>
    (await request<{ data: Pedido }>("POST", `/pedidos/${id}/recusar`, { motivo_recusa })).data,
};
