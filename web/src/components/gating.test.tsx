import { CHAVES_DIA_A_DIA } from "@/lib/permissoes";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PedidoForm from "./PedidoForm";
import AppShell from "./AppShell";
import type { Papel } from "@/lib/api";

let papel: Papel = "funcionario";
let permissoes: string[] = [];
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 2, nome: "Ana Dias", papel, permissoes }, loading: false, logout: vi.fn() }),
}));
vi.mock("@/lib/tema", () => ({ useTema: () => ({ escuro: false, definir: vi.fn() }) }));
vi.mock("./Notificacoes", () => ({ default: () => null }));
vi.mock("./Pesquisa", () => ({ default: () => null }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { limites: vi.fn().mockResolvedValue({ limites: [], prazo_ferias: "" }) },
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("PedidoForm, gating por permissão", () => {
  it("sem pedir_ferias não oferece Férias", () => {
    permissoes = CHAVES_DIA_A_DIA.filter((c) => c !== "pedir_ferias");
    render(<PedidoForm />);
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    expect(screen.queryByRole("option", { name: "Férias" })).toBeNull();
    expect(screen.getByRole("option", { name: "Ausência" })).toBeTruthy();
  });

  it("sem anexar_documentos e melhorar_texto esconde anexos e melhorar", () => {
    permissoes = CHAVES_DIA_A_DIA.filter((c) => c !== "anexar_documentos" && c !== "melhorar_texto");
    render(<PedidoForm />);
    expect(screen.queryByRole("button", { name: "Melhorar texto" })).toBeNull();
    expect(screen.queryByText(/anexo|ficheiro/i)).toBeNull();
  });

  it("com tudo mostra Melhorar texto", () => {
    permissoes = CHAVES_DIA_A_DIA;
    render(<PedidoForm />);
    expect(screen.getByRole("button", { name: "Melhorar texto" })).toBeTruthy();
  });
});

describe("AppShell, páginas por permissão", () => {
  const temFuncionarios = () => !!screen.getByRole("navigation", { name: "Principal" }).querySelector('a[href="/funcionarios"]');

  it("funcionário sem convidar_pessoas não vê Funcionários", () => {
    papel = "funcionario";
    permissoes = [];
    render(<AppShell>x</AppShell>);
    expect(temFuncionarios()).toBe(false);
  });

  it("funcionário com convidar_pessoas vê Funcionários e entra na página", () => {
    papel = "funcionario";
    permissoes = ["convidar_pessoas"];
    render(
      <AppShell soAdmin permissao="convidar_pessoas">
        x
      </AppShell>,
    );
    expect(temFuncionarios()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("x")).toBeTruthy();
  });

  it("página só-admin continua barrada sem a permissão", () => {
    papel = "funcionario";
    permissoes = ["aprovar_pedidos"];
    render(
      <AppShell soAdmin permissao="convidar_pessoas">
        x
      </AppShell>,
    );
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("x")).toBeNull();
  });
});
