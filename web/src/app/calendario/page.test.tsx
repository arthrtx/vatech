import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const agenda = vi.fn();
const aniversarios = vi.fn();
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/EscolhaLocalidade", () => ({ default: () => null }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana", papel: "funcionario", empresa_id: 1 } }) }));
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
    // um só quadro contínuo, sem faixas nem cartões por mês: o mês é a primeira coluna de cada bloco
    expect(screen.getAllByRole("table", { name: "Calendário 2026" })).toHaveLength(1);
    expect(screen.getAllByRole("rowheader", { name: /^(Janeiro|Fevereiro|Dezembro)$/ })).toHaveLength(3);
    // legenda: a cor e os dias úteis de férias de cada pessoa (3 a 5 de agosto, seg a qua)
    const legenda = screen.getByRole("complementary", { name: "Legenda" });
    const linha = within(legenda).getByRole("rowheader", { name: "Rui" }).closest("tr") as HTMLElement;
    expect(linha.textContent).toContain("3");

    fireEvent.click(screen.getByLabelText(/Aniversário de Eva/));
    expect(screen.getByRole("heading", { name: /10 de março/ })).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Ano seguinte"));
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2027-01-01", "2027-12-31"));
  });

  it("mostra o erro da agenda", async () => {
    agenda.mockRejectedValue(new Error("falhou"));
    aniversarios.mockResolvedValue([]);
    render(<CalendarioPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("o botão Descarregar PDF abre a impressão com o ano no nome do ficheiro", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T12:00:00") });
    agenda.mockResolvedValue([]);
    aniversarios.mockResolvedValue([]);
    const imprimir = vi.fn(() => {
      expect(document.title).toBe("Calendario-2026");
    });
    window.print = imprimir;
    const antes = document.title;
    render(<CalendarioPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Descarregar PDF" }));
    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(document.title).toBe(antes);
  });
});
