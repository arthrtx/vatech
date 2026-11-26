"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";
import { carregar, detetar, guardar, type EstadoNotificacoes } from "@/lib/notificacoes";
import { IconeSino } from "./Icones";

const INTERVALO = 15000;

const hora = (iso: string) => {
  const d = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt", { day: "2-digit", month: "2-digit" }).format(d);
  const h = new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${dia} · ${h}`;
};

/** Sino da barra de topo: avisa de pedidos novos (admin) ou decididos (funcionário), com histórico. */
export default function Notificacoes({ user, className }: { user: Pick<User, "id" | "papel">; className: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoNotificacoes>({ snapshot: null, itens: [] });
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const atual = useRef(estado);
  const pronto = useRef(false);

  const aplicar = useCallback(
    (novo: EstadoNotificacoes) => {
      atual.current = novo;
      setEstado(novo);
      guardar(user.id, novo);
    },
    [user.id],
  );

  useEffect(() => {
    let vivo = true;
    atual.current = carregar(user.id);
    setEstado(atual.current);
    pronto.current = true;

    async function verificar() {
      try {
        const pedidos = await api.pedidos();
        if (vivo && pronto.current) aplicar(detetar(atual.current, pedidos, user));
      } catch {
        // sem rede: tenta na próxima volta
      }
    }
    verificar();
    const t = setInterval(verificar, INTERVALO);
    const aoVoltar = () => document.visibilityState === "visible" && verificar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [user, aplicar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const naoLidas = estado.itens.filter((n) => !n.lida).length;

  function abrirNotificacao(id: string, href: string) {
    aplicar({ ...atual.current, itens: atual.current.itens.map((n) => (n.id === id ? { ...n, lida: true } : n)) });
    setAberto(false);
    router.push(href);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} por ler` : "Notificações"}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        title="Notificações"
        onClick={() => setAberto((a) => !a)}
        className={className}
      >
        <IconeSino className="h-4 w-4" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1 text-2xs font-semibold leading-none text-on-accent"
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full z-[var(--ds-z-dropdown)] mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border border-line bg-surface-1 p-3 shadow-float"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text-1">Notificações</p>
            <button
              type="button"
              disabled={estado.itens.length === 0}
              onClick={() => aplicar({ ...atual.current, itens: [] })}
              className="min-h-touch rounded-md px-3 text-sm font-medium text-text-1 hover:bg-wash disabled:opacity-40"
            >
              Limpar histórico
            </button>
          </div>
          {estado.itens.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-text-2">Sem notificações.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto scroll-fino">
              {estado.itens.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => abrirNotificacao(n.id, n.href)}
                    className={`flex min-h-touch w-full items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-wash ${n.lida ? "" : "bg-surface-2"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-accent"}`}
                    />
                    <span className="min-w-0">
                      <span className={`block break-words text-sm ${n.lida ? "text-text-2" : "font-medium text-text-1"}`}>
                        {n.texto}
                        {!n.lida && <span className="sr-only"> (por ler)</span>}
                      </span>
                      <span className="block text-xs text-text-3">{hora(n.quando)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
