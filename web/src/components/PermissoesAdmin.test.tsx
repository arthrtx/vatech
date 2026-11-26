import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PermissoesAdmin from "./PermissoesAdmin";
import { ApiError, api } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { getPermissoes: vi.fn(), putPermissoes: vi.fn() },
}));

const dados = {
  catalogo: [
    { chave: "pedir_ferias", rotulo: "Pedir férias", grupo: "dia_a_dia" as const },
    { chave: "aprovar_pedidos", rotulo: "Aprovar pedidos", grupo: "gestao" as const },
  ],
  papeis: {
    funcionario: { pedir_ferias: true, aprovar_pedidos: false },
    estagiario: { pedir_ferias: false, aprovar_pedidos: false },
  },
};

beforeEach(() => {
  vi.mocked(api.getPermissoes).mockResolvedValue(dados);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PermissoesAdmin", () => {
  it("mostra a matriz agrupada com o estado vindo do servidor", async () => {
    render(<PermissoesAdmin />);
    expect(await screen.findByText("Dia a dia")).toBeTruthy();
    expect(screen.getByText("Gestão")).toBeTruthy();
    expect((screen.getByLabelText("Pedir férias: Funcionário") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Pedir férias: Estagiário") as HTMLInputElement).checked).toBe(false);
  });

  it("Guardar só activa com alterações e envia a matriz completa", async () => {
    vi.mocked(api.putPermissoes).mockResolvedValue({ ...dados, papeis: { ...dados.papeis, estagiario: { pedir_ferias: true, aprovar_pedidos: false } } });
    render(<PermissoesAdmin />);
    const guardar = (await screen.findByRole("button", { name: "Guardar" })) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Pedir férias: Estagiário"));
    expect(guardar.disabled).toBe(false);
    fireEvent.click(guardar);
    await waitFor(() =>
      expect(api.putPermissoes).toHaveBeenCalledWith({
        funcionario: { pedir_ferias: true, aprovar_pedidos: false },
        estagiario: { pedir_ferias: true, aprovar_pedidos: false },
      }),
    );
    expect((await screen.findByRole("status")).textContent).toBe("Permissões guardadas.");
  });

  it("mostra o erro do servidor ao guardar sem perder as alterações", async () => {
    vi.mocked(api.putPermissoes).mockRejectedValue(new ApiError(403, "Só o administrador pode alterar."));
    render(<PermissoesAdmin />);
    fireEvent.click(await screen.findByLabelText("Aprovar pedidos: Funcionário"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Só o administrador pode alterar.");
    expect((screen.getByLabelText("Aprovar pedidos: Funcionário") as HTMLInputElement).checked).toBe(true);
  });

  it("mostra o erro de carga sem crashar", async () => {
    vi.mocked(api.getPermissoes).mockRejectedValue(new ApiError(403, ""));
    render(<PermissoesAdmin />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não tem permissão");
  });
});
