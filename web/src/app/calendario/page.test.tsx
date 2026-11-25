import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const agenda = vi.fn();
const aniversarios = vi.fn();
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/EscolhaLocalidade", () => ({ default: () => null }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { agenda: (...a: unknown[]) => agenda(...a), aniversarios: (...a: unknown[]) => aniversarios(...a), pontes: async () => [] },
}));

import CalendarioPage from "./page";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  agenda.mockReset();
  aniversarios.mockReset();
});

describe("pagina do calendario", () => {
  it("pede o ano inteiro, mostra feriado, aniversário e férias, e muda de ano", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T12:00:00") });
    agenda.mockResolvedValue([{ id: 1, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: "2026-08-03", data_fim: "2026-08-05", estado: "aprovado" }]);
    aniversarios.mockResolvedValue([{ user: { id: 3, nome: "Eva" }, data: "2026-03-10" }]);
    render(<CalendarioPage />);
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2026-01-01", "2026-12-31"));
    expect(await screen.findByLabelText(/Aniversário de Eva/)).toBeTruthy();
    expect(screen.getByLabelText(/Feriado nacional: Natal/)).toBeTruthy();
    expect(screen.getAllByLabelText(/Rui: férias/)).toHaveLength(3);
    expect(screen.getAllByRole("grid")).toHaveLength(12);

    fireEvent.click(screen.getByLabelText(/Aniversário de Eva/));
    expect(screen.getByRole("heading", { name: /10 de março/ })).toBeTruthy();

    fireEvent.click(screen.getByText("Ano seguinte"));
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2027-01-01", "2027-12-31"));
  });

  it("mostra o erro da agenda", async () => {
    agenda.mockRejectedValue(new Error("falhou"));
    aniversarios.mockResolvedValue([]);
    render(<CalendarioPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
