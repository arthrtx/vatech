import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";

const agenda = vi.fn();
const criarPedido = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/EscolhaLocalidade", () => ({ default: () => null }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana", papel: "funcionario", empresa_id: 1 } }) }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { agenda: (...a: unknown[]) => agenda(...a), aniversarios: async () => [], pontes: async () => [], criarPedido: (...a: unknown[]) => criarPedido(...a) },
}));

import CalendarioPage from "./page";

afterEach(() => {
  cleanup();
  agenda.mockReset();
  criarPedido.mockReset();
});

const LIMITE = 30_000;
const url = (o: Record<string, string> = {}) =>
  new URLSearchParams({ simular: "10", de: "2027-08-03", ate: "2027-08-05", tipo: "ferias", user: "1", ...o });
const ana = { id: 10, user_id: 1, user: { id: 1, nome: "Ana" }, tipo: "ferias", data_inicio: "2027-08-03", data_fim: "2027-08-05", estado: "pendente" };

describe("simulação no calendário", () => {
  it("abre no ano do pedido, com resumo, dias úteis e conflitos dia a dia", async () => {
    params = url();
    agenda.mockResolvedValue([
      ana,
      { id: 11, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: "2027-08-04", data_fim: "2027-08-04", estado: "aprovado" },
      { id: 12, user: { id: 3, nome: "Eva" }, tipo: "ausencia", data_inicio: "2027-08-05", data_fim: "2027-08-05", estado: "pendente" },
    ]);
    render(<CalendarioPage />);
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2027-01-01", "2027-12-31"));
    const painel = await screen.findByRole("region", { name: "Simulação" });
    expect(painel.textContent).toContain("Ana · Férias · 03/08/2027 a 05/08/2027 · 3 dias úteis");
    expect(within(painel).getByText("Sobreposição: 2 pessoas ausentes nestes dias.")).toBeTruthy();
    expect(painel.textContent).toContain("Rui, férias (aprovado)");
    expect(painel.textContent).toContain("Eva, ausência (pendente)");
    expect(screen.getByRole("table", { name: "Calendário 2027" })).toBeTruthy();
    expect(screen.getAllByText(/^Simulação, /).length).toBe(3);
  }, LIMITE);

  it("diz Sem conflitos quando mais ninguém está fora", async () => {
    params = url();
    agenda.mockResolvedValue([ana]);
    render(<CalendarioPage />);
    expect(await screen.findByText("Sem conflitos.")).toBeTruthy();
  }, LIMITE);

  it("Sair da simulação liga a /calendario e nada é escrito", async () => {
    params = url();
    agenda.mockResolvedValue([ana]);
    render(<CalendarioPage />);
    const sair = await screen.findByRole("link", { name: "Sair da simulação" });
    expect(sair.getAttribute("href")).toBe("/calendario");
    expect(criarPedido).not.toHaveBeenCalled();
  }, LIMITE);

  it("parâmetros inválidos ou ausentes: sem simulação", async () => {
    params = url({ de: "lixo" });
    agenda.mockResolvedValue([]);
    render(<CalendarioPage />);
    await screen.findByRole("table", { name: /Calendário/ });
    expect(screen.queryByRole("region", { name: "Simulação" })).toBeNull();
  }, LIMITE);
});
