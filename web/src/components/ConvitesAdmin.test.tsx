import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConvitesAdmin from "./ConvitesAdmin";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { getTipos: vi.fn(), convites: { listar: vi.fn(), criar: vi.fn(), reenviar: vi.fn(), revogar: vi.fn() }, aprovarConta: vi.fn(), recusarConta: vi.fn() },
}));

const convite = { id: 1, nome: "Ana", email: "ana@x.pt", papel: "funcionario" as const, expira_em: "2026-12-01", link: "l" };

beforeEach(() => {
  vi.mocked(api.getTipos).mockResolvedValue([{ id: 7, nome: "Responsável de RH", base: "funcionario", permissoes: {}, em_uso: 0 }]);
  vi.mocked(api.convites.listar).mockResolvedValue([{ ...convite, tipo_id: 7, tipo_nome: "Responsável de RH" }]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConvitesAdmin: tipos", () => {
  it("envia tipo_id quando se escolhe um tipo e mostra o tipo nos pendentes", async () => {
    vi.mocked(api.convites.criar).mockResolvedValue(convite);
    render(<ConvitesAdmin pendentes={[]} onDecidida={() => {}} />);
    expect(await screen.findByText(/ana@x\.pt · Responsável de RH/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Convidar funcionário" }));
    await screen.findByRole("option", { name: "Responsável de RH" });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@x.pt" } });
    fireEvent.change(screen.getByLabelText("Papel"), { target: { value: "t7" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }));
    await waitFor(() => expect(api.convites.criar).toHaveBeenCalledWith({ nome: "Ana", email: "ana@x.pt", tipo_id: 7 }));
  });

  it("envia o papel quando se escolhe um papel base", async () => {
    vi.mocked(api.convites.criar).mockResolvedValue(convite);
    render(<ConvitesAdmin pendentes={[]} onDecidida={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Convidar funcionário" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@x.pt" } });
    fireEvent.change(screen.getByLabelText("Papel"), { target: { value: "estagiario" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }));
    await waitFor(() => expect(api.convites.criar).toHaveBeenCalledWith({ nome: "Ana", email: "ana@x.pt", papel: "estagiario" }));
  });

  it("envia o cargo escolhido e não oferece CEO", async () => {
    vi.mocked(api.convites.criar).mockResolvedValue(convite);
    render(<ConvitesAdmin pendentes={[]} onDecidida={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Convidar funcionário" }));
    expect(screen.queryByRole("option", { name: "CEO" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@x.pt" } });
    fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Marketing" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }));
    await waitFor(() =>
      expect(api.convites.criar).toHaveBeenCalledWith({ nome: "Ana", email: "ana@x.pt", papel: "funcionario", cargo: "Marketing" }),
    );
  });
});
