"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Agenda from "@/components/Agenda";
import { api, mensagemDeErro, type PedidoAgenda } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hojeIso, intervaloDoMes, mesDe, type Mes } from "@/lib/agenda";
import { erro as erroCls } from "@/components/ui";

function Conteudo() {
  const { user } = useAuth();
  const [mes, setMes] = useState<Mes>(() => mesDe(hojeIso()));
  const [res, setRes] = useState<{ chave: string; pedidos: PedidoAgenda[]; erro: string | null } | null>(null);
  const aoMudarMes = useCallback(
    (m: Mes) => setMes((a) => (a.ano === m.ano && a.mes === m.mes ? a : m)),
    [],
  );
  const { de, ate } = intervaloDoMes(mes);
  const chave = `${de}|${ate}`;

  useEffect(() => {
    let vivo = true;
    api
      .agenda(de, ate)
      .then((pedidos) => vivo && setRes({ chave, pedidos, erro: null }))
      .catch((e) => vivo && setRes({ chave, pedidos: [], erro: mensagemDeErro(e) }));
    return () => {
      vivo = false;
    };
  }, [de, ate, chave]);

  // A carregar enquanto a resposta guardada nao for do intervalo pedido.
  const aCarregar = res?.chave !== chave;
  const erro = aCarregar ? null : res.erro;
  const pedidos = res?.pedidos ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <Agenda
        pedidos={pedidos}
        admin={user?.papel === "admin"}
        nomeProprio={user?.nome}
        aCarregar={aCarregar}
        comErro={erro !== null}
        aoMudarMes={aoMudarMes}
      />
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
