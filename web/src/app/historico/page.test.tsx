import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Historico from "./page";
import { api, type PaginaHistorico } from "@/lib/api";

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { historico: vi.fn(), apagarHistorico: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const pagina = (): PaginaHistorico => ({
  data: [
    { id: 1, tipo: "convite", descricao: "Convite enviado a Rui", actor: { id: 1, nome: "Ana" }, alvo: null, criado_em: "2026-11-20T10:30:00Z" },
    { id: 2, tipo: "pedido", descricao: "Pedido aprovado", actor: null, alvo: null, criado_em: "2026-11-21T09:00:00Z" },
  ],
  meta: { pagina_atual: 1, ultima_pagina: 2, total: 2 },
});
const vazia = (): PaginaHistorico => ({ data: [], meta: { pagina_atual: 1, ultima_pagina: 1, total: 0 } });

describe("Histórico", () => {
  it("mostra os registos e a contagem", async () => {
    vi.mocked(api.historico).mockResolvedValue(pagina());
    render(<Historico />);
    expect(await screen.findByText("Convite enviado a Rui")).toBeTruthy();
    expect(screen.getByText("Pedido aprovado")).toBeTruthy();
    expect(screen.getByText("2 registos")).toBeTruthy();
    expect(screen.getByText("Por Ana")).toBeTruthy();
  });

  it("filtra por tipo", async () => {
    vi.mocked(api.historico).mockResolvedValue(pagina());
    render(<Historico />);
    await screen.findByText("Convite enviado a Rui");
    fireEvent.click(screen.getByRole("button", { name: "Convites" }));
    await waitFor(() => expect(api.historico).toHaveBeenLastCalledWith({ tipo: "convite", q: undefined, pagina: 1 }));
  });

  it("pagina com Seguinte", async () => {
    vi.mocked(api.historico).mockResolvedValue(pagina());
    render(<Historico />);
    await screen.findByText("Convite enviado a Rui");
    fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
    await waitFor(() => expect(api.historico).toHaveBeenLastCalledWith({ tipo: undefined, q: undefined, pagina: 2 }));
  });

  it("mostra estado vazio", async () => {
    vi.mocked(api.historico).mockResolvedValue(vazia());
    render(<Historico />);
    expect(await screen.findByText("Nenhum registo encontrado.")).toBeTruthy();
  });
});

describe("Histórico, apagar", () => {
  async function abrir() {
    vi.mocked(api.historico).mockResolvedValue(pagina());
    render(<Historico />);
    await screen.findByText("Convite enviado a Rui");
    fireEvent.click(screen.getByRole("button", { name: "Apagar histórico" }));
    return screen.getByRole("alertdialog");
  }

  it("abrir a caixa não chama a API e o foco fica em Cancelar", async () => {
    const caixa = await abrir();
    expect(caixa.textContent).toContain("Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.apagarHistorico).not.toHaveBeenCalled();
  });

  it("Cancelar e Escape fecham sem chamar a API", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apagar histórico" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.apagarHistorico).not.toHaveBeenCalled();
  });

  it("Confirmar apaga, recarrega e avisa", async () => {
    const caixa = await abrir();
    vi.mocked(api.apagarHistorico).mockResolvedValue({ apagados: 2 });
    vi.mocked(api.historico).mockResolvedValue(vazia());
    const confirmar = caixa.querySelectorAll("button")[1];
    fireEvent.click(confirmar);
    expect(await screen.findByText("Histórico apagado (2 registos)")).toBeTruthy();
    expect(api.apagarHistorico).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Nenhum registo encontrado.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("mostra o erro dentro da caixa", async () => {
    const caixa = await abrir();
    vi.mocked(api.apagarHistorico).mockRejectedValue(new Error("x"));
    fireEvent.click(caixa.querySelectorAll("button")[1]);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("prende o foco: Tab e Shift+Tab ciclam dentro da caixa", async () => {
    await abrir();
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const apagar = screen.getAllByRole("button", { name: "Apagar histórico" })[1];
    cancelar.focus();
    fireEvent.keyDown(cancelar, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(apagar);
    fireEvent.keyDown(apagar, { key: "Tab" });
    expect(document.activeElement).toBe(cancelar);
  });

  it("devolve o foco ao botão que abriu a caixa ao fechar", async () => {
    vi.mocked(api.historico).mockResolvedValue(pagina());
    render(<Historico />);
    await screen.findByText("Convite enviado a Rui");
    const gatilho = screen.getByRole("button", { name: "Apagar histórico" });
    gatilho.focus(); // o clique do browser foca o botão; o fireEvent não
    fireEvent.click(gatilho);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.activeElement).toBe(gatilho);
    gatilho.focus();
    fireEvent.click(gatilho);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(gatilho);
  });
});
