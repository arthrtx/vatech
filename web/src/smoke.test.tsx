import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function Ola({ nome }: { nome: string }) {
  return <p>Ola, {nome}</p>;
}

describe("fumo", () => {
  it("renderiza um componente trivial", () => {
    render(<Ola nome="vatech" />);
    expect(screen.getByText("Ola, vatech")).toBeTruthy();
  });
});
