import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AvisoFerias from "./AvisoFerias";
import FeriasPorMarcar from "./FeriasPorMarcar";
import { api } from "@/lib/api";

vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { limites: vi.fn(), feriasResumo: vi.fn() } };
});

const prazo = "2026-04-30";
const limites = (dias_ano: number | null, transitados: number, usados: number) =>
  vi.mocked(api.limites).mockResolvedValue({ limites: [{ tipo: "ferias", dias_ano, transitados, usados }], prazo_ferias: prazo });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.resetAllMocks();
});

describe("AvisoFerias", () => {
  it("depois do prazo e com dias por marcar, avisa com ligação para pedir", async () => {
    vi.setSystemTime(new Date(2026, 4, 1, 12));
    limites(22, 8, 10);
    render(<AvisoFerias />);
    const aviso = await screen.findByRole("status");
    expect(aviso.textContent).toContain("Tem 20 dias úteis de férias por marcar. O prazo era 30 de abril.");
    expect(screen.getByRole("link", { name: "Fazer pedido de férias" }).getAttribute("href")).toBe("/calendario");
  });

  it("o X fecha o aviso e ele fica fechado enquanto os dias por marcar forem os mesmos", async () => {
    localStorage.clear();
    vi.setSystemTime(new Date(2026, 4, 1, 12));
    limites(22, 8, 10);
    const { unmount } = render(<AvisoFerias />);
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByRole("status")).toBeNull();
    unmount();
    render(<AvisoFerias />);
    await waitFor(() => expect(api.limites).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(screen.queryByRole("status")).toBeNull();
    localStorage.clear();
  });

  it("no próprio dia do prazo ainda não avisa", async () => {
    vi.setSystemTime(new Date(2026, 3, 30, 12));
    limites(22, 8, 10);
    render(<AvisoFerias />);
    await waitFor(() => expect(api.limites).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("depois do prazo sem dias por marcar ou sem limite, não avisa", async () => {
    vi.setSystemTime(new Date(2026, 4, 1, 12));
    limites(22, 8, 30);
    const { unmount } = render(<AvisoFerias />);
    await waitFor(() => expect(api.limites).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(screen.queryByRole("status")).toBeNull();
    unmount();
    limites(null, 0, 0);
    render(<AvisoFerias />);
    await waitFor(() => expect(api.limites).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mostra as férias transitadas no dashboard, mesmo antes do prazo", async () => {
    vi.setSystemTime(new Date(2026, 2, 1, 12));
    limites(22, 8, 0);
    render(<AvisoFerias comTransitadas />);
    expect(await screen.findByText("Férias transitadas: 8 dias úteis")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("FeriasPorMarcar (admin)", () => {
  const resumo = [
    { user_id: 1, nome: "Ana", dias_ano: 22, transitados: 4, usados: 10, por_marcar: 16 },
    { user_id: 2, nome: "Rui", dias_ano: 22, transitados: 0, usados: 22, por_marcar: 0 },
    { user_id: 3, nome: "Eva", dias_ano: 22, transitados: 1, usados: 0, por_marcar: 23 },
  ];

  it("depois do prazo lista só quem tem dias por marcar", async () => {
    vi.setSystemTime(new Date(2026, 4, 2, 12));
    vi.mocked(api.feriasResumo).mockResolvedValue({ resumo, prazo_ferias: prazo });
    render(<FeriasPorMarcar />);
    expect(await screen.findByText("Ana: 16 dias úteis")).toBeTruthy();
    expect(screen.getByText("Eva: 23 dias úteis")).toBeTruthy();
    expect(screen.queryByText(/Rui/)).toBeNull();
  });

  it("antes do prazo mostra só o total de transitados da equipa", async () => {
    vi.setSystemTime(new Date(2026, 2, 2, 12));
    vi.mocked(api.feriasResumo).mockResolvedValue({ resumo, prazo_ferias: prazo });
    render(<FeriasPorMarcar />);
    expect(await screen.findByText("Férias transitadas na equipa: 5 dias úteis.")).toBeTruthy();
    expect(screen.queryByText(/Ana:/)).toBeNull();
  });

  it("não aparece sem ninguém por marcar", async () => {
    vi.setSystemTime(new Date(2026, 4, 2, 12));
    vi.mocked(api.feriasResumo).mockResolvedValue({ resumo: [resumo[1]], prazo_ferias: prazo });
    render(<FeriasPorMarcar />);
    await waitFor(() => expect(api.feriasResumo).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByRole("region")).toBeNull();
  });
});
