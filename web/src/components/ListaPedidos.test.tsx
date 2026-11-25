import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ListaPedidos from "./ListaPedidos";

afterEach(cleanup);

const form = <p>CAMPOS DO FORMULARIO</p>;

describe("ListaPedidos com formulário em janela", () => {
  it("só mostra o botão Novo pedido; o formulário fica escondido", () => {
    render(<ListaPedidos pedidos={[]} formulario={form} />);
    expect(screen.getByRole("button", { name: "Novo pedido" })).toBeTruthy();
    expect(screen.queryByText("CAMPOS DO FORMULARIO")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o botão pede para abrir", () => {
    const abrir = vi.fn();
    render(<ListaPedidos pedidos={[]} formulario={form} aoAbrirForm={abrir} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo pedido" }));
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it("aberto, mostra o formulário numa janela que fecha com Escape", () => {
    const fechar = vi.fn();
    render(<ListaPedidos pedidos={[]} formulario={form} formAberto aoFecharForm={fechar} />);
    expect(screen.getByRole("dialog").textContent).toContain("CAMPOS DO FORMULARIO");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it("sem formulário não há botão (lista só de leitura)", () => {
    render(<ListaPedidos pedidos={[]} />);
    expect(screen.queryByRole("button", { name: "Novo pedido" })).toBeNull();
  });
});
