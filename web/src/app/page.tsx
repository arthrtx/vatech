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

  const carregar = useCallback(async () => {
    try {
      setPedidos(await api.pedidos(admin ? "pendente" : undefined));
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [admin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial de dados remotos
    carregar();
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
      <h1 className="text-2xl font-semibold">{admin ? "Pedidos pendentes" : "Os meus pedidos"}</h1>
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
        <>
          <PedidoForm onCriado={carregar} />
          <ListaPedidos pedidos={pedidos} />
        </>
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
