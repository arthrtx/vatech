import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConvitePage from "./page";
import { ApiError, api } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ token: "abc" }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { convite: vi.fn(), aceitarConvite: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Convite", () => {
  it("token inválido mostra mensagem clara", async () => {
    vi.mocked(api.convite).mockRejectedValue(new ApiError(404, "x", undefined));
    render(<ConvitePage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/inválido, expirou ou foi revogado/);
  });

  it("mostra nome e email só de leitura e aceita o convite", async () => {
    vi.mocked(api.convite).mockResolvedValue({ nome: "Ana", email: "ana@x.pt" });
    vi.mocked(api.aceitarConvite).mockResolvedValue("ok");
    render(<ConvitePage />);
    const email = (await screen.findByLabelText("Email")) as HTMLInputElement;
    expect(email.readOnly).toBe(true);
    expect(email.value).toBe("ana@x.pt");
    fireEvent.change(screen.getByLabelText("Palavra-passe"), { target: { value: "segredo123" } });
    fireEvent.change(screen.getByLabelText("Confirmar palavra-passe"), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByLabelText(/Li e aceito/));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Conta criada. Aguarde a autorização do administrador."),
    );
    expect(api.aceitarConvite).toHaveBeenCalledWith("abc", {
      password: "segredo123",
      password_confirmation: "segredo123",
      aceita_termos: true,
    });
    expect(screen.getByRole("link", { name: "Ir para o login" }).getAttribute("href")).toBe("/login");
  });

  it("mostra o texto do convite no topo do formulário", async () => {
    vi.mocked(api.convite).mockResolvedValue({ nome: "Ana", email: "ana@x.pt", texto: "Bem-vinda à equipa." });
    render(<ConvitePage />);
    expect((await screen.findByText("Bem-vinda à equipa.")).textContent).toBe("Bem-vinda à equipa.");
  });

  it("sem texto no convite não mostra o bloco", async () => {
    vi.mocked(api.convite).mockResolvedValue({ nome: "Ana", email: "ana@x.pt" });
    render(<ConvitePage />);
    await screen.findByLabelText("Email");
    expect(screen.queryByTestId("texto-convite")).toBeNull();
  });
});
