import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AnexosDoPedido from "./AnexosDoPedido";
import { api, type Anexo } from "@/lib/api";

const imagem: Anexo = { id: 1, nome: "foto.png", mime: "image/png", tamanho: 2048 };
const pdf: Anexo = { id: 2, nome: "justificativo.pdf", mime: "application/pdf", tamanho: 4096 };
const word: Anexo = { id: 3, nome: "carta.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", tamanho: 9000 };

beforeEach(() => {
  vi.spyOn(api, "urlDoAnexo").mockResolvedValue("blob:teste");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AnexosDoPedido", () => {
  it("não mostra nada sem anexos", () => {
    const { container } = render(<AnexosDoPedido pedidoId={7} anexos={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("Ver mostra a imagem num diálogo sem descarregar", async () => {
    render(<AnexosDoPedido pedidoId={7} anexos={[imagem]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto.png" }));
    const dialogo = await screen.findByRole("dialog", { name: "foto.png" });
    expect(dialogo.querySelector("img")?.getAttribute("src")).toBe("blob:teste");
    expect(api.urlDoAnexo).toHaveBeenCalledWith(7, 1);
  });

  it("PDF aparece numa moldura e Fechar remove o diálogo", async () => {
    render(<AnexosDoPedido pedidoId={7} anexos={[pdf]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver justificativo.pdf" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.querySelector("iframe")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:teste");
  });

  it("Word não tem pré-visualização e explica porquê", async () => {
    render(<AnexosDoPedido pedidoId={7} anexos={[word]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver carta.docx" }));
    expect(await screen.findByText(/não tem pré-visualização/)).toBeTruthy();
  });

  it("Escape fecha a pré-visualização", async () => {
    render(<AnexosDoPedido pedidoId={7} anexos={[imagem]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto.png" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.keyDown(dialogo, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Descarregar guarda o ficheiro com o nome original", async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<AnexosDoPedido pedidoId={7} anexos={[pdf]} />);
    fireEvent.click(screen.getByRole("button", { name: "Descarregar justificativo.pdf" }));
    await waitFor(() => expect(clique).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o erro quando o ficheiro não abre", async () => {
    vi.spyOn(api, "urlDoAnexo").mockRejectedValue(new Error("falhou"));
    render(<AnexosDoPedido pedidoId={7} anexos={[imagem]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto.png" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
