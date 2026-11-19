"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Agenda from "@/components/Agenda";
import { api, mensagemDeErro, type Aniversario, type PedidoAgenda, type Presenca } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { estagiosDe, hojeIso, intervaloDoMes, mesDe, type Estagio, type Mes } from "@/lib/agenda";
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

  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    api
      .agenda(de, ate)
      .then((pedidos) => vivo && setRes({ chave, pedidos, erro: null }))
      .catch((e) => vivo && setRes({ chave, pedidos: [], erro: mensagemDeErro(e) }));
    return () => {
      vivo = false;
    };
  }, [de, ate, chave, versao]);

  // Aniversários do intervalo; se falhar, a agenda mostra-se sem eles.
  const [anivs, setAnivs] = useState<{ chave: string; lista: Aniversario[] } | null>(null);
  useEffect(() => {
    let vivo = true;
    api
      .aniversarios(de, ate)
      .then((lista) => vivo && setAnivs({ chave, lista }))
      .catch(() => vivo && setAnivs({ chave, lista: [] }));
    return () => {
      vivo = false;
    };
  }, [de, ate, chave, versao]);
  const aniversarios = anivs?.chave === chave ? anivs.lista : [];

  // Presenças do intervalo (a API devolve só as próprias a quem não é admin).
  const [pres, setPres] = useState<{ chave: string; lista: Presenca[]; erro: boolean } | null>(null);
  const papel = user?.papel;
  const veTodasPresencas = papel === "admin" || papel === "estagiario";
  useEffect(() => {
    // O funcionário não tem presenças (a API responde 403): nem se pede.
    if (!veTodasPresencas) return;
    let vivo = true;
    api
      .presencas(de, ate)
      .then((lista) => vivo && setPres({ chave, lista, erro: false }))
      .catch(() => vivo && setPres({ chave, lista: [], erro: true }));
    return () => {
      vivo = false;
    };
  }, [de, ate, chave, veTodasPresencas]);
  const presencas = pres?.chave === chave ? pres.lista : [];
  const erroPresencas = pres?.chave === chave && pres.erro;

  // Períodos de estágio: o próprio estagiário, ou todos os estagiários para o admin.
  const admin = user?.papel === "admin";
  const [equipa, setEquipa] = useState<Estagio[]>([]);
  useEffect(() => {
    if (!admin) return;
    let vivo = true;
    api
      .funcionarios()
      .then((l) => vivo && setEquipa(estagiosDe(l)))
      .catch(() => vivo && setEquipa([]));
    return () => {
      vivo = false;
    };
  }, [admin]);
  const estagios: Estagio[] = admin ? equipa : user ? estagiosDe([user]) : [];

  // A carregar enquanto a resposta guardada nao for do intervalo pedido.
  const aCarregar = res?.chave !== chave;
  const erro = aCarregar ? null : res.erro;
  const pedidos = res?.pedidos ?? [];

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <h1 className="sr-only">Agenda</h1>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {erroPresencas && (
        <p role="alert" className={erroCls}>
          Não foi possível carregar as presenças.
        </p>
      )}
      <Agenda
        presencas={presencas}
        estagios={estagios}
        aniversarios={aniversarios}
        pedidos={pedidos}
        admin={admin}
        nomeProprio={user?.nome}
        aCarregar={aCarregar}
        comErro={erro !== null}
        aoMudarMes={aoMudarMes}
        podeCriar={!!user && user.papel !== "admin"}
        aoCriar={recarregar}
      />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <AppShell ecraInteiro>
      <Conteudo />
    </AppShell>
  );
}
