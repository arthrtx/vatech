"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Agenda from "@/components/Agenda";
import { api, mensagemDeErro, type Pedido } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { erro as erroCls } from "@/components/ui";

function Conteudo() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    let vivo = true;
    api
      .pedidos()
      .then((r) => vivo && setPedidos(r))
      .catch((e) => vivo && setErro(mensagemDeErro(e)))
      .finally(() => vivo && setACarregar(false));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <Agenda pedidos={pedidos} admin={user?.papel === "admin"} nomeProprio={user?.nome} aCarregar={aCarregar} comErro={erro !== null} />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <AppShell>
      <Conteudo />
    </AppShell>
  );
}
