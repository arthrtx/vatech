"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { dataPt, duracaoTexto, horaDe, textoPeriodo, totalMinutos } from "@/lib/presencas";
import { podePedir, temPermissao } from "@/lib/permissoes";
import { IconeAgenda, IconePedidos } from "../Icones";
import { Button } from "@/design-system/primitives";
import { Card, CardBody, CardFooter, CardHeader } from "@/design-system/layout";
import { Skeleton } from "@/design-system/data";
import { Alert } from "@/design-system/overlays";
import Cabecalho from "./Cabecalho";
import ConfirmarPresenca from "./ConfirmarPresenca";

type Estado = { fase: "a-carregar" } | { fase: "erro"; msg: string } | { fase: "ok"; presenca: Presenca | null; periodos: Presenca[] };

/** Insere ou substitui um período (por id), por ordem de entrada. */
function juntar(lista: Presenca[], p: Presenca): Presenca[] {
  return [...lista.filter((x) => x.id !== p.id), p].sort((a, b) => Date.parse(a.entrada) - Date.parse(b.entrada));
}

export function CartaoPresenca() {
  const [estado, setEstado] = useState<Estado>({ fase: "a-carregar" });
  const [aMarcar, setAMarcar] = useState(false);
  const [pergunta, setPergunta] = useState<"entrada" | "saida" | null>(null);
  const [erroMarcar, setErroMarcar] = useState<string | null>(null);
  const [volta, setVolta] = useState(0);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);

  // O botão só aceita foco depois de deixar de estar disabled: espera pelo fim do diálogo e do pedido.
  useEffect(() => {
    if (aMarcar || pergunta || !devolverFoco.current) return;
    devolverFoco.current = false;
    botaoRef.current?.focus();
  }, [aMarcar, pergunta]);

  const fecharPergunta = useCallback(() => {
    devolverFoco.current = true;
    setPergunta(null);
  }, []);

  useEffect(() => {
    let vivo = true;
    api.presencaHoje().then(
      async (presenca) => {
        // A lista de períodos é um extra: se falhar, mostra-se pelo menos o último.
        let periodos = presenca ? [presenca] : [];
        if (presenca) {
          try {
            const dia = hojeIso();
            const todos = await api.presencas(dia, dia);
            const meus = todos.filter((x) => x.user_id === presenca.user_id && x.data === presenca.data);
            periodos = juntar(meus, presenca);
          } catch {}
        }
        if (vivo) setEstado({ fase: "ok", presenca, periodos });
      },
      (e) => vivo && setEstado({ fase: "erro", msg: mensagemDeErro(e) }),
    );
    return () => {
      vivo = false;
    };
  }, [volta]);

  const tentar = useCallback(() => {
    setEstado({ fase: "a-carregar" });
    setVolta((v) => v + 1);
  }, []);

  async function marcar(saida: boolean) {
    if (aMarcar) return;
    fecharPergunta();
    setErroMarcar(null);
    setAMarcar(true);
    try {
      const presenca = await (saida ? api.marcarSaida() : api.marcarEntrada());
      setEstado((a) => ({ fase: "ok", presenca, periodos: juntar(a.fase === "ok" ? a.periodos : [], presenca) }));
    } catch (e) {
      setErroMarcar(mensagemDeErro(e));
    } finally {
      setAMarcar(false);
    }
  }

  let corpo: React.ReactNode;
  let rodape: React.ReactNode = null;
  if (estado.fase === "a-carregar") {
    corpo = (
      <div aria-busy="true" aria-label="A carregar a presença de hoje">
        <Skeleton shape="block" className="h-12 w-48" />
      </div>
    );
  } else if (estado.fase === "erro") {
    corpo = (
      <Alert
        tone="critical"
        title={`Não foi possível carregar a presença de hoje. ${estado.msg}`}
        action={
          <Button variant="outline" tone="neutral" size="sm" onClick={tentar}>
            Tentar de novo
          </Button>
        }
      />
    );
  } else {
    const { presenca, periodos } = estado;
    const dentro = !!presenca && !presenca.saida;
    corpo = (
      <>
        <p className="text-md text-text-1">
          {presenca && dentro ? (
            <>
              Em trabalho desde <strong>{horaDe(presenca.entrada)}</strong>.
            </>
          ) : presenca ? (
            "Fora."
          ) : (
            "Ainda não marcaste a entrada de hoje."
          )}
        </p>
        {periodos.length > 0 && (
          <div className="flex flex-col gap-2">
            <ul className="ds-tabular flex flex-col gap-1 text-sm text-text-2">
              {periodos.map((p) => (
                <li key={p.id}>{textoPeriodo(p)}</li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-text-1">Total de hoje: {duracaoTexto(totalMinutos(periodos))}</p>
          </div>
        )}
      </>
    );
    rodape = (
      <CardFooter padding="compact">
        <Button
          ref={botaoRef}
          size="lg"
          disabled={aMarcar}
          className="w-full sm:w-auto"
          onClick={() => setPergunta(dentro ? "saida" : "entrada")}
        >
          {aMarcar ? "A marcar..." : dentro ? "Marcar saída" : "Marcar entrada"}
        </Button>
      </CardFooter>
    );
  }

  return (
    <Card asChild>
      <section aria-labelledby="presenca-hoje">
        <CardHeader padding="compact">
          <h2 id="presenca-hoje" className="text-md font-semibold text-text-1">
            Presença de hoje
          </h2>
        </CardHeader>
        <CardBody padding="compact" className="flex flex-col gap-4">
          {corpo}
          {erroMarcar && <Alert tone="critical" title={erroMarcar} />}
        </CardBody>
        {rodape}
        {pergunta && (
          <ConfirmarPresenca
            saida={pergunta === "saida"}
            onConfirmar={() => void marcar(pergunta === "saida")}
            onCancelar={fecharPergunta}
          />
        )}
      </section>
    </Card>
  );
}

export default function DashboardEstagiario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const { estagio_inicio: inicio, estagio_fim: fim } = user;

  return (
    <div className="flex flex-col gap-8">
      <Cabecalho
        nome={user.nome}
        hoje={hoje}
        resumo={
          inicio || fim ? (
            <>
              Estágio{inicio ? ` desde ${dataPt(inicio)}` : ""}
              {fim ? ` até ${dataPt(fim)}` : ""}.
            </>
          ) : (
            "Marca a tua presença e consulta os teus pedidos."
          )
        }
        acoes={
          <>
            <Button asChild variant="outline" tone="neutral" leading={<IconeAgenda className="size-4" />}>
              <Link href="/agenda">Agenda</Link>
            </Button>
            {podePedir(user) && (
              <Button asChild leading={<IconePedidos className="size-4" />}>
                <Link href="/">Novo pedido</Link>
              </Button>
            )}
          </>
        }
      />
      {temPermissao(user, "marcar_presenca") && <CartaoPresenca />}
      {!inicio && !fim && (
        <p className="text-sm text-text-2">
          Define as datas do teu estágio nas{" "}
          <Link href="/definicoes" className="text-accent-ink underline">
            Definições
          </Link>
          .
        </p>
      )}
    </div>
  );
}
