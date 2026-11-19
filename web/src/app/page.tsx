"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ListaPedidos from "@/components/ListaPedidos";
import PedidoForm from "@/components/PedidoForm";
import PedidosAdmin from "@/components/PedidosAdmin";
import { api, mensagemDeErro, type Pedido } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { erro as erroCls } from "@/components/ui";

function Conteudo() {
  const { user } = useAuth();
  const admin = user?.papel === "admin";
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Pedido | null>(null);

  const carregar = useCallback(async () => {
    try {
      setPedidos(await api.pedidos());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial de dados remotos
    carregar();
  }, [carregar]);

  // Pedidos novos de outros utilizadores: atualiza de 15 em 15 s e ao voltar ao separador.
  useEffect(() => {
    const t = setInterval(carregar, 15000);
    const aoVoltar = () => document.visibilityState === "visible" && carregar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  async function decidir(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      setErro(mensagemDeErro(e));
      return;
    }
    await carregar();
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{admin ? "Pedidos" : "Os meus pedidos"}</h1>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {admin ? (
        <PedidosAdmin
          pedidos={pedidos}
          onAprovar={(id) => decidir(() => api.aprovar(id))}
          onRecusar={(id, motivo) => decidir(() => api.recusar(id, motivo))}
        />
      ) : (
        <ListaPedidos
          pedidos={pedidos}
          formulario={
            editando ? (
              <PedidoForm
                key={editando.id}
                pedido={editando}
                onCriado={async () => {
                  setEditando(null);
                  await carregar();
                }}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <PedidoForm onCriado={carregar} />
            )
          }
          onEditar={(p) => setEditando(p)}
          onApagar={async (p) => {
            if (editando?.id === p.id) setEditando(null);
            try {
              await api.apagarPedido(p.id);
              // Sai da lista já; a atualização periódica confirma com o servidor.
              setPedidos((ps) => ps.filter((x) => x.id !== p.id));
            } catch (e) {
              setErro(mensagemDeErro(e));
            }
          }}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Conteudo />
    </AppShell>
  );
}
