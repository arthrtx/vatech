"use client";

import { useEffect, useState } from "react";
import FormaCanto from "../app/definicoes/FormaCanto";
import { api, mensagemDeErro, type GrupoPermissao, type MatrizPermissoes, type PapelComPermissoes, type PermissaoCatalogo } from "@/lib/api";
import { botao, erro as erroCls } from "./ui";

const cartao = "relative isolate flex flex-col gap-4 rounded-barra border border-linha bg-painel p-5 md:p-7";
const COLUNAS: { papel: PapelComPermissoes; rotulo: string }[] = [
  { papel: "funcionario", rotulo: "Funcionário" },
  { papel: "estagiario", rotulo: "Estagiário" },
];
const GRUPOS: { grupo: GrupoPermissao; titulo: string }[] = [
  { grupo: "dia_a_dia", titulo: "Dia a dia" },
  { grupo: "gestao", titulo: "Gestão" },
];

const copiar = (m: MatrizPermissoes): MatrizPermissoes => ({ funcionario: { ...m.funcionario }, estagiario: { ...m.estagiario } });

/** Admin: define o que Funcionário e Estagiário podem fazer. O admin tem sempre tudo. */
export default function PermissoesAdmin() {
  const [catalogo, setCatalogo] = useState<PermissaoCatalogo[]>([]);
  const [valores, setValores] = useState<MatrizPermissoes | null>(null);
  const [inicial, setInicial] = useState<MatrizPermissoes | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .getPermissoes()
      .then((r) => {
        if (!ativo) return;
        setCatalogo(r.catalogo);
        setValores(copiar(r.papeis));
        setInicial(copiar(r.papeis));
      })
      .catch((e) => ativo && setErroCarga(mensagemDeErro(e)));
    return () => {
      ativo = false;
    };
  }, []);

  const sujo = !!valores && !!inicial && JSON.stringify(valores) !== JSON.stringify(inicial);

  function alternar(papel: PapelComPermissoes, chave: string, marcado: boolean) {
    setValores((v) => (v ? { ...v, [papel]: { ...v[papel], [chave]: marcado } } : v));
    setOk(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valores) return;
    setErro(null);
    setOk(false);
    setEnviando(true);
    try {
      const r = await api.putPermissoes(valores);
      setCatalogo(r.catalogo);
      setValores(copiar(r.papeis));
      setInicial(copiar(r.papeis));
      setOk(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate aria-labelledby="def-permissoes" className={cartao}>
      <div>
        <FormaCanto tom="violeta" />
        <h2 id="def-permissoes" className="text-xl font-bold tracking-tight">
          Permissões por papel
        </h2>
        <p className="text-sm text-texto-suave">Escolha o que cada papel pode fazer. O que ficar por marcar deixa de aparecer a essas pessoas. O administrador pode sempre tudo.</p>
      </div>
      {erroCarga && (
        <p role="alert" className={erroCls}>
          {erroCarga}
        </p>
      )}
      {valores &&
        GRUPOS.map(({ grupo, titulo }) => {
          const linhas = catalogo.filter((p) => p.grupo === grupo);
          if (linhas.length === 0) return null;
          return (
            <table key={grupo} className="w-full border-collapse text-left">
              <caption className="pb-2 text-left text-base font-semibold">{titulo}</caption>
              <thead>
                <tr className="border-b border-linha text-sm text-texto-suave">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Permissão
                  </th>
                  {COLUNAS.map((c) => (
                    <th key={c.papel} scope="col" className="w-28 px-3 py-2 text-center font-medium">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((p) => (
                  <tr key={p.chave} className="border-b border-linha last:border-b-0">
                    <th scope="row" className="py-3 pr-3 font-normal">
                      {p.rotulo}
                    </th>
                    {COLUNAS.map((c) => (
                      <td key={c.papel} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer accent-primaria focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2"
                          aria-label={`${p.rotulo}: ${c.rotulo}`}
                          checked={!!valores[c.papel][p.chave]}
                          onChange={(e) => alternar(c.papel, p.chave, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <p role="status">{ok ? "Permissões guardadas." : ""}</p>
      <div>
        <button type="submit" disabled={!valores || enviando || !sujo} className={`${botao} min-h-10`}>
          {enviando ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
