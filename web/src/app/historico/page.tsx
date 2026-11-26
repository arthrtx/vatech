"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import CampoBusca from "@/components/CampoBusca";
import { botaoPerigo, botaoSec, erro as erroCls, vidro } from "@/components/ui";
import { api, mensagemDeErro, type PaginaHistorico, type TipoRegisto } from "@/lib/api";
import { useBloquearScroll } from "@/lib/bloquearScroll";

const TIPOS: { valor: TipoRegisto | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "convite", rotulo: "Convites" },
  { valor: "pedido", rotulo: "Pedidos" },
  { valor: "conta", rotulo: "Contas" },
  { valor: "rh", rotulo: "RH" },
  { valor: "estagio", rotulo: "Estágios" },
  { valor: "ponte", rotulo: "Pontes" },
  { valor: "presenca", rotulo: "Presenças" },
  { valor: "definicoes", rotulo: "Definições" },
  { valor: "sessao", rotulo: "Sessões" },
];
const ROTULO_TIPO = new Map(TIPOS.map((t) => [t.valor, t.rotulo]));

const formatoData = new Intl.DateTimeFormat("pt", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ConfirmarApagar({ aApagar, erro, onCancelar, onConfirmar }: { aApagar: boolean; erro: string | null; onCancelar: () => void; onConfirmar: () => void }) {
  useBloquearScroll(true);
  const caixa = useRef<HTMLDivElement>(null);
  // Lido no render, antes do autoFocus: é o botão que abriu a caixa, para onde o foco volta ao fechar.
  const [gatilho] = useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));
  useEffect(() => () => gatilho?.focus(), [gatilho]);
  // Tab e Shift+Tab ciclam entre os botões da caixa.
  const prender = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const botoes = Array.from(caixa.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (botoes.length === 0) return;
    const primeiro = botoes[0];
    const ultimo = botoes[botoes.length - 1];
    const dentro = caixa.current?.contains(document.activeElement);
    if (!dentro || (e.shiftKey && document.activeElement === primeiro)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !aApagar && onCancelar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aApagar, onCancelar]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-barra/40 p-4" onClick={() => !aApagar && onCancelar()}>
      <div
        ref={caixa}
        onKeyDown={prender}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="apagar-titulo"
        aria-describedby="apagar-texto"
        className="w-full max-w-sm rounded-cartao border border-linha bg-painel p-6 shadow-suave"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="apagar-titulo" className="text-xl font-bold tracking-tight">
          Apagar histórico?
        </h2>
        <p id="apagar-texto" className="mt-2 text-sm text-texto-suave">
          Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.
        </p>
        {erro && (
          <p role="alert" className={`${erroCls} mt-3`}>
            {erro}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" autoFocus onClick={onCancelar} disabled={aApagar} className={botaoSec}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={aApagar} className={botaoPerigo}>
            Apagar histórico
          </button>
        </div>
      </div>
    </div>
  );
}

function Conteudo() {
  const [tipo, setTipo] = useState<TipoRegisto | "todos">("todos");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [dados, setDados] = useState<PaginaHistorico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [aApagar, setAApagar] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Pesquisa com atraso curto para não pedir a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(texto.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento de dados remotos
    setErro(null);
    api.historico({ tipo: tipo === "todos" ? undefined : tipo, q: q || undefined, pagina }).then(
      (r) => ativo && setDados(r),
      (e) => ativo && setErro(mensagemDeErro(e)),
    );
    return () => {
      ativo = false;
    };
  }, [tipo, q, pagina, versao]);

  const fechar = useCallback(() => {
    setConfirmar(false);
    setErroApagar(null);
  }, []);

  async function apagar() {
    setAApagar(true);
    setErroApagar(null);
    try {
      const { apagados } = await api.apagarHistorico();
      setConfirmar(false);
      setPagina(1);
      setVersao((v) => v + 1);
      setAviso(`Histórico apagado (${apagados === 1 ? "1 registo" : `${apagados} registos`})`);
    } catch (e) {
      setErroApagar(mensagemDeErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const total = dados?.meta.total ?? 0;
  const ultima = dados?.meta.ultima_pagina ?? 1;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="titulo-bento">Histórico</h1>
          {dados && <p className="mt-1 text-sm text-texto-suave">{total === 1 ? "1 registo" : `${total} registos`}</p>}
        </div>
        <button
          type="button"
          className={botaoPerigo}
          aria-haspopup="dialog"
          onClick={() => {
            setAviso(null);
            setConfirmar(true);
          }}
        >
          Apagar histórico
        </button>
      </header>
      {aviso && (
        <p role="status" className="rounded-controlo border border-linha-forte bg-primaria-suave px-3 py-2 text-sm text-texto">
          {aviso}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
          {TIPOS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={tipo === f.valor}
              onClick={() => {
                setTipo(f.valor);
                setPagina(1);
              }}
              className={`min-h-9 rounded-full border px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria ${
                tipo === f.valor
                  ? "border-primaria bg-primaria text-white"
                  : "border-linha-forte bg-painel text-texto hover:bg-primaria-suave"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <CampoBusca id="historico-busca" rotulo="Pesquisar no histórico" valor={texto} onChange={setTexto} placeholder="Pesquisar no histórico" />
      </div>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {dados === null && !erro && (
        <ul aria-busy="true" aria-label="A carregar histórico" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-barra bg-trilho" />
          ))}
        </ul>
      )}
      {dados && dados.data.length === 0 && (
        <p className="rounded-cartao border border-dashed border-linha-forte p-6 text-center text-texto-suave">
          Nenhum registo encontrado.
        </p>
      )}
      {dados && dados.data.length > 0 && (
        <ul aria-label="Registo de atividade" className="flex flex-col gap-2">
          {dados.data.map((r) => (
            <li key={r.id} className={`${vidro} flex min-w-0 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4`}>
              <span className="w-fit shrink-0 rounded-full bg-primaria-suave px-3 py-0.5 text-xs font-semibold text-texto sm:w-24 sm:text-center">
                {ROTULO_TIPO.get(r.tipo) ?? r.tipo}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{r.descricao}</p>
                {r.actor && <p className="text-xs text-texto-suave">Por {r.actor.nome}</p>}
              </div>
              <time dateTime={r.criado_em} className="shrink-0 text-xs tabular-nums text-texto-suave">
                {formatoData.format(new Date(r.criado_em))}
              </time>
            </li>
          ))}
        </ul>
      )}
      {dados && ultima > 1 && (
        <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className={botaoSec} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </button>
          <p className="text-sm text-texto-suave">
            Página {dados.meta.pagina_atual} de {ultima}
          </p>
          <button type="button" className={botaoSec} disabled={pagina >= ultima} onClick={() => setPagina((p) => p + 1)}>
            Seguinte
          </button>
        </nav>
      )}
      {confirmar && <ConfirmarApagar aApagar={aApagar} erro={erroApagar} onCancelar={fechar} onConfirmar={apagar} />}
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <AppShell soAdmin>
      <Conteudo />
    </AppShell>
  );
}
