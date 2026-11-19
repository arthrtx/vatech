"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, mensagemDeErro, type Presenca, type User } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { dataPt, horaDe } from "@/lib/presencas";
import { IconeAgenda, IconePedidos } from "../Icones";
import { acao, acaoDestaque, botaoSec, erro as erroCls, vidro } from "../ui";
import Cabecalho from "./Cabecalho";

type Estado = { fase: "a-carregar" } | { fase: "erro"; msg: string } | { fase: "ok"; presenca: Presenca | null };

const botaoPresenca =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-positivo px-8 text-base font-semibold text-barra hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 disabled:opacity-50";

function CartaoPresenca() {
  const [estado, setEstado] = useState<Estado>({ fase: "a-carregar" });
  const [aMarcar, setAMarcar] = useState(false);
  const [erroMarcar, setErroMarcar] = useState<string | null>(null);
  const [volta, setVolta] = useState(0);

  useEffect(() => {
    let vivo = true;
    api.presencaHoje().then(
      (presenca) => vivo && setEstado({ fase: "ok", presenca }),
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
    setErroMarcar(null);
    setAMarcar(true);
    try {
      const presenca = await (saida ? api.marcarSaida() : api.marcarEntrada());
      setEstado({ fase: "ok", presenca });
    } catch (e) {
      setErroMarcar(mensagemDeErro(e));
    } finally {
      setAMarcar(false);
    }
  }

  let corpo: React.ReactNode;
  if (estado.fase === "a-carregar") {
    corpo = (
      <div aria-busy="true" aria-label="A carregar a presença de hoje" className="animate-pulse motion-reduce:animate-none">
        <div className="h-12 w-48 rounded-full bg-trilho" />
      </div>
    );
  } else if (estado.fase === "erro") {
    corpo = (
      <div role="alert" className={`${erroCls} flex flex-col items-start gap-2`}>
        <span>Não foi possível carregar a presença de hoje. {estado.msg}</span>
        <button type="button" className={`${botaoSec} min-h-10`} onClick={tentar}>
          Tentar de novo
        </button>
      </div>
    );
  } else if (!estado.presenca) {
    corpo = (
      <>
        <p>Ainda não marcaste a entrada de hoje.</p>
        <div>
          <button type="button" disabled={aMarcar} className={botaoPresenca} onClick={() => void marcar(false)}>
            {aMarcar ? "A marcar..." : "Marcar entrada"}
          </button>
        </div>
      </>
    );
  } else if (!estado.presenca.saida) {
    corpo = (
      <>
        <p>
          Em curso. Entraste às <strong>{horaDe(estado.presenca.entrada)}</strong>.
        </p>
        <div>
          <button type="button" disabled={aMarcar} className={botaoPresenca} onClick={() => void marcar(true)}>
            {aMarcar ? "A marcar..." : "Marcar saída"}
          </button>
        </div>
      </>
    );
  } else {
    corpo = (
      <p>
        Concluído. Entrada às <strong>{horaDe(estado.presenca.entrada)}</strong>, saída às <strong>{horaDe(estado.presenca.saida)}</strong>.
      </p>
    );
  }

  return (
    <section aria-labelledby="presenca-hoje" className={`${vidro} flex flex-col gap-3 p-5 motion-safe:animate-subir`}>
      <h2 id="presenca-hoje" className="text-lg font-semibold">
        Presença de hoje
      </h2>
      {corpo}
      {erroMarcar && (
        <p role="alert" className={erroCls}>
          {erroMarcar}
        </p>
      )}
    </section>
  );
}

export default function DashboardEstagiario({ user }: { user: User }) {
  const [hoje] = useState(() => hojeIso());
  const { estagio_inicio: inicio, estagio_fim: fim } = user;

  return (
    <div className="flex flex-col gap-4">
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
            <span className="text-texto-suave">Marca a tua presença e consulta os teus pedidos.</span>
          )
        }
        acoes={
          <>
            <Link href="/agenda" className={acao}>
              <IconeAgenda className="h-4 w-4" />
              Agenda
            </Link>
            <Link href="/" className={acaoDestaque}>
              <IconePedidos className="h-4 w-4" />
              Novo pedido
            </Link>
          </>
        }
      />
      <CartaoPresenca />
      {!inicio && !fim && (
        <p className="text-sm text-texto-suave">
          Define as datas do teu estágio nas{" "}
          <Link href="/definicoes" className="underline">
            Definições
          </Link>
          .
        </p>
      )}
    </div>
  );
}
