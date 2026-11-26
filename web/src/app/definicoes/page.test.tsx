import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DefinicoesPage from "./page";
import { ApiError, api } from "@/lib/api";

const atualizarUser = vi.fn();
let user: { id: number; nome: string; email: string; papel: "admin" | "funcionario" | "estagiario"; empresa_id: number } = { id: 1, nome: "Ana", email: "ana@x.pt", papel: "funcionario" as const, empresa_id: 1 };

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user, atualizarUser }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { editarPerfil: vi.fn(), limites: vi.fn(), guardarLimites: vi.fn(), textoConvite: vi.fn().mockResolvedValue({ texto: "Bem-vindo.", predefinido: true }), guardarTextoConvite: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const dados = () => screen.getByRole("form", { name: "Dados da conta" });
const senha = () => screen.getByRole("form", { name: "Alterar palavra-passe" });
const guardar = (f: HTMLElement) => within(f).getByRole("button", { name: /Guardar|A guardar/ }) as HTMLButtonElement;
const escrever = (rotulo: string | RegExp, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

describe("Definições", () => {
  it("mostra cabeçalho de perfil, campos preenchidos e o papel só de leitura", () => {
    render(<DefinicoesPage />);
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Ana");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@x.pt");
    expect(screen.getByText("Só um administrador altera.")).toBeTruthy();
    expect(screen.getByText(/ana@x\.pt · Funcionário/)).toBeTruthy();
  });

  it("botões Guardar desactivados sem alterações e activos quando o formulário fica sujo", () => {
    render(<DefinicoesPage />);
    expect(guardar(dados()).disabled).toBe(true);
    expect(guardar(senha()).disabled).toBe(true);
    escrever("Nome", "Ana B");
    expect(guardar(dados()).disabled).toBe(false);
    expect(guardar(senha()).disabled).toBe(true);
    escrever("Nova palavra-passe (mín. 8)", "x");
    expect(guardar(senha()).disabled).toBe(false);
  });

  it("guarda os dados sem password, actualiza o contexto e mostra sucesso", async () => {
    vi.mocked(api.editarPerfil).mockResolvedValue({ ...user, nome: "Ana B" });
    render(<DefinicoesPage />);
    escrever("Nome", "Ana B");
    fireEvent.click(guardar(dados()));
    await within(dados()).findByText("Dados guardados.");
    expect(api.editarPerfil).toHaveBeenCalledWith({ nome: "Ana B", email: "ana@x.pt", data_nascimento: null });
    expect(atualizarUser).toHaveBeenCalledWith({ ...user, nome: "Ana B" });
  });

  it("a data de nascimento é opcional: guarda-se ao escrevê-la e pode ser apagada", async () => {
    vi.mocked(api.editarPerfil).mockResolvedValue({ ...user, data_nascimento: "1990-05-17" });
    render(<DefinicoesPage />);
    const campo = screen.getByLabelText("Data de nascimento (opcional)") as HTMLInputElement;
    expect(campo.value).toBe("");
    expect(guardar(dados()).disabled).toBe(true);
    fireEvent.change(campo, { target: { value: "17/05/1990" } });
    expect(guardar(dados()).disabled).toBe(false);
    fireEvent.click(guardar(dados()));
    await within(dados()).findByText("Dados guardados.");
    expect(api.editarPerfil).toHaveBeenCalledWith({ nome: "Ana", email: "ana@x.pt", data_nascimento: "1990-05-17" });
  });

  it("altera a palavra-passe reenviando nome e email actuais, e limpa os campos", async () => {
    vi.mocked(api.editarPerfil).mockResolvedValue(user);
    render(<DefinicoesPage />);
    escrever("Palavra-passe atual", "velha123");
    escrever("Nova palavra-passe (mín. 8)", "nova12345");
    escrever("Confirmar nova palavra-passe", "nova12345");
    fireEvent.click(guardar(senha()));
    await within(senha()).findByText("Dados guardados.");
    expect(api.editarPerfil).toHaveBeenCalledWith({
      nome: "Ana",
      email: "ana@x.pt",
      password: "nova12345",
      password_atual: "velha123",
    });
    expect((screen.getByLabelText("Palavra-passe atual") as HTMLInputElement).value).toBe("");
  });

  it("não envia se a confirmação não coincide e marca o campo inválido", () => {
    render(<DefinicoesPage />);
    escrever("Palavra-passe atual", "velha123");
    escrever("Nova palavra-passe (mín. 8)", "nova12345");
    escrever("Confirmar nova palavra-passe", "outra");
    fireEvent.click(guardar(senha()));
    expect(within(senha()).getByRole("alert").textContent).toContain("não coincidem");
    expect(screen.getByLabelText("Confirmar nova palavra-passe").getAttribute("aria-invalid")).toBe("true");
    expect(api.editarPerfil).not.toHaveBeenCalled();
  });

  it("mostra erro por campo (password_atual) e não actualiza o contexto", async () => {
    vi.mocked(api.editarPerfil).mockRejectedValue(
      new ApiError(422, "Invalid", { password_atual: ["A palavra-passe actual está errada."] }),
    );
    render(<DefinicoesPage />);
    escrever("Palavra-passe atual", "velha123");
    escrever("Nova palavra-passe (mín. 8)", "nova12345");
    escrever("Confirmar nova palavra-passe", "nova12345");
    fireEvent.click(guardar(senha()));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("actual está errada");
    expect(screen.getByLabelText("Palavra-passe atual").getAttribute("aria-invalid")).toBe("true");
    expect(atualizarUser).not.toHaveBeenCalled();
  });

  it("pede a palavra-passe atual quando o email muda e não envia sem ela", async () => {
    render(<DefinicoesPage />);
    expect(within(dados()).queryByLabelText("Palavra-passe atual")).toBeNull();
    escrever("Email", "novo@x.pt");
    expect(within(dados()).getByLabelText("Palavra-passe atual")).toBeTruthy();
    fireEvent.click(guardar(dados()));
    expect(within(dados()).getByRole("alert").textContent).toContain("palavra-passe atual");
    expect(api.editarPerfil).not.toHaveBeenCalled();
    vi.mocked(api.editarPerfil).mockResolvedValue({ ...user, email: "novo@x.pt" });
    fireEvent.change(within(dados()).getByLabelText("Palavra-passe atual"), { target: { value: "velha123" } });
    fireEvent.click(guardar(dados()));
    await within(dados()).findByText("Dados guardados.");
    expect(api.editarPerfil).toHaveBeenCalledWith({ nome: "Ana", email: "novo@x.pt", data_nascimento: null, password_atual: "velha123" });
    expect(atualizarUser).toHaveBeenCalledWith({ ...user, email: "novo@x.pt" });
  });

  it("só alterar o nome não pede palavra-passe atual", () => {
    render(<DefinicoesPage />);
    escrever("Nome", "Ana B");
    expect(within(dados()).queryByLabelText("Palavra-passe atual")).toBeNull();
  });

  it("não envia nova palavra-passe sem a atual", () => {
    render(<DefinicoesPage />);
    escrever("Nova palavra-passe (mín. 8)", "nova12345");
    escrever("Confirmar nova palavra-passe", "nova12345");
    fireEvent.click(guardar(senha()));
    expect(within(senha()).getByRole("alert").textContent).toContain("palavra-passe atual");
    expect(api.editarPerfil).not.toHaveBeenCalled();
  });

  it("a palavra-passe atual sozinha, sem nova, não envia e foca a nova", () => {
    render(<DefinicoesPage />);
    escrever("Palavra-passe atual", "velha123");
    fireEvent.click(guardar(senha()));
    expect(within(senha()).getByRole("alert").textContent).toContain("pelo menos 8");
    expect(api.editarPerfil).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText("Nova palavra-passe (mín. 8)"));
  });

  it("nova com menos de 8 caracteres não envia", () => {
    render(<DefinicoesPage />);
    escrever("Palavra-passe atual", "velha123");
    escrever("Nova palavra-passe (mín. 8)", "curta");
    escrever("Confirmar nova palavra-passe", "curta");
    fireEvent.click(guardar(senha()));
    expect(screen.getByLabelText("Nova palavra-passe (mín. 8)").getAttribute("aria-invalid")).toBe("true");
    expect(api.editarPerfil).not.toHaveBeenCalled();
  });

  it("foca o primeiro campo inválido (atual) quando faltam vários", () => {
    render(<DefinicoesPage />);
    escrever("Confirmar nova palavra-passe", "x");
    fireEvent.click(guardar(senha()));
    expect(document.activeElement).toBe(within(senha()).getByLabelText("Palavra-passe atual"));
  });

  it("a região de estado existe sempre e o aviso de sucesso limpa ao voltar a editar", async () => {
    vi.mocked(api.editarPerfil).mockResolvedValue({ ...user, nome: "Ana B" });
    render(<DefinicoesPage />);
    expect(within(dados()).getByRole("status").textContent).toBe("");
    escrever("Nome", "Ana B");
    fireEvent.click(guardar(dados()));
    await within(dados()).findByText("Dados guardados.");
    escrever("Nome", "Ana C");
    expect(within(dados()).getByRole("status").textContent).toBe("");
  });

  it("mostra erro 422 junto ao campo da palavra-passe atual no formulário de dados", async () => {
    vi.mocked(api.editarPerfil).mockRejectedValue(new ApiError(422, "Invalid", { password_atual: ["A palavra-passe atual está errada."] }));
    render(<DefinicoesPage />);
    escrever("Email", "novo@x.pt");
    fireEvent.change(within(dados()).getByLabelText("Palavra-passe atual"), { target: { value: "errada" } });
    fireEvent.click(guardar(dados()));
    expect((await within(dados()).findByRole("alert")).textContent).toContain("atual está errada");
    expect(within(dados()).getByLabelText("Palavra-passe atual").getAttribute("aria-invalid")).toBe("true");
  });

  it("429 mostra mensagem humana", async () => {
    vi.mocked(api.editarPerfil).mockRejectedValue(new ApiError(429, "Too Many Attempts."));
    render(<DefinicoesPage />);
    escrever("Nome", "Ana B");
    fireEvent.click(guardar(dados()));
    expect((await within(dados()).findByRole("alert")).textContent).toBe(
      "Demasiadas tentativas. Tente de novo dentro de um minuto.",
    );
  });

  it("desactiva o botão enquanto envia", async () => {
    let fim: (u: typeof user) => void = () => {};
    vi.mocked(api.editarPerfil).mockReturnValue(new Promise((r) => (fim = r)));
    render(<DefinicoesPage />);
    escrever("Nome", "Ana B");
    fireEvent.click(guardar(dados()));
    const b = await screen.findByRole("button", { name: "A guardar..." });
    expect((b as HTMLButtonElement).disabled).toBe(true);
    fim(user);
    await waitFor(() => expect(within(dados()).getByText("Dados guardados.")).toBeTruthy());
  });
});

describe("Limites de dias úteis por ano", () => {
  const lista = [
    { tipo: "ferias" as const, dias_ano: 22, transitados: 0, usados: 0 },
    { tipo: "ausencia" as const, dias_ano: null, transitados: 0, usados: 0 },
    { tipo: "licenca" as const, dias_ano: 5, transitados: 0, usados: 0 },
  ];
  const comoAdmin = () => {
    user = { ...user, papel: "admin" };
    vi.mocked(api.limites).mockResolvedValue({ limites: lista, prazo_ferias: "2026-04-30" });
    vi.mocked(api.textoConvite).mockResolvedValue({ texto: "Bem-vindo.", predefinido: true });
  };
  afterEach(() => {
    user = { ...user, papel: "funcionario" };
  });

  it("só o admin vê a secção", () => {
    render(<DefinicoesPage />);
    expect(screen.queryByRole("form", { name: "Limites de dias úteis por ano" })).toBeNull();
    expect(api.limites).not.toHaveBeenCalled();
  });

  it("carrega os valores (vazio = sem limite), edita e guarda", async () => {
    comoAdmin();
    vi.mocked(api.guardarLimites).mockResolvedValue([
      { tipo: "ferias", dias_ano: 25, transitados: 0, usados: 0 },
      { tipo: "ausencia", dias_ano: null, transitados: 0, usados: 0 },
      { tipo: "licenca", dias_ano: 5, transitados: 0, usados: 0 },
    ]);
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Limites de dias úteis por ano" });
    await waitFor(() => expect((within(f).getByLabelText("Férias") as HTMLInputElement).value).toBe("22"));
    expect((within(f).getByLabelText("Ausência") as HTMLInputElement).value).toBe("");
    expect((within(f).getByLabelText("Licença") as HTMLInputElement).value).toBe("5");
    expect(guardar(f).disabled).toBe(true);
    fireEvent.change(within(f).getByLabelText("Férias"), { target: { value: "25" } });
    fireEvent.click(guardar(f));
    await within(f).findByText("Dados guardados.");
    expect(api.guardarLimites).toHaveBeenCalledWith([
      { tipo: "ferias", dias_ano: 25 },
      { tipo: "ausencia", dias_ano: null },
      { tipo: "licenca", dias_ano: 5 },
    ]);
  });

  it("mostra o erro do servidor ao guardar", async () => {
    comoAdmin();
    vi.mocked(api.guardarLimites).mockRejectedValue(new ApiError(500, "Falhou."));
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Limites de dias úteis por ano" });
    await waitFor(() => expect((within(f).getByLabelText("Férias") as HTMLInputElement).value).toBe("22"));
    fireEvent.change(within(f).getByLabelText("Férias"), { target: { value: "" } });
    fireEvent.click(guardar(f));
    await within(f).findByText("Falhou.");
  });

  it("separa as definições do admin em conta e geral", async () => {
    comoAdmin();
    render(<DefinicoesPage />);
    expect(await screen.findByRole("tab", { name: "Configurações da conta" })).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Limites de dias úteis por ano" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Geral" }));
    expect(await screen.findByRole("form", { name: "Limites de dias úteis por ano" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Aparência" })).toBeNull();
  });

  it("texto do convite: carrega, edita e guarda", async () => {
    comoAdmin();
    vi.mocked(api.guardarTextoConvite).mockResolvedValue({ texto: "Olá equipa.", predefinido: false });
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Texto do convite" });
    await waitFor(() => expect((within(f).getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("Bem-vindo."));
    expect(guardar(f).disabled).toBe(true);
    fireEvent.change(within(f).getByLabelText("Mensagem"), { target: { value: "Olá equipa." } });
    fireEvent.click(guardar(f));
    await within(f).findByText("Dados guardados.");
    expect(api.guardarTextoConvite).toHaveBeenCalledWith("Olá equipa.");
  });

  it("texto do convite: repor predefinido envia null e mostra o texto do servidor", async () => {
    comoAdmin();
    vi.mocked(api.textoConvite).mockResolvedValue({ texto: "Personalizado.", predefinido: false });
    vi.mocked(api.guardarTextoConvite).mockResolvedValue({ texto: "Bem-vindo.", predefinido: true });
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Texto do convite" });
    await waitFor(() => expect((within(f).getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("Personalizado."));
    fireEvent.click(within(f).getByRole("button", { name: "Repor predefinido" }));
    await waitFor(() => expect((within(f).getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("Bem-vindo."));
    expect(api.guardarTextoConvite).toHaveBeenCalledWith(null);
  });

  it("texto do convite: mostra o erro do servidor ao guardar", async () => {
    comoAdmin();
    vi.mocked(api.guardarTextoConvite).mockRejectedValue(new ApiError(500, "Falhou."));
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Texto do convite" });
    await waitFor(() => expect((within(f).getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("Bem-vindo."));
    fireEvent.change(within(f).getByLabelText("Mensagem"), { target: { value: "x" } });
    fireEvent.click(guardar(f));
    await within(f).findByText("Falhou.");
  });
});
