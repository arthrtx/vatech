import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DefinicoesPage from "./page";
import { ApiError, api } from "@/lib/api";

const atualizarUser = vi.fn();
const H0 = { entrada: "08:00", saida: "17:00", almoco_inicio: "12:00", almoco_min: 60 };
let user: { id: number; nome: string; email: string; papel: "admin" | "funcionario" | "estagiario"; empresa_id: number } = { id: 1, nome: "Ana", email: "ana@x.pt", papel: "funcionario" as const, empresa_id: 1 };

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user, atualizarUser }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { editarPerfil: vi.fn(), textoConvite: vi.fn().mockResolvedValue({ texto: "Bem-vindo.", predefinido: true }), guardarTextoConvite: vi.fn(), getHorario: vi.fn().mockResolvedValue({ empresa: { entrada: "08:00", saida: "17:00", almoco_inicio: "12:00", almoco_min: 60 }, meu: { entrada: "08:00", saida: "17:00", almoco_inicio: "12:00", almoco_min: 60 } }), definirHorarioEmpresa: vi.fn(), horarios: vi.fn().mockResolvedValue([]), definirHorarioPessoa: vi.fn(), funcionarios: vi.fn().mockResolvedValue([]) } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(api.getHorario).mockResolvedValue({ empresa: H0, meu: H0 });
  vi.mocked(api.horarios).mockResolvedValue([]);
  vi.mocked(api.funcionarios).mockResolvedValue([]);
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

describe("Definições do admin", () => {
  const comoAdmin = () => {
    user = { ...user, papel: "admin" };
    vi.mocked(api.textoConvite).mockResolvedValue({ texto: "Bem-vindo.", predefinido: true });
  };
  afterEach(() => {
    user = { ...user, papel: "funcionario" };
  });

  it("mostra as férias como fixas, sem formulário de limites", async () => {
    comoAdmin();
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    expect(await screen.findByText("Férias: 22 dias úteis por ano, podendo pedir até 25.")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Limites de dias úteis por ano" })).toBeNull();
  });

  it("separa as definições do admin em conta e geral", async () => {
    comoAdmin();
    render(<DefinicoesPage />);
    expect(await screen.findByRole("tab", { name: "Configurações da conta" })).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Texto do convite" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Geral" }));
    expect(await screen.findByRole("form", { name: "Texto do convite" })).toBeTruthy();
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

  it("horário da empresa: carrega, mostra a jornada, edita e guarda", async () => {
    comoAdmin();
    vi.mocked(api.definirHorarioEmpresa).mockResolvedValue({ entrada: "09:00", saida: "18:00", almoco_inicio: "13:00", almoco_min: 30 });
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Horário da empresa" });
    await waitFor(() => expect((within(f).getByLabelText("Entrada") as HTMLInputElement).value).toBe("08:00"));
    expect((within(f).getByLabelText("Almoço das") as HTMLInputElement).value).toBe("12:00");
    expect(within(f).getByText("8 h de trabalho.")).toBeTruthy();
    expect(guardar(f).disabled).toBe(true);
    fireEvent.change(within(f).getByLabelText("Entrada"), { target: { value: "09:00" } });
    fireEvent.change(within(f).getByLabelText("Saída"), { target: { value: "18:00" } });
    fireEvent.change(within(f).getByLabelText("Almoço das"), { target: { value: "13:00" } });
    fireEvent.change(within(f).getByLabelText("Durante (minutos)"), { target: { value: "30" } });
    expect(within(f).getByText("8 h 30 min de trabalho.")).toBeTruthy();
    fireEvent.click(guardar(f));
    await within(f).findByText("Dados guardados.");
    expect(api.definirHorarioEmpresa).toHaveBeenCalledWith({ entrada: "09:00", saida: "18:00", almoco_inicio: "13:00", almoco_min: 30 });
  });

  it("horário da empresa: mostra o erro 422 do servidor", async () => {
    comoAdmin();
    vi.mocked(api.definirHorarioEmpresa).mockRejectedValue(new ApiError(422, "A saída tem de ser depois da entrada."));
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Horário da empresa" });
    await waitFor(() => expect((within(f).getByLabelText("Entrada") as HTMLInputElement).value).toBe("08:00"));
    fireEvent.change(within(f).getByLabelText("Saída"), { target: { value: "07:00" } });
    fireEvent.click(guardar(f));
    await within(f).findByText("A saída tem de ser depois da entrada.");
  });

  const pessoa = (o = {}) => ({ user_id: 7, nome: "Rui", entrada: null, saida: null, almoco_inicio: null, almoco_min: null, efectivo: H0, ...o });

  it("horário por pessoa: só o que difere da empresa fica personalizado e volta a seguir a empresa", async () => {
    comoAdmin();
    const ef = { entrada: "10:00", saida: "17:00", almoco_inicio: "12:00", almoco_min: 60 };
    vi.mocked(api.horarios).mockResolvedValue([pessoa()]);
    vi.mocked(api.definirHorarioPessoa).mockResolvedValueOnce(pessoa({ entrada: "10:00", efectivo: ef })).mockResolvedValueOnce(pessoa());
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    expect(await screen.findByText("Segue a empresa")).toBeTruthy();
    expect(screen.getByText("08:00 às 17:00, almoço das 12:00 às 13:00")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar horário de Rui" }));
    const f = screen.getByRole("form", { name: "Horário de Rui" });
    expect(within(f).getAllByText("Igual à empresa")).toHaveLength(4);
    fireEvent.change(within(f).getByLabelText("Entrada"), { target: { value: "10:00" } });
    expect(within(f).getAllByText("Igual à empresa")).toHaveLength(3);
    expect(within(f).getAllByText("Personalizado")).toHaveLength(1);
    fireEvent.click(within(f).getByRole("button", { name: "Guardar" }));
    expect(await screen.findAllByText("Personalizado")).toBeTruthy();
    expect(api.definirHorarioPessoa).toHaveBeenNthCalledWith(1, 7, { entrada: "10:00", saida: null, almoco_inicio: null, almoco_min: null });
    expect(screen.queryByRole("form", { name: "Horário de Rui" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar horário de Rui" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao horário da empresa" }));
    expect(await screen.findByText("Segue a empresa")).toBeTruthy();
    expect(api.definirHorarioPessoa).toHaveBeenNthCalledWith(2, 7, { entrada: null, saida: null, almoco_inicio: null, almoco_min: null });
  });

  it("horário por pessoa: mostra o erro do servidor", async () => {
    comoAdmin();
    vi.mocked(api.horarios).mockResolvedValue([pessoa()]);
    vi.mocked(api.definirHorarioPessoa).mockRejectedValue(new ApiError(422, "Horário inválido."));
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar horário de Rui" }));
    fireEvent.click(within(screen.getByRole("form", { name: "Horário de Rui" })).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Horário inválido.")).toBeTruthy();
  });

  it("guardar a empresa recarrega a lista por pessoa e o Editar abre com valores frescos", async () => {
    comoAdmin();
    const nova = { entrada: "09:00", saida: "18:00", almoco_inicio: "13:00", almoco_min: 30 };
    vi.mocked(api.horarios).mockResolvedValueOnce([pessoa()]).mockResolvedValueOnce([pessoa({ efectivo: nova })]);
    vi.mocked(api.definirHorarioEmpresa).mockResolvedValue(nova);
    vi.mocked(api.getHorario)
      .mockResolvedValueOnce({ empresa: H0, meu: H0 })
      .mockResolvedValueOnce({ empresa: H0, meu: H0 })
      .mockResolvedValue({ empresa: nova, meu: nova });
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    expect(await screen.findByText("08:00 às 17:00, almoço das 12:00 às 13:00")).toBeTruthy();
    const f = await screen.findByRole("form", { name: "Horário da empresa" });
    await waitFor(() => expect((within(f).getByLabelText("Entrada") as HTMLInputElement).value).toBe("08:00"));
    fireEvent.change(within(f).getByLabelText("Entrada"), { target: { value: "09:00" } });
    fireEvent.change(within(f).getByLabelText("Saída"), { target: { value: "18:00" } });
    fireEvent.change(within(f).getByLabelText("Almoço das"), { target: { value: "13:00" } });
    fireEvent.change(within(f).getByLabelText("Durante (minutos)"), { target: { value: "30" } });
    fireEvent.click(guardar(f));
    expect(await screen.findByText("09:00 às 18:00, almoço das 13:00 às 13:30")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar horário de Rui" }));
    const p = screen.getByRole("form", { name: "Horário de Rui" });
    expect((within(p).getByLabelText("Entrada") as HTMLInputElement).value).toBe("09:00");
    expect((within(p).getByLabelText("Durante (minutos)") as HTMLInputElement).value).toBe("30");
    expect(within(p).getAllByText("Igual à empresa")).toHaveLength(4);
  });

  it("erro de hora liga-se ao campo (aria-invalid/describedby) e leva-lhe o foco", async () => {
    comoAdmin();
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Horário da empresa" });
    await waitFor(() => expect((within(f).getByLabelText("Saída") as HTMLInputElement).value).toBe("17:00"));
    fireEvent.change(within(f).getByLabelText("Saída"), { target: { value: "" } });
    fireEvent.change(within(f).getByLabelText("Entrada"), { target: { value: "09:00" } });
    fireEvent.click(guardar(f));
    const campo = within(f).getByLabelText("Saída");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    const alvo = campo.getAttribute("aria-describedby")!;
    expect(document.getElementById(alvo)?.textContent).toBe("Indique a hora de saída.");
    expect(document.activeElement).toBe(campo);
    expect(api.definirHorarioEmpresa).not.toHaveBeenCalled();
  });

  it("erro 422 do servidor leva o foco ao campo da hora", async () => {
    comoAdmin();
    vi.mocked(api.definirHorarioEmpresa).mockRejectedValue(new ApiError(422, "Invalid", { saida: ["A hora de saída tem de ser depois da entrada."] }));
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    const f = await screen.findByRole("form", { name: "Horário da empresa" });
    await waitFor(() => expect((within(f).getByLabelText("Entrada") as HTMLInputElement).value).toBe("08:00"));
    fireEvent.change(within(f).getByLabelText("Entrada"), { target: { value: "18:00" } });
    fireEvent.click(guardar(f));
    await within(f).findByText("A hora de saída tem de ser depois da entrada.");
    const campo = within(f).getByLabelText("Saída");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(campo));
  });

  it("homónimos distinguem-se pelo email na lista e no nome acessível", async () => {
    comoAdmin();
    vi.mocked(api.horarios).mockResolvedValue([pessoa({ user_id: 4 }), pessoa({ user_id: 6 })]);
    vi.mocked(api.funcionarios).mockResolvedValue([
      { id: 4, nome: "Rui", email: "rui1@x.pt", papel: "funcionario" },
      { id: 6, nome: "Rui", email: "rui2@x.pt", papel: "funcionario" },
    ] as never);
    render(<DefinicoesPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geral" }));
    expect(await screen.findByText("rui1@x.pt")).toBeTruthy();
    expect(screen.getByText("rui2@x.pt")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar horário de Rui (rui1@x.pt)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar horário de Rui (rui2@x.pt)" })).toBeTruthy();
  });

  it("o não-admin não vê os formulários de horário nem os pede à API", () => {
    render(<DefinicoesPage />);
    expect(screen.queryByRole("form", { name: "Horário da empresa" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Horário por pessoa" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Geral" })).toBeNull();
    expect(api.getHorario).not.toHaveBeenCalled();
    expect(api.horarios).not.toHaveBeenCalled();
  });
});
