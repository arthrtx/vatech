"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, mensagemDeErro, type Anexo, type Limite, type Pedido, type PessoaPedido, type SubtipoPedido, type TipoPedido } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import CampoHora from "./CampoHora";
import { tipos } from "@/lib/rotulos";
import { temPermissao } from "@/lib/permissoes";
import CampoAnexos from "./CampoAnexos";
import { diasUteis } from "@/lib/diasUteis";
import CampoData from "./CampoData";
import PedidoPessoaCampo from "./PedidoPessoaCampo";
import Seletor from "./Seletor";
import { areaTexto, botao, botaoSec, erro as erroCls, label, vidro } from "./ui";

const PERMISSAO_DO_TIPO = { ferias: "pedir_ferias", ausencia: "pedir_ausencia", licenca: "pedir_licenca" } as const;

const subtipos: { v: SubtipoPedido; t: string }[] = [
  { v: "medica", t: "Médica" },
  { v: "documentacao", t: "Documentação" },
  { v: "falta_justificada", t: "Falta justificada" },
];

export default function PedidoForm({
  onCriado,
  pedido,
  onCancelar,
  dataInicial = "",
  className = `flex max-w-xl flex-col gap-3 p-5 ${vidro} has-[[role=dialog]]:relative has-[[role=dialog]]:z-20`,
}: {
  /** Chamado depois de criar (ou, em modo de edição, de guardar) o pedido. */
  onCriado?: (avisos: string[]) => void;
  /** Se existir, o formulário edita este pedido em vez de criar um novo. */
  pedido?: Pedido;
  /** Botão "Cancelar" (modo de edição). */
  onCancelar?: () => void;
  /** Preenche início e fim (ex.: dia escolhido na Agenda). */
  dataInicial?: string;
  className?: string;
}) {
  const edicao = !!pedido;
  const { user } = useAuth();
  const permitidos = (["ferias", "ausencia", "licenca"] as const).filter((t) => temPermissao(user, PERMISSAO_DO_TIPO[t]));
  const podeAnexar = temPermissao(user, "anexar_documentos");
  const podeMelhorar = temPermissao(user, "melhorar_texto");
  const admin = user?.papel === "admin";
  const podePorOutros = !edicao && temPermissao(user, "pedir_por_outros");
  const [emNomeDe, setEmNomeDe] = useState<PessoaPedido | null>(null);
  const hoje = hojeIso();
  const [tipo, setTipo] = useState<TipoPedido>(pedido?.tipo ?? permitidos[0] ?? "ausencia");
  const [subtipo, setSubtipo] = useState<SubtipoPedido | "">(pedido?.subtipo ?? "");
  const [inicio, setInicio] = useState(pedido?.data_inicio ?? dataInicial);
  const [fim, setFim] = useState(pedido?.data_fim ?? dataInicial);
  // Horas opcionais em qualquer pedido (ex.: uma consulta das 10:00 às 12:00, ou meio dia de férias).
  const [horaInicio, setHoraInicio] = useState(pedido?.hora_inicio ?? "");
  const [horaFim, setHoraFim] = useState(pedido?.hora_fim ?? "");
  const [obs, setObs] = useState(pedido?.observacao ?? "");
  const [urgente, setUrgente] = useState(pedido?.urgente ?? false);
  const [aMelhorar, setAMelhorar] = useState(false);
  const [antesDeMelhorar, setAntesDeMelhorar] = useState<string | null>(null);
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const [novos, setNovos] = useState<File[]>([]);
  const [guardados, setGuardados] = useState<Anexo[]>(pedido?.anexos ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const [limites, setLimites] = useState<Limite[]>([]);
  useEffect(() => {
    let ativo = true;
    api
      .limites()
      .then((r) => ativo && setLimites(r.limites))
      .catch(() => {
        // Sem saldo visível; a validação final é do servidor.
      });
    return () => {
      ativo = false;
    };
  }, []);

  const limite = limites.find((l) => l.tipo === tipo);
  const ano = hoje.slice(0, 4);
  // Ao editar um pedido do mesmo tipo, os seus dias já estão em «usados».
  const proprios = pedido && pedido.tipo === tipo && pedido.estado !== "recusado" ? diasUteis(pedido.data_inicio, pedido.data_fim) : 0;
  const usados = limite ? Math.max(0, limite.usados - proprios) : 0;
  const total = limite?.dias_ano != null ? limite.dias_ano + limite.transitados : null;
  const restam = total !== null ? Math.max(0, total - usados) : null;
  const diasPedidos = inicio && fim && fim >= inicio ? diasUteis(inicio, fim) : 0;
  // Férias: pode pedir até dias_max (25); os dias acima de dias_ano (22) são excedente.
  const maximo = limite?.dias_max != null ? limite.dias_max + limite.transitados : total;
  const restamMax = maximo !== null ? Math.max(0, maximo - usados) : null;
  const excede = restamMax !== null && diasPedidos > restamMax;
  const excedentes = total !== null && !excede ? Math.max(0, usados + diasPedidos - total) : 0;

  async function melhorar() {
    setErroTexto(null);
    setAMelhorar(true);
    try {
      const melhorado = await api.melhorarTexto(obs);
      setAntesDeMelhorar(obs);
      setObs(melhorado);
    } catch (err) {
      setErroTexto(mensagemDeErro(err));
    } finally {
      setAMelhorar(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAvisos([]);
    if (horaInicio && !horaFim) {
      setErro("Indique também a hora de fim.");
      return;
    }
    if (horaInicio && horaFim <= horaInicio) {
      setErro("A hora de fim tem de ser depois da hora de início.");
      return;
    }
    setEnviando(true);
    try {
      const corpo = {
        tipo,
        ...(tipo === "ausencia" && subtipo ? { subtipo } : {}),
        data_inicio: inicio,
        data_fim: fim,
        ...(horaInicio ? { hora_inicio: horaInicio, hora_fim: horaFim } : {}),
        ...(obs ? { observacao: obs } : {}),
        urgente,
        ...(podePorOutros && emNomeDe ? { user_id: emNomeDe.id } : {}),
      };
      const r = pedido ? await api.editarPedido(pedido.id, corpo) : await api.criarPedido(corpo);
      setAvisos(r.avisos ?? []);
      let falhaAnexos: string | null = null;
      if (podeAnexar && novos.length > 0) {
        try {
          const criados = await api.enviarAnexos(r.data.id, novos);
          setGuardados((g) => [...g, ...criados]);
        } catch (err) {
          falhaAnexos = `${edicao ? "Alterações guardadas" : "Pedido criado"}, mas os anexos não foram enviados: ${mensagemDeErro(err)}`;
        }
        setNovos([]);
      }
      if (!pedido) {
        setInicio("");
        setFim("");
        setHoraInicio("");
        setHoraFim("");
        setObs("");
        setUrgente(false);
        setGuardados([]);
      }
      if (falhaAnexos) setErro(`${falhaAnexos}${edicao ? "" : " Edite o pedido para os juntar."}`);
      onCriado?.(r.avisos ?? []);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={className} aria-labelledby="novo-pedido">
      <div className="flex items-center justify-between gap-3">
        <h2 id="novo-pedido" className="text-xl font-bold tracking-tight">
          {edicao ? "Editar pedido" : "Novo pedido"}
        </h2>
        <label htmlFor="urgente" className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          Urgente
          <button
            id="urgente"
            type="button"
            role="switch"
            aria-checked={urgente}
            onClick={() => setUrgente((u) => !u)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${urgente ? "bg-yellow-400" : "bg-campo ring-1 ring-linha-forte"}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${urgente ? "translate-x-5" : ""}`} />
          </button>
        </label>
      </div>
      {podePorOutros && <PedidoPessoaCampo valor={emNomeDe} onChange={setEmNomeDe} />}
      <div>
        <label htmlFor="tipo" className={label}>
          Tipo
        </label>
        <Seletor
          id="tipo"
          valor={tipo}
          opcoes={[
            { valor: "ferias", rotulo: "Férias" },
            { valor: "ausencia", rotulo: "Ausência" },
            { valor: "licenca", rotulo: "Licença" },
          ].filter((o) => permitidos.includes(o.valor as TipoPedido) || (edicao && o.valor === pedido?.tipo))}
          onChange={(v) => setTipo(v as TipoPedido)}
        />
      </div>
      {admin && !edicao && !emNomeDe && (
        <p role="note" className="rounded-cartao border border-linha-forte bg-painel px-4 py-2 text-sm">
          Fica marcado logo, sem pedido nem aprovação.
        </p>
      )}
      {tipo === "licenca" && !edicao && !admin && !emNomeDe && (
        <p role="note" className="rounded-cartao border border-linha-forte bg-painel px-4 py-2 text-sm">
          A licença é um direito seu: não precisa de aprovação. O admin recebe um aviso.
        </p>
      )}
      {limite?.dias_ano != null && (
        <p role="status" className="text-sm text-texto-suave">
          {tipos[tipo]}: {usados} de {total} dias úteis usados em {ano} (
          {limite.transitados > 0 ? `${limite.dias_ano} do ano + ${limite.transitados} transitados; ` : ""}restam {restam}
          {maximo !== null && maximo !== total ? `; pode pedir até ${maximo}` : ""})
        </p>
      )}
      {tipo === "ausencia" && (
        <div>
          <label htmlFor="subtipo" className={label}>
            Subtipo
          </label>
          <Seletor
            id="subtipo"
            valor={subtipo}
            opcoes={[{ valor: "", rotulo: "Sem subtipo" }, ...subtipos.map((x) => ({ valor: x.v, rotulo: x.t }))]}
            onChange={(v) => setSubtipo(v as SubtipoPedido | "")}
          />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="data_inicio" className={label}>
            Data de início
          </label>
          <CampoData
            id="data_inicio"
            required
            min={hoje}
            valor={inicio}
            onChange={(v) => {
              setInicio(v);
              if (fim && v > fim) setFim("");
            }}
          />
        </div>
        <div>
          <label htmlFor="data_fim" className={label}>
            Data de fim
          </label>
          <CampoData id="data_fim" required min={inicio && inicio > hoje ? inicio : hoje} valor={fim} onChange={setFim} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="hora_inicio" className={label}>
            Das (opcional)
          </label>
          <CampoHora id="hora_inicio" valor={horaInicio} onChange={setHoraInicio} />
        </div>
        <div>
          <label htmlFor="hora_fim" className={label}>
            Até às
          </label>
          <CampoHora id="hora_fim" required={!!horaInicio} valor={horaFim} onChange={setHoraFim} />
        </div>
      </div>
      {excede && (
        <p role="alert" className={erroCls}>
          Este pedido tem {diasPedidos} dias úteis e só restam {restamMax} de {tipos[tipo].toLowerCase()} em {ano}
          {maximo !== total ? ` (máximo de ${maximo})` : ""}.
        </p>
      )}
      {excedentes > 0 && (
        <p role="status" className="rounded-cartao border border-linha-forte bg-painel px-4 py-2 text-sm">
          Este pedido inclui {excedentes} {excedentes === 1 ? "dia" : "dias"} acima dos {total} de direito (excedente). Pode pedir até {maximo}.
        </p>
      )}
      <div>
        <label htmlFor="observacao" className={label}>
          Descrição
        </label>
        <textarea
          id="observacao"
          rows={2}
          className={areaTexto}
          value={obs}
          maxLength={2000}
          onChange={(e) => {
            setObs(e.target.value);
            setAntesDeMelhorar(null);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {podeMelhorar && (
            <button type="button" disabled={aMelhorar || obs.trim().length < 3} onClick={melhorar} className={`${botaoSec} min-h-9 px-3 py-1`}>
              {aMelhorar ? "A melhorar..." : "Melhorar texto"}
            </button>
          )}
          {antesDeMelhorar !== null && !aMelhorar && (
            <>
              <button
                type="button"
                className={`${botaoSec} min-h-9 px-3 py-1`}
                onClick={() => {
                  setObs(antesDeMelhorar);
                  setAntesDeMelhorar(null);
                }}
              >
                Desfazer
              </button>
              <span role="status" className="text-sm text-texto-suave">
                Texto melhorado. Reveja antes de submeter.
              </span>
            </>
          )}
        </div>
        {erroTexto && (
          <p role="alert" className={`${erroCls} mt-2`}>
            {erroTexto}
          </p>
        )}
      </div>
      {podeAnexar && (
      <CampoAnexos
        novos={novos}
        onNovos={setNovos}
        guardados={guardados}
        onRemoverGuardado={async (a) => {
          if (!pedido) return;
          try {
            await api.apagarAnexo(pedido.id, a.id);
            setGuardados((g) => g.filter((x) => x.id !== a.id));
          } catch (err) {
            setErro(mensagemDeErro(err));
          }
        }}
      />
      )}
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {avisos.length > 0 && (
        <div role="status" className={erroCls}>
          <p className="font-medium">{edicao ? "Pedido guardado, com avisos:" : "Pedido criado, com avisos:"}</p>
          <ul className="list-disc pl-5">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando || excede} className={botao}>
          {enviando ? "A enviar..." : edicao ? "Guardar alterações" : admin && !emNomeDe ? "Marcar" : tipo === "licenca" ? "Comunicar licença" : "Submeter pedido"}
        </button>
        {edicao && onCancelar && (
          <button type="button" onClick={onCancelar} className={botaoSec}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
