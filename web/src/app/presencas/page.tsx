"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { temPermissao } from "@/lib/permissoes";
import AppShell from "@/components/AppShell";
import CampoData from "@/components/CampoData";
import HorarioAlmoco from "@/components/HorarioAlmoco";
import FormaCanto from "../definicoes/FormaCanto";
import PresencaAtrasada from "@/components/PresencaAtrasada";
import RegistarOcorrencia from "@/components/RegistarOcorrencia";
import Seletor from "@/components/Seletor";
import { botao, botaoSec, erro as erroCls, label, vidro } from "@/components/ui";
import { api, mensagemDeErro, type Ocorrencia, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { rotuloMotivo, rotuloTipo } from "@/lib/ocorrencias";
import { agruparPorDia, dataPt, duracaoTexto, textoPeriodo } from "@/lib/presencas";

type Res = { chave: string; linhas: Presenca[]; erro: string | null };

const th = "px-3 py-2 font-medium";
const td = "px-3 py-3 tabular-nums";

function Conteudo() {
  const { user } = useAuth();
  // «admin» = vê as presenças de toda a empresa (admin ou permissão concedida).
  const admin = temPermissao(user, "ver_presencas_empresa");
  const podeOcorrencias = temPermissao(user, "registar_ocorrencias");
  const podeMarcar = temPermissao(user, "marcar_presenca");
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
  const linhas = agruparPorDia(atual?.linhas ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-bento">Presenças</h1>
        <div className="flex flex-wrap gap-2">
          {podeOcorrencias && !comunicar && (
            <button type="button" className={`${botaoSec} min-h-10`} onClick={() => setComunicar(true)}>
              Falta ou atraso
            </button>
          )}
          {podeMarcar && !esqueci && (
            <button type="button" className={`${botao} min-h-10`} onClick={() => setEsqueci(true)}>
              Esqueci de marcar presença
            </button>
          )}
        </div>
      </div>
      <section aria-label="Horário de almoço" className={`${vidro} p-4`}>
        <HorarioAlmoco />
      </section>
      {podeOcorrencias && comunicar && (
        <RegistarOcorrencia
          onCancelar={() => setComunicar(false)}
          onRegistado={() => {
            setComunicar(false);
            setVolta((v) => v + 1);
          }}
        />
      )}
      {podeMarcar && esqueci && (
        <PresencaAtrasada
          min={user?.estagio_inicio}
          onCancelar={() => setEsqueci(false)}
          onRegistado={() => {
            setEsqueci(false);
            setVolta((v) => v + 1);
          }}
        />
      )}
      <div className={`${vidro} relative isolate z-20 grid gap-4 p-5 md:p-6 ${admin ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <FormaCanto tom="violeta" />
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
        <p className="rounded-barra border border-dashed border-linha-forte bg-painel p-6 text-sm text-texto-suave">
          Sem presenças neste intervalo.
        </p>
      )}
      {linhas.length > 0 && (
        <div className={`${vidro} overflow-x-auto p-3`}>
          <table className="w-full text-left text-sm">
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
                  Total do dia
                </th>
                <th scope="col" className={th}>
                  Períodos
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((g) => (
                <tr key={g.chave} className="border-t border-linha align-top">
                  {admin && <td className="px-3 py-3 font-medium">{g.user?.nome ?? `#${g.user_id}`}</td>}
                  <td className={td}>{dataPt(g.data)}</td>
                  <td className={`${td} font-medium`}>
                    {duracaoTexto(g.minutos)}
                    {g.emCurso && <span className="block text-xs font-normal text-texto-suave">+ período em curso</span>}
                  </td>
                  <td className={td}>
                    <ul className="flex flex-col gap-1">
                      {g.periodos.map((p) => (
                        <li key={p.id}>
                          {textoPeriodo(p)}
                          {p.atrasada && (
                            <span className="ml-2 rounded-full border border-linha-forte px-2.5 py-0.5 text-xs text-texto-suave">
                              Atrasada
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
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
