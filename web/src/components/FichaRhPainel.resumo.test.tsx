import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import FichaRhPainel from "./FichaRhPainel";

const { resumoRh, gerar } = vi.hoisted(() => ({ resumoRh: vi.fn(), gerar: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    fichaRh: vi.fn().mockResolvedValue({ user: { id: 7, nome: "Rui Reis", email: "r@x.pt", papel: "funcionario", empresa_id: 1 }, infos: [], ficheiros: [] }),
    resumoRh,
  },
}));
vi.mock("@/lib/resumoPdf", () => ({ gerarResumoPdf: gerar }));
vi.mock("./JanelaFormulario", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function aberto() {
  render(<FichaRhPainel userId={7} onFechar={() => {}} />);
  const b = await screen.findByRole("button", { name: "Exportar resumo (PDF)" });
  await waitFor(() => expect((b as HTMLButtonElement).disabled).toBe(false));
  return b;
}

describe("Exportar resumo", () => {
  it("chama a API e o gerador", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    resumoRh.mockResolvedValue({ pessoa: { nome: "Rui" } });
    gerar.mockResolvedValue({ nome: "resumo.pdf", blob: new Blob(["x"]) });
    fireEvent.click(await aberto());
    await waitFor(() => expect(gerar).toHaveBeenCalledWith({ pessoa: { nome: "Rui" } }));
    expect(resumoRh).toHaveBeenCalledWith(7);
  });
  it("mostra erro legível e volta a ativar o botão", async () => {
    resumoRh.mockRejectedValue(new ApiError(403, ""));
    fireEvent.click(await aberto());
    expect((await screen.findByRole("alert")).textContent).toContain("Não tem permissão");
    await waitFor(() => expect((screen.getByRole("button", { name: "Exportar resumo (PDF)" }) as HTMLButtonElement).disabled).toBe(false));
    expect(gerar).not.toHaveBeenCalled();
  });
});

describe("Cabeçalho da ficha", () => {
  it("mostra o ID da pessoa", async () => {
    await aberto();
    expect(screen.getByTestId("conta-id").textContent).toBe("ID 7");
  });
});
