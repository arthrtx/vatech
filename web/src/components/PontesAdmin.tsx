"use client";

import { useCallback, useEffect, useState } from "react";
import { api, mensagemDeErro, type Ponte } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import CampoData from "./CampoData";
import FormaCanto from "../app/definicoes/FormaCanto";
import { botao, botaoPerigo, botaoSec, erro as erroCls, input, label } from "./ui";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const periodo = (p: { data_inicio: string; data_fim: string }) =>
  p.data_inicio === p.data_fim ? dm(p.data_inicio) : `${dm(p.data_inicio)} a ${dm(p.data_fim)}`;

/** Admin: regista pontes da empresa. Depois de confirmar, toda a equipa vê-as na agenda. */
export default function PontesAdmin({ aoAlterar }: { aoAlterar?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Ponte[]>([]);
  const [nome, setNome] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeIso();

  const carregar = useCallback(async () => {
    try {
      setLista((await api.pontes()).filter((p) => p.data_fim >= hojeIso()));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento de dados remotos ao abrir o painel
    if (aberto) carregar();
  }, [aberto, carregar]);

  const valido = nome.trim().length > 0 && inicio !== "" && fim !== "" && fim >= inicio;

  async function confirmar() {
    setErro(null);
    setAGravar(true);
    try {
      await api.criarPonte({ nome: nome.trim(), data_inicio: inicio, data_fim: fim });
      setNome("");
      setInicio("");
      setFim("");
      setAConfirmar(false);
      await carregar();
      aoAlterar?.();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function remover(p: Ponte) {
    setErro(null);
    try {
      await api.apagarPonte(p.id);
      await carregar();
      aoAlterar?.();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <section aria-label="Pontes" className="flex flex-col gap-3">
      <div>
        <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className={`${botaoSec} min-h-10`}>
          {aberto ? "Fechar pontes" : "Registar ponte"}
        </button>
      </div>
      {aberto && (
        <div className="relative isolate flex max-w-3xl flex-col gap-4 rounded-barra border border-linha bg-painel p-5 md:p-7 has-[[role=dialog]]:z-20">
          <FormaCanto tom="pessego" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Pontes da empresa</h2>
            <p className="text-sm text-texto-suave">
              Depois de confirmar, a ponte aparece no calendário de todos os funcionários e estagiários.
            </p>
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (valido) setAConfirmar(true);
            }}
          >
            <div>
              <label htmlFor="ponte-nome" className={label}>
                Nome
              </label>
              <input
                id="ponte-nome"
                className={input}
                maxLength={80}
                placeholder="Ex.: Ponte do 25 de abril"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setAConfirmar(false);
                }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ponte-de" className={label}>
                  De
                </label>
                <CampoData
                  id="ponte-de"
                  min={hoje}
                  valor={inicio}
                  onChange={(v) => {
                    setInicio(v);
                    if (fim && v > fim) setFim("");
                    setAConfirmar(false);
                  }}
                />
              </div>
              <div>
                <label htmlFor="ponte-ate" className={label}>
                  Até
                </label>
                <CampoData
                  id="ponte-ate"
                  min={inicio && inicio > hoje ? inicio : hoje}
                  valor={fim}
                  onChange={(v) => {
                    setFim(v);
                    setAConfirmar(false);
                  }}
                />
              </div>
            </div>
            {aConfirmar ? (
              <div role="alertdialog" aria-label="Confirmar ponte" className="flex flex-col gap-2 rounded-cartao bg-campo p-4">
                <p className="text-sm">
                  Confirmar <strong>{nome.trim()}</strong> ({periodo({ data_inicio: inicio, data_fim: fim })})? Toda a equipa vai
                  vê-la no calendário.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={aGravar} onClick={confirmar} className={botao}>
                    {aGravar ? "A guardar..." : "Confirmar"}
                  </button>
                  <button type="button" disabled={aGravar} onClick={() => setAConfirmar(false)} className={botaoSec}>
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button type="submit" disabled={!valido} className={botao}>
                  Registar ponte
                </button>
              </div>
            )}
          </form>
          {erro && (
            <p role="alert" className={erroCls}>
              {erro}
            </p>
          )}
          <div>
            <h3 className="mb-2 text-base font-semibold">Registadas</h3>
            {lista.length === 0 ? (
              <p className="text-sm text-texto-suave">Sem pontes por vir.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {lista.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-cartao bg-campo px-4 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{p.nome}</span> <span className="text-texto-suave">· {periodo(p)}</span>
                    </span>
                    <button type="button" onClick={() => remover(p)} className={`${botaoPerigo} min-h-9 px-3 py-1`}>
                      Remover<span className="sr-only"> {p.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
