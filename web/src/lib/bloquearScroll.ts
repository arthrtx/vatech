import { useEffect } from "react";

/** Com `ativo`, a página de fundo não rola (só a janela por cima). Repõe o valor anterior ao fechar. */
export function useBloquearScroll(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const html = document.documentElement;
    const body = document.body;
    const antes = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = antes.html;
      body.style.overflow = antes.body;
    };
  }, [ativo]);
}
