import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RhPage from "./page";
import { ApiError, type FichaRh, type Papel } from "@/lib/api";

let papel: Papel = "admin";
let permissoes: string[] = [];
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/rh" }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 1, nome: "Admin", papel, permissoes }, loading: false, logout: vi.fn() }),
}));
vi.mock("@/lib/tema", () => ({ useTema: () => ({ escuro: false, definir: vi.fn() }) }));
vi.mock("@/components/Notificacoes", () => ({ default: () => null }));
vi.mock("@/components/Pesquisa", () => ({ default: () => null }));
vi.mock("@/components/VistaFuncionario", () => ({
  default: ({ user, onFechar }: { user: { nome: string }; onFechar: () => void }) => (
    <div role="dialog" aria-label={`Vista de ${user.nome}`}>
      <button onClick={onFechar}>Fechar vista</button>
    </div>
  ),
}));

const mocks = vi.hoisted(() => ({
  fichasRh: vi.fn(),
  fichaRh: vi.fn(),
  criarInfoRh: vi.fn(),
  editarInfoRh: vi.fn(),
  apagarInfoRh: vi.fn(),
  enviarFicheiroRh: vi.fn(),
  apagarFicheiroRh: vi.fn(),
  urlDoFicheiroRh: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: mocks }));

const ana: FichaRh = { id: 2, nome: "Ana Dias", email: "ana@x.pt", papel: "funcionario", empresa_id: 1, tipo_nome: "Designer", estado_conta: "aprovado", n_ficheiros: 1, n_infos: 2 };
const rui: FichaRh = { id: 3, nome: "Rui Sá", email: "rui@x.pt", papel: "estagiario", empresa_id: 1, estado_conta: "pendente", n_ficheiros: 0, n_infos: 0 };
const detalhe = {
  user: ana,
  infos: [{ id: 10, titulo: "NIF", valor: "123456789", criado_em: "2026-01-02T10:00:00Z" }],
  ficheiros: [{ id: 20, nome: "contrato.pdf", tamanho: 2048, mime: "application/pdf", criado_em: "2026-01-03T10:00:00Z" }],
};

beforeEach(() => {
  papel = "admin";
  permissoes = [];
  mocks.fichasRh.mockResolvedValue([ana, rui]);
  mocks.fichaRh.mockResolvedValue(detalhe);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RH, grelha de fichas", () => {
  it("lista uma ficha por pessoa com as infos principais", async () => {
    render(<RhPage />);
    expect(await screen.findByRole("heading", { name: "Ana Dias" })).toBeTruthy();
    expect(screen.getByText("ana@x.pt")).toBeTruthy();
    expect(screen.getByText("Designer")).toBeTruthy();
    expect(screen.getByText("Conta pendente")).toBeTruthy();
    expect(screen.getByText(/1 ficheiro · 2 informações/)).toBeTruthy();
    expect(screen.getByText(/0 ficheiros · 0 informações/)).toBeTruthy();
  });

  it("Vista geral abre o componente de vista geral da pessoa", async () => {
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Vista geral de Rui Sá" }));
    expect(screen.getByRole("dialog", { name: "Vista de Rui Sá" })).toBeTruthy();
  });

  it("mostra estado vazio e erro", async () => {
    mocks.fichasRh.mockResolvedValueOnce([]);
    render(<RhPage />);
    expect(await screen.findByText("Ainda não há pessoas no sistema.")).toBeTruthy();
    cleanup();
    mocks.fichasRh.mockRejectedValueOnce(new ApiError(500, "Falhou o servidor."));
    render(<RhPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Falhou o servidor.");
  });

  it("adiciona uma informação na ficha", async () => {
    mocks.criarInfoRh.mockResolvedValue({ id: 11, titulo: "IBAN", valor: "PT50", criado_em: "2026-01-04T10:00:00Z" });
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    const janela = await screen.findByRole("dialog", { name: "Ficha de Ana Dias" });
    expect(await within(janela).findByText("NIF")).toBeTruthy();
    fireEvent.click(within(janela).getByRole("button", { name: "Adicionar informação" }));
    fireEvent.change(within(janela).getByLabelText("Título"), { target: { value: "IBAN" } });
    fireEvent.change(within(janela).getByLabelText("Valor"), { target: { value: "PT50" } });
    fireEvent.click(within(janela).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.criarInfoRh).toHaveBeenCalledWith(2, { titulo: "IBAN", valor: "PT50" }));
    expect(await within(janela).findByText("IBAN")).toBeTruthy();
  });

  it("apaga uma informação só depois de confirmar", async () => {
    mocks.apagarInfoRh.mockResolvedValue(undefined);
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    fireEvent.click(await screen.findByRole("button", { name: "Apagar NIF" }));
    expect(mocks.apagarInfoRh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar apagar" }));
    await waitFor(() => expect(mocks.apagarInfoRh).toHaveBeenCalledWith(10));
    await waitFor(() => expect(screen.queryByText("123456789")).toBeNull());
  });

  it("envia um ficheiro e recusa o que passa os 10 MB", async () => {
    mocks.enviarFicheiroRh.mockResolvedValue({ id: 21, nome: "cv.pdf", tamanho: 10, mime: "application/pdf", criado_em: "2026-01-04T10:00:00Z" });
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    await screen.findByText("contrato.pdf");
    const campo = screen.getByLabelText("Escolher ficheiro");

    const grande = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(grande, "size", { value: 11 * 1024 * 1024 });
    fireEvent.change(campo, { target: { files: [grande] } });
    expect((await screen.findByRole("alert")).textContent).toContain("passa os 10 MB");
    expect(mocks.enviarFicheiroRh).not.toHaveBeenCalled();

    const ok = new File(["x"], "cv.pdf", { type: "application/pdf" });
    expect((screen.getByRole("button", { name: "Adicionar ficheiro" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(campo, { target: { files: [ok] } });
    expect((await screen.findByRole("alert")).textContent).toContain("Escolha o tipo de documento");
    expect(mocks.enviarFicheiroRh).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Tipo de documento"), { target: { value: "outro" } });
    expect((screen.getByRole("button", { name: "Adicionar ficheiro" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(campo, { target: { files: [ok] } });
    await waitFor(() => expect(mocks.enviarFicheiroRh).toHaveBeenCalledWith(2, ok, "outro", undefined));
    expect(await screen.findByText("cv.pdf")).toBeTruthy();
  });

  it("envia com o tipo escolhido e exige nome no personalizado", async () => {
    mocks.enviarFicheiroRh.mockResolvedValue({ id: 22, nome: "x.pdf", tamanho: 10, mime: "application/pdf", criado_em: "2026-01-04T10:00:00Z", categoria: "personalizado", categoria_nome: "Atestado" });
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    await screen.findByText("contrato.pdf");
    const tipo = screen.getByLabelText("Tipo de documento");
    expect(Array.from((tipo as HTMLSelectElement).options).map((o) => o.text)).toEqual(["Escolha o tipo…", "Declaração", "Documentos de estágio", "Contrato", "Recibo", "Outro", "Personalizado"]);

    fireEvent.change(tipo, { target: { value: "recibo" } });
    const recibo = new File(["x"], "r.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Escolher ficheiro"), { target: { files: [recibo] } });
    await waitFor(() => expect(mocks.enviarFicheiroRh).toHaveBeenCalledWith(2, recibo, "recibo", undefined));

    fireEvent.change(tipo, { target: { value: "personalizado" } });
    const x = new File(["x"], "x.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Escolher ficheiro"), { target: { files: [x] } });
    expect((await screen.findByRole("alert")).textContent).toContain("nome do tipo");
    expect(mocks.enviarFicheiroRh).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Nome do tipo"), { target: { value: " Atestado " } });
    fireEvent.change(screen.getByLabelText("Escolher ficheiro"), { target: { files: [x] } });
    await waitFor(() => expect(mocks.enviarFicheiroRh).toHaveBeenCalledWith(2, x, "personalizado", "Atestado"));
    expect((await screen.findAllByText("Atestado")).length).toBeGreaterThan(0);
  });

  it("mostra o tipo de cada ficheiro e filtra por tipo", async () => {
    mocks.fichaRh.mockResolvedValue({
      ...detalhe,
      ficheiros: [
        { id: 20, nome: "a.pdf", tamanho: 1, mime: "application/pdf", criado_em: "2026-01-03T10:00:00Z", categoria: "contrato", categoria_nome: null },
        { id: 21, nome: "b.pdf", tamanho: 1, mime: "application/pdf", criado_em: "2026-01-03T10:00:00Z", categoria: "personalizado", categoria_nome: "Atestado" },
      ],
    });
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    await screen.findByText("a.pdf");
    expect(screen.getAllByTestId("tipo-ficheiro").map((e) => e.textContent)).toEqual(["Contrato", "Atestado"]);
    fireEvent.change(screen.getByLabelText("Ver por tipo"), { target: { value: "contrato" } });
    expect(screen.queryByText("b.pdf")).toBeNull();
    expect(screen.getByText("a.pdf")).toBeTruthy();
  });

  it("Esc fecha a ficha", async () => {
    render(<RhPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha de Ana Dias" }));
    await screen.findByRole("dialog", { name: "Ficha de Ana Dias" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("RH, gating por gerir_rh", () => {
  it("funcionário sem gerir_rh é reencaminhado", () => {
    papel = "funcionario";
    render(<RhPage />);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("funcionário com gerir_rh vê as fichas", async () => {
    papel = "funcionario";
    permissoes = ["gerir_rh"];
    render(<RhPage />);
    expect(await screen.findByRole("heading", { name: "Ana Dias" })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
