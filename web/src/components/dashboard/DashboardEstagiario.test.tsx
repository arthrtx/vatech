import { CHAVES_DIA_A_DIA } from "@/lib/permissoes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardEstagiario from "./DashboardEstagiario";
import { api, type Presenca, type User } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { presencaHoje: vi.fn(), marcarEntrada: vi.fn(), marcarSaida: vi.fn() } };
});

const user = { id: 3, nome: "Rita Costa", papel: "estagiario", permissoes: CHAVES_DIA_A_DIA } as User;
const presenca = { id: 1, user_id: 3, data: "2026-11-19", entrada: "2026-11-19T09:00:00", saida: null } as unknown as Presenca;

beforeEach(() => {
  vi.mocked(api.presencaHoje).mockResolvedValue(null);
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
    render(<DashboardEstagiario user={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar saída" }));
    expect(screen.getByRole("alertdialog").textContent).toMatch(/marcar saída às/);
    expect(api.marcarSaida).not.toHaveBeenCalled();
  });
});
