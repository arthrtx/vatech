import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useBloquearScroll } from "./bloquearScroll";

function Janela({ ativo }: { ativo: boolean }) {
  useBloquearScroll(ativo);
  return null;
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
});

describe("useBloquearScroll", () => {
  it("bloqueia a página enquanto está ativo e repõe ao fechar", () => {
    const { rerender, unmount } = render(<Janela ativo={false} />);
    expect(document.body.style.overflow).toBe("");
    rerender(<Janela ativo />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");
    rerender(<Janela ativo={false} />);
    expect(document.body.style.overflow).toBe("");
    rerender(<Janela ativo />);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
