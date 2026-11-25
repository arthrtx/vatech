"use client";

import { useEffect, useRef, useState } from "react";
import { api, mensagemDeErro, type FeriasResumo, type Pedido, type Ponte, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { maisDias } from "@/lib/dashboard";
import { estados, formatarData, papeis, tipos } from "@/lib/rotulos";
import Avatar from "./Avatar";
import { botaoSec, erro as erroCls } from "./ui";

const corEstado: Record<Pedido["estado"], string> = {
  pendente: "bg-violeta/25",
  aprovado: "bg-positivo/25",
  recusado: "bg-rosa/20",
  cancelado: "bg-texto-suave/20",
};

const hora = (h: string | null) => (h ? h.slice(0, 5) : "-");

/** Janela com a vista geral de uma pessoa: dados, férias, pedidos, próximas pontes e, nos estagiários, presenças. */
export default function VistaFuncionario({
  user,
  ferias,
  onFechar,
}: {
  user: User;
  ferias?: FeriasResumo;
  onFechar: () => void;
}) {
  const [hoje] = useState(() => hojeIso());
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [presencas, setPresencas] = useState<Presenca[] | null>(null);
  const [pontes, setPontes] = useState<Ponte[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const estagiario = user.papel === "estagiario";

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      antes?.focus();
    };
  }, [onFechar]);

  useEffect(() => {
    let ativo = true;
    api.pedidos().then(
      (todos) => ativo && setPedidos(todos.filter((p) => p.user_id === user.id)),
      (e) => ativo && setErro(mensagemDeErro(e)),
    );
    api.pontes(hoje, maisDias(hoje, 365)).then(
      (r) => ativo && setPontes(r.filter((p) => p.data_fim >= hoje).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))),
      () => ativo && setPontes([]),
    );
    if (estagiario) {
      api.presencas(maisDias(hoje, -30), hoje, user.id).then(
        (r) => ativo && setPresencas(r),
        (e) => ativo && setErro(mensagemDeErro(e)),
      );
    }
    return () => {
      ativo = false;
    };
  }, [user.id, estagiario, hoje]);

  const conta = (estado: Pedido["estado"]) => pedidos?.filter((p) => p.estado === estado).length ?? 0;
  const proximas = (pedidos ?? [])
    .filter((p) => p.estado === "aprovado" && p.data_fim >= hoje)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 3);
  const recentes = [...(pedidos ?? [])].sort((a, b) => b.id - a.id).slice(0, 5);
  const tituloId = `vista-${user.id}`;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-barra/40 p-4 pt-16 backdrop-blur-sm" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex w-full max-w-2xl flex-col gap-5 rounded-cartao bg-painel/90 p-5 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-16 w-16 text-lg" />
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-2xl font-semibold">
              {user.nome}
            </h2>
            <p className="break-all text-sm text-texto-suave">{user.email}</p>
            <p className="mt-1 inline-flex rounded-full bg-primaria-suave px-3 py-0.5 text-xs font-semibold">{papeis[user.papel]}</p>
          </div>
          <button type="button" ref={fechar} className={botaoSec} onClick={onFechar}>
            Fechar
          </button>
        </div>

        {erro && (
          <p role="alert" className={erroCls}>
            {erro}
          </p>
        )}

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li className="rounded-controlo bg-campo/70 p-3">
            <p className="text-xs text-texto-suave">Férias usadas</p>
            <p className="text-2xl font-bold tabular-nums">
              {ferias?.dias_ano != null ? `${ferias.usados}/${ferias.dias_ano + ferias.transitados}` : "-"}
            </p>
            {ferias?.dias_ano != null && <p className="text-xs text-texto-suave">dias úteis</p>}
          </li>
          {(["pendente", "aprovado", "recusado"] as const).map((e) => (
            <li key={e} className="rounded-controlo bg-campo/70 p-3">
              <p className="text-xs text-texto-suave">{estados[e]}s</p>
              <p className="text-2xl font-bold tabular-nums">{pedidos === null ? "…" : conta(e)}</p>
              <p className="text-xs text-texto-suave">pedidos</p>
            </li>
          ))}
        </ul>

        <section aria-labelledby={`${tituloId}-prox`} className="flex flex-col gap-2">
          <h3 id={`${tituloId}-prox`} className="font-semibold">
            Próximas ausências
          </h3>
          {pedidos === null ? (
            <p className="text-sm text-texto-suave">A carregar...</p>
          ) : proximas.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhuma ausência aprovada marcada.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {proximas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                  <span className="font-medium">{tipos[p.tipo]}</span>
                  <span className="text-texto-suave">
                    {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`${tituloId}-pontes`} className="flex flex-col gap-2">
          <h3 id={`${tituloId}-pontes`} className="font-semibold">
            Próximas pontes
          </h3>
          {pontes === null ? (
            <p className="text-sm text-texto-suave">A carregar...</p>
          ) : pontes.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhuma ponte marcada.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pontes.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-texto-suave">
                    {p.data_inicio === p.data_fim ? formatarData(p.data_inicio) : `${formatarData(p.data_inicio)} a ${formatarData(p.data_fim)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`${tituloId}-ult`} className="flex flex-col gap-2">
          <h3 id={`${tituloId}-ult`} className="font-semibold">
            Últimos pedidos
          </h3>
          {pedidos === null ? (
            <p className="text-sm text-texto-suave">A carregar...</p>
          ) : recentes.length === 0 ? (
            <p className="text-sm text-texto-suave">Ainda não fez pedidos.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recentes.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                  <span className="font-medium">{tipos[p.tipo]}</span>
                  <span className="text-texto-suave">
                    {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                  </span>
                  <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${corEstado[p.estado]}`}>
                    {estados[p.estado]}
                  </span>
                  {p.observacao && <p className="w-full break-words text-texto-suave">{p.observacao}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {estagiario && (
          <section aria-labelledby={`${tituloId}-pres`} className="flex flex-col gap-2">
            <h3 id={`${tituloId}-pres`} className="font-semibold">
              Presenças nos últimos 30 dias
              {presencas !== null && <span className="ml-2 text-sm font-normal text-texto-suave">({presencas.length} dias)</span>}
            </h3>
            {presencas === null ? (
              <p className="text-sm text-texto-suave">A carregar...</p>
            ) : presencas.length === 0 ? (
              <p className="text-sm text-texto-suave">Sem presenças registadas.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {presencas.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-controlo bg-campo/70 px-3 py-2 text-sm">
                    <span className="font-medium">{formatarData(p.data)}</span>
                    <span className="tabular-nums text-texto-suave">
                      {hora(p.entrada)} - {hora(p.saida)}
                      {p.atrasada && " (marcada depois)"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
