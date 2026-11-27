"use client";

import { useEffect, useRef, useState } from "react";
import { api, mensagemDeErro, type FeriasResumo, type Pedido, type Ponte, type Presenca, type TipoPessoa, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { maisDias } from "@/lib/dashboard";
import { estados, formatarData, papeis, rotuloPapel, tipos as rotulosPedido } from "@/lib/rotulos";
import { Avatar, Badge, Button, Heading, Tag, Text } from "@/design-system/primitives";
import { Field, Input, NativeSelect } from "@/design-system/forms";
import { Stack } from "@/design-system/layout";
import { Stat } from "@/design-system/data";
import { Alert, Modal } from "@/design-system/overlays";

const tomEstado: Record<Pedido["estado"], "warning" | "good" | "critical" | "neutral"> = {
  pendente: "warning",
  aprovado: "good",
  recusado: "critical",
  cancelado: "neutral",
};

const linha = "flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm";

const hora = (h: string | null) => (h ? h.slice(0, 5) : "-");

/** Janela com a vista geral de uma pessoa: dados, férias, pedidos, próximas pontes e presenças. */
export default function VistaFuncionario({
  user,
  ferias,
  onFechar,
  tipos = [],
  onMudarTipo,
  erroTipo,
  onAtualizado,
  onApagar,
}: {
  user: User;
  ferias?: FeriasResumo;
  onFechar: () => void;
  /** Só admin: tipos personalizados e acção para mudar o tipo (tipo_id null = papel base). */
  tipos?: TipoPessoa[];
  onMudarTipo?: (tipo_id: number | null, papel?: "funcionario" | "estagiario") => void;
  erroTipo?: string | null;
  /** Chamado com a pessoa devolvida pela API depois de guardar o estágio. */
  onAtualizado?: (user: User) => void;
  /** Só com a permissão «apagar pessoas» (nunca para admins nem para a própria conta). */
  onApagar?: () => Promise<void>;
}) {
  const [aConfirmarApagar, setAConfirmarApagar] = useState(false);
  const [aApagar, setAApagar] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);
  const [inicio, setInicio] = useState(user.estagio_inicio?.slice(0, 10) ?? "");
  const [fim, setFim] = useState(user.estagio_fim?.slice(0, 10) ?? "");
  const [instituicao, setInstituicao] = useState(user.instituicao_ensino ?? "");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroEstagio, setErroEstagio] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const valorTipo = user.tipo_id ? `t${user.tipo_id}` : user.papel;

  async function guardarEstagio(e: React.FormEvent) {
    e.preventDefault();
    setErroEstagio(null);
    setGuardado(false);
    setAGuardar(true);
    try {
      const nova = await api.definirEstagio(user.id, {
        estagio_inicio: inicio || null,
        estagio_fim: fim || null,
        instituicao_ensino: instituicao.trim() || null,
      });
      onAtualizado?.(nova);
      setGuardado(true);
    } catch (err) {
      setErroEstagio(mensagemDeErro(err));
    } finally {
      setAGuardar(false);
    }
  }
  const [hoje] = useState(() => hojeIso());
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [presencas, setPresencas] = useState<Presenca[] | null>(null);
  const [pontes, setPontes] = useState<Ponte[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O Radix só devolve o foco sozinho com `trigger`; aqui guarda-se quem o tinha ao abrir.
  const [elementoAnterior] = useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));
  const devolverFoco = useRef<HTMLElement | null>(elementoAnterior);

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
    api.presencas(maisDias(hoje, -30), hoje, user.id).then(
      (r) => ativo && setPresencas(r),
      (e) => ativo && setErro(mensagemDeErro(e)),
    );
    return () => {
      ativo = false;
    };
  }, [user.id, hoje]);

  const conta = (estado: Pedido["estado"]) => pedidos?.filter((p) => p.estado === estado).length ?? 0;
  const proximas = (pedidos ?? [])
    .filter((p) => p.estado === "aprovado" && p.data_fim >= hoje)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
    .slice(0, 3);
  const recentes = [...(pedidos ?? [])].sort((a, b) => b.id - a.id).slice(0, 5);
  const tituloId = `vista-${user.id}`;

  return (
    <Modal
      open
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
      title={user.nome}
      size="lg"
      etiquetaFechar="Fechar"
      devolverFocoA={devolverFoco}
      cabecalho={
        <div className="flex items-start gap-4">
          <Avatar name={user.nome} src={user.avatar_url ?? undefined} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-h4 font-semibold text-text-1" aria-hidden="true">
              {user.nome}
            </p>
            <Text size="sm" className="break-all">
              {user.email}
            </Text>
            {user.cargo && <Text size="sm">{user.cargo}</Text>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Tag tone="accent" size="sm">
                {rotuloPapel(user)}
              </Tag>
              <Text as="span" size="xs" weight="semibold" data-testid="conta-id">
                ID {user.id}
              </Text>
            </div>
          </div>
        </div>
      }
    >
      <Stack gap="lg">
        {erro && <Alert tone="critical" title={erro} />}

        {onMudarTipo && user.papel !== "admin" && (
          <section aria-labelledby={`${tituloId}-tipo`}>
            <Stack gap="xs">
              <Heading level={3} size="md" id={`${tituloId}-tipo`}>
                Definições
              </Heading>
              <div className="sm:max-w-xs">
                <Field label="Tipo" controlId={`tipo-${user.id}`} error={erroTipo ?? undefined}>
                  <NativeSelect
                    value={valorTipo}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.startsWith("t")) onMudarTipo(Number(v.slice(1)));
                      else onMudarTipo(null, v as "funcionario" | "estagiario");
                    }}
                    options={[
                      { value: "funcionario", label: papeis.funcionario },
                      { value: "estagiario", label: papeis.estagiario },
                      ...tipos.map((t) => ({ value: `t${t.id}`, label: t.nome })),
                    ]}
                  />
                </Field>
              </div>
            </Stack>
          </section>
        )}

        {user.papel === "estagiario" && onAtualizado && (
          <form onSubmit={guardarEstagio} aria-labelledby={`${tituloId}-est`}>
            <Stack gap="sm">
              <Heading level={3} size="md" id={`${tituloId}-est`}>
                Estágio
              </Heading>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data de início" controlId={`est-inicio-${user.id}`}>
                  <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                </Field>
                <Field label="Data de fim" controlId={`est-fim-${user.id}`}>
                  <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                </Field>
                <Field label="Instituição de ensino" controlId={`est-inst-${user.id}`} className="sm:col-span-2">
                  <Input maxLength={150} value={instituicao} onChange={(e) => setInstituicao(e.target.value)} />
                </Field>
              </div>
              {erroEstagio && <Alert tone="critical" title={erroEstagio} />}
              {guardado && (
                <Text role="status" size="sm">
                  Estágio guardado.
                </Text>
              )}
              <div>
                <Button type="submit" disabled={aGuardar}>
                  {aGuardar ? "A guardar..." : "Guardar estágio"}
                </Button>
              </div>
            </Stack>
          </form>
        )}

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li className="rounded-md bg-surface-2 p-3">
            <Stat
              variant="bare"
              label="Férias usadas"
              value={ferias?.dias_ano != null ? `${ferias.usados}/${ferias.dias_ano + ferias.transitados}` : "-"}
              hint={
                <>
                  {ferias?.dias_ano != null && <span className="block">dias úteis</span>}
                  {!!ferias?.pontes && (
                    <span className="block">
                      Pontes: {ferias.pontes} {ferias.pontes === 1 ? "dia" : "dias"}
                    </span>
                  )}
                </>
              }
            />
          </li>
          {(["pendente", "aprovado", "recusado"] as const).map((e) => (
            <li key={e} className="rounded-md bg-surface-2 p-3">
              <Stat variant="bare" label={`${estados[e]}s`} value={pedidos === null ? "…" : conta(e)} hint="pedidos" />
            </li>
          ))}
        </ul>

        <section aria-labelledby={`${tituloId}-prox`}>
          <Stack gap="xs">
            <Heading level={3} size="md" id={`${tituloId}-prox`}>
              Próximas ausências
            </Heading>
            {pedidos === null ? (
              <Text size="sm">A carregar...</Text>
            ) : proximas.length === 0 ? (
              <Text size="sm">Nenhuma ausência aprovada marcada.</Text>
            ) : (
              <ul className="flex flex-col gap-2">
                {proximas.map((p) => (
                  <li key={p.id} className={linha}>
                    <span className="font-medium text-text-1">{rotulosPedido[p.tipo]}</span>
                    <span className="text-text-2">
                      {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </section>

        <section aria-labelledby={`${tituloId}-pontes`}>
          <Stack gap="xs">
            <Heading level={3} size="md" id={`${tituloId}-pontes`}>
              Próximas pontes
            </Heading>
            {pontes === null ? (
              <Text size="sm">A carregar...</Text>
            ) : pontes.length === 0 ? (
              <Text size="sm">Nenhuma ponte marcada.</Text>
            ) : (
              <ul className="flex flex-col gap-2">
                {pontes.slice(0, 3).map((p) => (
                  <li key={p.id} className={linha}>
                    <span className="font-medium text-text-1">{p.nome}</span>
                    <span className="text-text-2">
                      {p.data_inicio === p.data_fim ? formatarData(p.data_inicio) : `${formatarData(p.data_inicio)} a ${formatarData(p.data_fim)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </section>

        <section aria-labelledby={`${tituloId}-ult`}>
          <Stack gap="xs">
            <Heading level={3} size="md" id={`${tituloId}-ult`}>
              Últimos pedidos
            </Heading>
            {pedidos === null ? (
              <Text size="sm">A carregar...</Text>
            ) : recentes.length === 0 ? (
              <Text size="sm">Ainda não fez pedidos.</Text>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentes.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-sm">
                    <span className="font-medium text-text-1">{rotulosPedido[p.tipo]}</span>
                    <span className="text-text-2">
                      {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                    </span>
                    <Badge tone={tomEstado[p.estado]} size="sm" className="ml-auto">
                      {estados[p.estado]}
                    </Badge>
                    {p.observacao && <p className="w-full break-words text-text-2">{p.observacao}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </section>

        <section aria-labelledby={`${tituloId}-pres`}>
          <Stack gap="xs">
            <Heading level={3} size="md" id={`${tituloId}-pres`}>
              Presenças nos últimos 30 dias
              {presencas !== null && <span className="ml-2 text-sm font-normal text-text-2">({presencas.length} dias)</span>}
            </Heading>
            {presencas === null ? (
              <Text size="sm">A carregar...</Text>
            ) : presencas.length === 0 ? (
              <Text size="sm">Sem presenças registadas.</Text>
            ) : (
              <ul className="flex flex-col gap-2">
                {presencas.slice(0, 5).map((p) => (
                  <li key={p.id} className={linha}>
                    <span className="font-medium text-text-1">{formatarData(p.data)}</span>
                    <span className="tabular-nums text-text-2">
                      {hora(p.entrada)} - {hora(p.saida)}
                      {p.atrasada && " (marcada depois)"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </section>

        {onApagar && (
          <section aria-label="Apagar pessoa" className="border-t border-line pt-4">
            <Stack gap="xs">
              {erroApagar && <Alert tone="critical" title={erroApagar} />}
              <div className="flex flex-wrap items-center gap-2">
                {aConfirmarApagar ? (
                  <>
                    <span className="text-sm font-medium text-text-1">Apagar a conta de {user.nome}?</span>
                    <Button
                      type="button"
                      variant="outline"
                      tone="critical"
                      disabled={aApagar}
                      onClick={async () => {
                        setAApagar(true);
                        setErroApagar(null);
                        try {
                          await onApagar();
                        } catch (e) {
                          setErroApagar(mensagemDeErro(e));
                          setAApagar(false);
                          setAConfirmarApagar(false);
                        }
                      }}
                    >
                      Sim, apagar
                    </Button>
                    <Button type="button" variant="outline" tone="neutral" onClick={() => setAConfirmarApagar(false)}>
                      Voltar
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" tone="critical" onClick={() => setAConfirmarApagar(true)}>
                    Apagar pessoa
                  </Button>
                )}
              </div>
            </Stack>
          </section>
        )}
      </Stack>
    </Modal>
  );
}
