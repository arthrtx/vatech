import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FuncionarioLinha from "./FuncionarioLinha";
import { ApiError, type User } from "@/lib/api";

afterEach(cleanup);

const user: User = { id: 3, nome: "Rui", email: "rui@x.pt", papel: "funcionario", empresa_id: 1 };

function montar(p: Partial<React.ComponentProps<typeof FuncionarioLinha>> = {}) {
  const props = {
    user,
    onGuardar: vi.fn().mockResolvedValue(undefined),
    onApagar: vi.fn().mockResolvedValue(undefined),
    ...p,
  };
  render(
    <ul>
      <FuncionarioLinha {...props} />
    </ul>,
  );
  return props;
}

describe("FuncionarioLinha", () => {
  it("Editar abre o formulário e Guardar omite password vazia", async () => {
    const p = montar();
    fireEvent.click(screen.getByRole("button", { name: "Editar Rui" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Nome"));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Rui P" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(p.onGuardar).toHaveBeenCalledWith({ nome: "Rui P", email: "rui@x.pt" }));
    await waitFor(() => expect(screen.queryByLabelText("Nome")).toBeNull());
  });

  it("envia password quando preenchida e mostra erro 422 em PT", async () => {
    const onGuardar = vi.fn().mockRejectedValue(new ApiError(422, "m", { email: ["O email já existe."] }));
    montar({ onGuardar });
    fireEvent.click(screen.getByRole("button", { name: "Editar Rui" }));
    fireEvent.change(screen.getByLabelText("Nova palavra-passe (opcional)"), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O email já existe.");
    expect(onGuardar).toHaveBeenCalledWith({ nome: "Rui", email: "rui@x.pt", password: "segredo123" });
  });

  it("Apagar pede confirmação inline, foca Confirmar e só apaga ao confirmar", async () => {
    const p = montar();
    fireEvent.click(screen.getByRole("button", { name: "Apagar Rui" }));
    expect(screen.getByText("Apagar Rui? Os pedidos deixam de aparecer.")).toBeTruthy();
    expect(p.onApagar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(p.onApagar).toHaveBeenCalledOnce());
  });

  it("Cancelar na confirmação não apaga e devolve o foco a Apagar", () => {
    const p = montar();
    fireEvent.click(screen.getByRole("button", { name: "Apagar Rui" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(p.onApagar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apagar Rui" }));
  });
});
