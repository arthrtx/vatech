import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const porVer = vi.fn();
const vista = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { licencasPorVer: () => porVer(), marcarLicencaVista: (id: number) => vista(id) },
}));

import AvisoLicencas from "./AvisoLicencas";

afterEach(cleanup);

describe("AvisoLicencas", () => {
  it("mostra a licença comunicada e some depois de «Visto»", async () => {
    porVer.mockResolvedValue([
      { id: 7, tipo: "licenca", estado: "aprovado", data_inicio: "2026-12-01", data_fim: "2026-12-03", observacao: "Casamento", user: { id: 3, nome: "Rita" } },
    ]);
    vista.mockResolvedValue({});
    render(<AvisoLicencas />);

    expect(await screen.findByText("Nova licença comunicada")).toBeTruthy();
    expect(screen.getByText("Rita")).toBeTruthy();
    expect(screen.getByText("Casamento")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Visto" }));
    await waitFor(() => expect(screen.queryByText("Nova licença comunicada")).toBeNull());
    expect(vista).toHaveBeenCalledWith(7);
  });

  it("não mostra nada sem licenças por ver", async () => {
    porVer.mockResolvedValue([]);
    const { container } = render(<AvisoLicencas />);
    await waitFor(() => expect(porVer).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
