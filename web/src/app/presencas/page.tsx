"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import CampoData from "@/components/CampoData";
import HorarioAlmoco from "@/components/HorarioAlmoco";
import PresencaAtrasada from "@/components/PresencaAtrasada";
import RegistarOcorrencia from "@/components/RegistarOcorrencia";
import Seletor from "@/components/Seletor";
import { botao, botaoSec, erro as erroCls, label, vidro } from "@/components/ui";
import { api, mensagemDeErro, type Ocorrencia, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { rotuloMotivo, rotuloTipo } from "@/lib/ocorrencias";
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
  const [pessoas, setPessoas] = useState<User[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const [volta, setVolta] = useState(0);
  const [esqueci, setEsqueci] = useState(false);
  const [comunicar, setComunicar] = useState(false);
  const [ocorr, setOcorr] = useState<{ chave: string; lista: Ocorrencia[] } | null>(null);
  const valido = !!de && !!ate && ate >= de;
  const chave = `${de}|${ate}|${userId}|${volta}`;

  useEffect(() => {
    if (!admin) return; // quem não é admin recebe 403 na lista de funcionários
    let vivo = true;
    api
      .funcionarios()
      .then((l) => vivo && setPessoas(l))
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

  useEffect(() => {
    if (!valido) return;
    let vivo = true;
    api
      .ocorrencias(de, ate, admin && userId ? Number(userId) : undefined)
      .then((lista) => vivo && setOcorr({ chave, lista }))
      .catch(() => vivo && setOcorr({ chave, lista: [] })); // sem esta lista as horas aparecem à mesma
    return () => {
      vivo = false;
    };
  }, [de, ate, userId, valido, chave, admin]);

  const ocorrencias = ocorr?.chave === chave ? ocorr.lista : [];
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
        <div className="flex flex-wrap gap-2">
          {!comunicar && (
            <button type="button" className={`${botaoSec} min-h-10`} onClick={() => setComunicar(true)}>
              Falta ou atraso
            </button>
          )}
          {!esqueci && (
            <button type="button" className={`${botao} min-h-10`} onClick={() => setEsqueci(true)}>
              Esqueci de marcar presença
            </button>
          )}
        </div>
      </div>
      <section aria-label="Horário de almoço" className={`${vidro} p-4`}>
        <HorarioAlmoco onGuardado={() => setVolta((v) => v + 1)} />
      </section>
      {comunicar && (
        <RegistarOcorrencia
          onCancelar={() => setComunicar(false)}
          onRegistado={() => {
            setComunicar(false);
            setVolta((v) => v + 1);
          }}
        />
      )}
      {esqueci && (
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
              Pessoa
            </label>
            <Seletor
              id="pres_user"
              valor={userId}
              opcoes={[{ valor: "", rotulo: "Todos" }, ...pessoas.map((u) => ({ valor: String(u.id), rotulo: u.nome }))]}
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
      {ocorrencias.length > 0 && (
        <section aria-labelledby="ocor_lista" className={`${vidro} p-4`}>
          <h2 id="ocor_lista" className="mb-3 text-lg font-semibold">
            Faltas e atrasos
          </h2>
          <ul className="flex flex-col gap-3">
            {ocorrencias.map((o) => (
              <li key={o.id} className="border-t border-linha pt-3 first:border-t-0 first:pt-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular-nums">{dataPt(o.data)}</span>
                  {admin && <span className="font-medium">{o.user?.nome ?? `#${o.user_id}`}</span>}
                  <span className="rounded-controlo border border-linha-forte px-2 py-0.5 text-xs">{rotuloTipo(o.tipo)}</span>
                  <span className="text-texto-suave">Motivo: {rotuloMotivo(o.motivo)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{o.descricao}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function PresencasPage() {
  return (
    <AppShell papeis={["admin", "funcionario", "estagiario"]}>
      <Conteudo />
    </AppShell>
  );
}
