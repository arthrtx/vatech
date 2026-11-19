import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAVE_TEMA, definirTema, lerTema, temaResolvido } from "./tema";

function sistema(escuro: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: escuro && q.includes("dark"), addEventListener() {}, removeEventListener() {} }));
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.tema;
});

describe("tema", () => {
  it("segue o sistema por defeito", () => {
    sistema(true);
    expect(lerTema()).toBe("sistema");
    expect(temaResolvido()).toBe("escuro");
    sistema(false);
    expect(temaResolvido()).toBe("claro");
  });

  it("guarda a escolha e aplica-a ao documento", () => {
    sistema(false);
    definirTema("escuro");
    expect(localStorage.getItem(CHAVE_TEMA)).toBe("escuro");
    expect(document.documentElement.dataset.tema).toBe("escuro");
    definirTema("sistema");
    expect(localStorage.getItem(CHAVE_TEMA)).toBeNull();
    expect(document.documentElement.dataset.tema).toBe("claro");
  });
});
