import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AppShell from "./AppShell";
import type { Papel } from "@/lib/api";

let papel: Papel = "admin";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana Dias", papel }, loading: false, logout: vi.fn() }) }));
vi.mock("@/lib/tema", () => ({ useTema: () => ({ escuro: false, definir: vi.fn() }) }));
vi.mock("./Notificacoes", () => ({ default: () => null }));
vi.mock("./Pesquisa", () => ({ default: () => null }));
vi.mock("./FundoQuente", () => ({ default: () => null, classeFundoQuente: "" }));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

const menu = () => screen.getByRole("navigation", { name: "Principal" });

describe("AppShell, menu por papel", () => {
  it.each([
    ["admin", true],
    ["estagiario", true],
    ["funcionario", false],
  ] as const)("%s: Presenças no menu = %s", (p, tem) => {
    papel = p;
    render(<AppShell>x</AppShell>);
    expect(!!menu().querySelector('a[href="/presencas"]')).toBe(tem);
  });

  it("papeis redireciona quem não tem acesso", () => {
    papel = "funcionario";
    render(<AppShell papeis={["admin", "estagiario"]}>x</AppShell>);
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("x")).toBeNull();
  });

  it("papeis deixa entrar o estagiário", () => {
    papel = "estagiario";
    render(<AppShell papeis={["admin", "estagiario"]}>x</AppShell>);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("x")).toBeTruthy();
  });
});
