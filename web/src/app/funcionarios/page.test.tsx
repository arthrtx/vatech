import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FuncionariosPage from "./page";
import { api } from "@/lib/api";

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { funcionarios: vi.fn() } };
});

afterEach(cleanup);

const mk = (id: number, nome: string, email: string) => ({ id, nome, email, papel: "funcionario" as const, empresa_id: 1 });

describe("Funcionários: busca", () => {
  it("filtra por nome e email, mostra mensagem sem resultados e limpar repõe", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João Álvares", "j@x.pt"), mk(2, "Ana", "ana@y.pt")]);
    render(<FuncionariosPage />);
    await screen.findByText("João Álvares");
    const campo = screen.getByLabelText("Pesquisar funcionários");
    fireEvent.change(campo, { target: { value: "alvares" } });
    expect(screen.queryByText("Ana")).toBeNull();
    fireEvent.change(campo, { target: { value: "ana@y" } });
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.queryByText("João Álvares")).toBeNull();
    fireEvent.change(campo, { target: { value: "zzz" } });
    expect(screen.getByText('Nenhum resultado para "zzz"')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("João Álvares")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(api.funcionarios).toHaveBeenCalledTimes(1);
  });
});
