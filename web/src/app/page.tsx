"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AvisoFerias from "@/components/dashboard/AvisoFerias";
import ListaPedidos from "@/components/ListaPedidos";
import PedidoForm from "@/components/PedidoForm";
import PedidosAdmin from "@/components/PedidosAdmin";
import PedidosSecao from "@/components/PedidosSecao";
import { api, mensagemDeErro, type Pedido } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { podePedir, temPermissao } from "@/lib/permissoes";
import { erro as erroCls } from "@/components/ui";

function Conteudo() {
  const { user } = useAuth();
  const admin = user?.papel === "admin";
  // Não-admin com «aprovar pedidos»: decide os pedidos dos outros e mantém a sua própria lista.
  const gestor = !admin && temPermissao(user, "aprovar_pedidos");
  const podeNovo = podePedir(user);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Pedido | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoAdminAberto, setNovoAdminAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setPedidos(await api.pedidos());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial de dados remotos
    carregar();
  }, [carregar]);

  // Pedidos novos de outros utilizadores: atualiza de 15 em 15 s e ao voltar ao separador.
  useEffect(() => {
    const t = setInterval(carregar, 15000);
    const aoVoltar = () => document.visibilityState === "visible" && carregar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  // Vindo de uma notificação (?pedido=ID): leva o pedido à vista e destaca-o por instantes.
  const destacado = useSearchParams().get("pedido");
  useEffect(() => {
    if (!destacado || pedidos.length === 0) return;
    const el = document.getElementById(`pedido-${destacado}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const marca = ["ring-2", "ring-rosa"];
    el.classList.add(...marca);
    const t = setTimeout(() => el.classList.remove(...marca), 3000);
    return () => clearTimeout(t);
  }, [destacado, pedidos]);

  async function decidir(fn: () => Promise<unknown>) {
    let falha: string | null = null;
    try {
      await fn();
    } catch (e) {
      falha = mensagemDeErro(e);
    }
    // Recarrega sempre (ex.: 409, o pedido já foi decidido); o erro mostra-se depois, para o carregar() não o limpar.
    await carregar();
    if (falha) setErro(falha);
  }

  // Quem aprova vê dois blocos: os seus pedidos e os dos outros. Os restantes só o primeiro.
  const aprova = admin || gestor;
  const meus = aprova ? pedidos.filter((p) => p.user_id === user?.id) : pedidos;
  const equipa = pedidos.filter((p) => p.user_id !== user?.id);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="titulo-bento">Pedidos</h1>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {!admin && <AvisoFerias />}
      <PedidosSecao
        id="meus"
        titulo="Os meus pedidos"
        descricao="Férias, ausências e licenças que pediu."
        pedidos={meus}
        carregando={carregando}
      >
        {admin ? (
          <ListaPedidos
            pedidos={meus}
            carregando={carregando}
            textoVazio="Ainda não fez nenhum pedido."
            formulario={
              <PedidoForm
                onCriado={(avisos) => {
                  carregar();
                  if (avisos.length === 0) setNovoAdminAberto(false);
                }}
              />
            }
            formAberto={novoAdminAberto}
            aoAbrirForm={() => setNovoAdminAberto(true)}
            aoFecharForm={() => setNovoAdminAberto(false)}
            apagarAprovados
            onApagar={async (p) => {
              try {
                await api.apagarPedido(p.id);
                setPedidos((ps) => ps.filter((x) => x.id !== p.id));
              } catch (e) {
                setErro(mensagemDeErro(e));
              }
            }}
          />
        ) : (
          <ListaPedidos
            pedidos={meus}
            carregando={carregando}
            textoVazio="Ainda não fez nenhum pedido."
            formulario={
              !podeNovo && !editando ? undefined : editando ? (
                <PedidoForm
                  key={editando.id}
                  pedido={editando}
                  onCriado={async () => {
                    setEditando(null);
                    await carregar();
                  }}
                  onCancelar={() => setEditando(null)}
                />
              ) : (
                <PedidoForm
                  onCriado={(avisos) => {
                    carregar();
                    if (avisos.length === 0) setNovoAberto(false);
                  }}
                />
              )
            }
            formAberto={novoAberto || !!editando}
            aoAbrirForm={() => {
              setEditando(null);
              setNovoAberto(true);
            }}
            aoFecharForm={() => {
              setEditando(null);
              setNovoAberto(false);
            }}
            onEditar={(p) => setEditando(p)}
            onCancelar={async (p) => {
              try {
                const r = await api.cancelarPedido(p.id);
                setPedidos((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...r.data } : x)));
              } catch (e) {
                setErro(mensagemDeErro(e));
              }
            }}
            onApagar={async (p) => {
              if (editando?.id === p.id) setEditando(null);
              try {
                await api.apagarPedido(p.id);
                // Sai da lista já; a atualização periódica confirma com o servidor.
                setPedidos((ps) => ps.filter((x) => x.id !== p.id));
              } catch (e) {
                setErro(mensagemDeErro(e));
              }
            }}
          />
        )}
      </PedidosSecao>
      {aprova && (
        <PedidosSecao
          id="equipa"
          titulo="Pedidos da equipa"
          descricao="Pedidos de outras pessoas para aprovar ou recusar. O que precisa de decisão fica primeiro."
          pedidos={equipa}
          paraDecidir
          carregando={carregando}
        >
          <PedidosAdmin
            pedidos={equipa}
            carregando={carregando}
            textoVazio="Ainda ninguém da equipa fez pedidos."
            onAprovar={(id) => decidir(() => api.aprovar(id))}
            onRecusar={(id, motivo) => decidir(() => api.recusar(id, motivo))}
          />
        </PedidosSecao>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Suspense>
        <Conteudo />
      </Suspense>
    </AppShell>
  );
}
