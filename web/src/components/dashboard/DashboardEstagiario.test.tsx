import { CHAVES_DIA_A_DIA } from "@/lib/permissoes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardEstagiario from "./DashboardEstagiario";
import { api, ApiError, type Presenca, type User } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { presencaHoje: vi.fn(), presencas: vi.fn(), marcarEntrada: vi.fn(), marcarSaida: vi.fn() } };
});

const user = { id: 3, nome: "Rita Costa", papel: "estagiario", permissoes: CHAVES_DIA_A_DIA } as User;
const presenca = { id: 1, user_id: 3, data: "2026-11-19", entrada: "2026-11-19T09:00:00", saida: null } as unknown as Presenca;

beforeEach(() => {
  vi.mocked(api.presencaHoje).mockResolvedValue(null);
  vi.mocked(api.presencas).mockResolvedValue([]);
  vi.mocked(api.marcarEntrada).mockResolvedValue(presenca);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DashboardEstagiario, confirmação de presença", () => {
  it("pergunta antes e só a confirmação chama a API", async () => {
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar entrada" }));
    const dialogo = screen.getByRole("alertdialog");
    expect(dialogo.textContent).toMatch(/Deseja marcar entrada às \d{2}:\d{2}\?/);
    expect(api.marcarEntrada).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(api.marcarEntrada).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("cancelar e Escape não chamam a API", async () => {
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Marcar entrada" }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.marcarEntrada).not.toHaveBeenCalled();
  });

  it("a saída também pede confirmação", async () => {
    vi.mocked(api.presencaHoje).mockResolvedValue(presenca);
    vi.mocked(api.presencas).mockResolvedValue([presenca]);
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar saída" }));
    expect(screen.getByRole("alertdialog").textContent).toMatch(/marcar saída às/);
    expect(api.marcarSaida).not.toHaveBeenCalled();
  });

  it("depois da saída mostra os períodos, o total e volta a oferecer Marcar entrada", async () => {
    const fechado = { ...presenca, saida: "2026-11-19T12:00:00Z", entrada: "2026-11-19T08:00:00Z" } as Presenca;
    vi.mocked(api.presencaHoje).mockResolvedValue(fechado);
    vi.mocked(api.presencas).mockResolvedValue([fechado]);
    render(<DashboardEstagiario user={user} />);
    expect(await screen.findByRole("button", { name: "Marcar entrada" })).toBeTruthy();
    expect(screen.getByText("Fora.")).toBeTruthy();
    expect(screen.getByText(/ às .* · 4 h 00 min/)).toBeTruthy();
    expect(screen.getByText("Total de hoje: 4 h 00 min")).toBeTruthy();
  });

  it("um segundo período abre com nova entrada e passa a Em trabalho", async () => {
    const fechado = { ...presenca, id: 1, saida: "2026-11-19T12:00:00Z", entrada: "2026-11-19T08:00:00Z" } as Presenca;
    const aberto = { ...presenca, id: 2, entrada: "2026-11-19T14:00:00Z", saida: null } as Presenca;
    vi.mocked(api.presencaHoje).mockResolvedValue(fechado);
    vi.mocked(api.presencas).mockResolvedValue([fechado]);
    vi.mocked(api.marcarEntrada).mockResolvedValue(aberto);
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("button", { name: "Marcar saída" })).toBeTruthy();
    expect(screen.getByText(/Em trabalho desde/)).toBeTruthy();
    expect(screen.getByText(/· em curso/)).toBeTruthy();
    expect(screen.getByText("Total de hoje: 4 h 00 min")).toBeTruthy();
  });

  it("mostra o 422 do servidor e mantém o botão disponível", async () => {
    vi.mocked(api.marcarEntrada).mockRejectedValue(new ApiError(422, "Já tem uma entrada aberta. Marque primeiro a saída."));
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Já tem uma entrada aberta/));
    expect(screen.getByRole("button", { name: "Marcar entrada" })).toHaveProperty("disabled", false);
  });

  it("depois da marcação o foco fica no botão de presença", async () => {
    vi.mocked(api.marcarEntrada).mockResolvedValue(presenca);
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    const botao = await screen.findByRole("button", { name: "Marcar saída" });
    await waitFor(() => expect(document.activeElement).toBe(botao));
  });

  it("cancelar devolve o foco ao botão de presença", async () => {
    render(<DashboardEstagiario user={user} />);
    const botao = await screen.findByRole("button", { name: "Marcar entrada" });
    fireEvent.click(botao);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(document.activeElement).toBe(botao));
  });
});
