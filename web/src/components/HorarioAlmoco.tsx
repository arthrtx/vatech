"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import CampoHora from "./CampoHora";
import { botao, botaoSec, erro as erroCls, label } from "./ui";
import { api, mensagemDeErro } from "@/lib/api";

/** O estagiário define o horário de almoço; o tempo que cai dentro dele sai do total de cada dia. */
export default function HorarioAlmoco({ onGuardado }: { onGuardado?: () => void }) {
  const { user, atualizarUser } = useAuth();
  const [inicio, setInicio] = useState(user?.almoco_inicio ?? "");
  const [fim, setFim] = useState(user?.almoco_fim ?? "");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const definido = !!user?.almoco_inicio;

  async function guardar(i: string | null, f: string | null) {
    setAGuardar(true);
    setErro(null);
    setOk(false);
    try {
      atualizarUser(await api.definirAlmoco({ almoco_inicio: i, almoco_fim: f }));
      setOk(true);
      onGuardado?.();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        guardar(inicio || null, fim || null);
      }}
    >
      <div>
        <label htmlFor="almoco-inicio" className={label}>
          Almoço das
        </label>
        <CampoHora id="almoco-inicio" className="w-36" valor={inicio} onChange={setInicio} />
      </div>
      <div>
        <label htmlFor="almoco-fim" className={label}>
          até às
        </label>
        <CampoHora id="almoco-fim" className="w-36" valor={fim} onChange={setFim} />
      </div>
      <button type="submit" className={`${botao} min-h-10`} disabled={aGuardar || !inicio || !fim}>
        Guardar almoço
      </button>
      {definido && (
        <button
          type="button"
          className={`${botaoSec} min-h-10`}
          disabled={aGuardar}
          onClick={() => {
            setInicio("");
            setFim("");
            guardar(null, null);
          }}
        >
          Sem almoço
        </button>
      )}
      <p className="basis-full text-sm text-texto-suave">
        {ok ? "Guardado. " : ""}O tempo de almoço que fica entre a entrada e a saída não conta para o total.
      </p>
      {erro && (
        <p role="alert" className={`${erroCls} basis-full`}>
          {erro}
        </p>
      )}
    </form>
  );
}
