"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import CampoData from "@/components/CampoData";
import PresencaAtrasada from "@/components/PresencaAtrasada";
import Seletor from "@/components/Seletor";
import { botao, botaoSec, erro as erroCls, label, vidro } from "@/components/ui";
import { api, mensagemDeErro, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { dataPt, horaDe, totalHoras } from "@/lib/presencas";

type Res = { chave: string; linhas: Presenca[]; erro: string | null };

const th = "px-3 py-2 font-medium";
const td = "px-3 py-3 tabular-nums";

function Conteudo() {
  const { user } = useAuth();
  const admin = user?.papel === "admin";
  const [de, setDe] = useState(() => `${hojeIso().slice(0, 8)}01`);
  const [ate, setAte] = useState(() => hojeIso());
  const [userId, setUserId] = useState("");
  const [estagiarios, setEstagiarios] = useState<User[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const [volta, setVolta] = useState(0);
  const [esqueci, setEsqueci] = useState(false);
  const valido = !!de && !!ate && ate >= de;
  const chave = `${de}|${ate}|${userId}|${volta}`;

  useEffect(() => {
    if (!admin) return; // o estagiário recebe 403 na lista de funcionários
    let vivo = true;
    api
      .funcionarios()
      .then((l) => vivo && setEstagiarios(l.filter((u) => u.papel === "estagiario")))
      .catch(() => {}); // sem lista só falta o filtro; as presenças carregam à mesma
    return () => {
      vivo = false;
    };
  }, [admin]);

  useEffect(() => {
    if (!valido) return;
    let vivo = true;
    api
      .presencas(de, ate, admin && userId ? Number(userId) : undefined)
      .then((linhas) => vivo && setRes({ chave, linhas, erro: null }))
      .catch((e) => vivo && setRes({ chave, linhas: [], erro: mensagemDeErro(e) }));
    return () => {
      vivo = false;
    };
  }, [de, ate, userId, valido, chave, admin]);

  const atual = res?.chave === chave ? res : null;
  const aCarregar = valido && !atual;
  const erro = atual?.erro ?? null;
  const linhas = [...(atual?.linhas ?? [])].sort(
    (a, b) => b.data.localeCompare(a.data) || (a.user?.nome ?? "").localeCompare(b.user?.nome ?? ""),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Presenças</h1>
        {!admin && !esqueci && (
          <button type="button" className={`${botao} min-h-10`} onClick={() => setEsqueci(true)}>
            Esqueci de marcar presença
          </button>
        )}
      </div>
      {!admin && esqueci && (
        <PresencaAtrasada
          min={user?.estagio_inicio}
          onCancelar={() => setEsqueci(false)}
          onRegistado={() => {
            setEsqueci(false);
            setVolta((v) => v + 1);
          }}
        />
      )}
      <div className={`${vidro} relative z-20 grid gap-4 p-4 ${admin ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div>
          <label htmlFor="pres_de" className={label}>
            De
          </label>
          <CampoData id="pres_de" valor={de} onChange={setDe} />
        </div>
        <div>
          <label htmlFor="pres_ate" className={label}>
            Até
          </label>
          <CampoData id="pres_ate" valor={ate} min={de || undefined} onChange={setAte} />
        </div>
        {admin && (
          <div>
            <label htmlFor="pres_user" className={label}>
              Estagiário
            </label>
            <Seletor
              id="pres_user"
              valor={userId}
              opcoes={[{ valor: "", rotulo: "Todos" }, ...estagiarios.map((u) => ({ valor: String(u.id), rotulo: u.nome }))]}
              onChange={setUserId}
            />
          </div>
        )}
      </div>
      {!valido && (
        <p role="alert" className={erroCls}>
          Indique um intervalo válido: a data final não pode ser anterior à inicial.
        </p>
      )}
      {erro && (
        <div role="alert" className={`${erroCls} flex flex-col items-start gap-2`}>
          <span>{erro}</span>
          <button type="button" className={`${botaoSec} min-h-10`} onClick={() => setVolta((v) => v + 1)}>
            Tentar de novo
          </button>
        </div>
      )}
      {aCarregar && (
        <p aria-busy="true" className="text-texto-suave">
          A carregar...
        </p>
      )}
      {valido && atual && !erro && linhas.length === 0 && (
        <p className="rounded-controlo border border-dashed border-linha-forte bg-painel/60 p-4 text-sm text-texto-suave">
          Sem presenças neste intervalo.
        </p>
      )}
      {linhas.length > 0 && (
        <div className={`${vidro} overflow-x-auto p-2`}>
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Horas por dia</caption>
            <thead>
              <tr className="text-texto-suave">
                {admin && (
                  <th scope="col" className={th}>
                    Nome
                  </th>
                )}
                <th scope="col" className={th}>
                  Dia
                </th>
                <th scope="col" className={th}>
                  Entrada
                </th>
                <th scope="col" className={th}>
                  Saída
                </th>
                <th scope="col" className={th}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <tr key={p.id} className="border-t border-linha">
                  {admin && <td className="px-3 py-3 font-medium">{p.user?.nome ?? `#${p.user_id}`}</td>}
                  <td className={td}>
                    {dataPt(p.data)}
                    {p.atrasada && (
                      <span className="ml-2 rounded-controlo border border-linha-forte px-2 py-0.5 text-xs text-texto-suave">
                        Atrasada
                      </span>
                    )}
                  </td>
                  <td className={td}>{horaDe(p.entrada)}</td>
                  <td className={td}>{horaDe(p.saida) || "Em curso"}</td>
                  <td className={td}>{totalHoras(p) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PresencasPage() {
  return (
    <AppShell papeis={["admin", "estagiario"]}>
      <Conteudo />
    </AppShell>
  );
}
