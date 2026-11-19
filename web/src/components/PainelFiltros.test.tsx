import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PainelFiltros from "./PainelFiltros";
import GrupoChips from "./GrupoChips";

afterEach(cleanup);

describe("GrupoChips", () => {
  const opcoes = [
    { valor: "a", rotulo: "A" },
    { valor: "b", rotulo: "B" },
  ];
  it("multi-selecao com aria-pressed", () => {
    const onChange = vi.fn();
    render(<GrupoChips legenda="Tipo" opcoes={opcoes} selecionados={["a"]} onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Tipo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe("PainelFiltros", () => {
  it("alterna o painel, mostra contagem e limpa", () => {
    const onLimpar = vi.fn();
    const { rerender } = render(
      <PainelFiltros ativos={0} total={4} mostrados={4} rotuloItens="pedidos" onLimpar={onLimpar}>
        <p>grupos</p>
      </PainelFiltros>,
    );
    const toggle = screen.getByRole("button", { name: /Filtros \(nenhum ativo\): mostrar/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("status").textContent).toBe("4 de 4 pedidos");
    expect((screen.getByRole("button", { name: "Limpar filtros" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toContain("esconder");

    rerender(
      <PainelFiltros ativos={2} total={4} mostrados={1} rotuloItens="pedidos" onLimpar={onLimpar}>
        <p>grupos</p>
      </PainelFiltros>,
    );
    expect(toggle.textContent).toContain("(2 ativos)");
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onLimpar).toHaveBeenCalledTimes(1);
  });
});
