"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AvisoLicencas from "./AvisoLicencas";
import type { Papel } from "@/lib/api";
import { temPermissao, type Permissao } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/saudacao";
import {
  IconeAgendaMenu,
  IconeCalendario,
  IconeDashboard,
  IconeDefinicoes,
  IconeFuncionarios,
  IconeLua,
  IconePedidos,
  IconePesquisa,
  IconeSair,
  IconeSol,
  IconeUtilizador,
} from "./Icones";
import Avatar from "./Avatar";
import Notificacoes from "./Notificacoes";
import Pesquisa from "./Pesquisa";
import { useTema } from "@/lib/tema";
import { botao, botaoSec } from "./ui";

// Dica com o nome do item, só na barra compacta do telemóvel (no desktop o texto está visível).
const dica =
  "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-controlo bg-barra px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:hidden";
// Dica para o avatar na barra de topo: sempre por baixo, alinhada à direita.
const dicaAbaixo =
  "pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-controlo bg-barra px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";
// Peças sólidas da barra de topo: pílulas e botões circulares com contorno fino.
const solidoTopo = "rounded-full border border-linha-forte bg-painel text-texto";
const botaoTopo =
  "group relative flex h-11 w-11 shrink-0 max-[360px]:h-9 max-[360px]:w-9 items-center justify-center hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
// Itens da barra lateral (escura): ícone + texto no desktop, só ícone no telemóvel.
const itemInativo = "text-white/80 hover:bg-white/10 hover:text-white";
const botaoIcone =
  "group relative flex h-11 w-11 shrink-0 max-[360px]:h-9 max-[360px]:w-9 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:w-full md:justify-start md:gap-3 md:px-4 text-sm font-medium";
const rotuloSecao = "hidden px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-white/70 md:block";
const textoItem = "hidden md:inline";

export default function AppShell({
  children,
  soAdmin = false,
  papeis,
  permissao,
  ecraInteiro = false,
}: {
  children: React.ReactNode;
  soAdmin?: boolean;
  /** Papéis com acesso à página; os outros são redirecionados para «/». */
  papeis?: Papel[];
  /** Com `soAdmin`, também deixa entrar quem tem esta permissão. */
  permissao?: Permissao;
  /** Em ecrã grande (lg+) a página cabe na janela, sem scroll; o conteúdo gere o próprio espaço. */
  ecraInteiro?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [aSair, setASair] = useState(false);
  const { escuro, definir: definirTema } = useTema();
  const [agora, setAgora] = useState<Date | null>(null);
  const semAcesso = !!user && ((soAdmin && user.papel !== "admin" && !(permissao && temPermissao(user, permissao))) || (!!papeis && !papeis.includes(user.papel)));
  const fecharPesquisa = useCallback(() => setPesquisaAberta(false), []);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPesquisaAberta(true);
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  useEffect(() => {
    if (!aSair) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setASair(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aSair]);

  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    atualizar();
    const t = setInterval(atualizar, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (semAcesso) router.replace("/");
  }, [loading, user, semAcesso, router]);

  if (loading || !user || semAcesso) {
    return <p className="p-6 text-texto-suave">A carregar...</p>;
  }

  const links = [
    { href: "/dashboard", texto: "Dashboard", Icone: IconeDashboard },
    { href: "/", texto: user.papel === "admin" ? "Pedidos" : "Os meus pedidos", Icone: IconePedidos },
    { href: "/agenda", texto: "Agenda", Icone: IconeAgendaMenu },
    { href: "/calendario", texto: "Calendário", Icone: IconeCalendario },
  ];
  if (temPermissao(user, "convidar_pessoas")) {
    links.push({ href: "/funcionarios", texto: "Funcionários", Icone: IconeFuncionarios });
  }
  if (temPermissao(user, "gerir_rh")) {
    links.push({ href: "/rh", texto: "RH", Icone: IconeFuncionarios });
  }
  links.push({ href: "/presencas", texto: "Presenças", Icone: IconeUtilizador });
  const definicoes = { href: "/definicoes", texto: "Definições" };
  const classeLink = (href: string) => `${botaoIcone} ${pathname === href ? "bg-rosa text-white" : itemInativo}`;

  const iniciais = user.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const hora = agora ? new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" }).format(agora) : "";
  const pagina = [...links, { ...definicoes, Icone: IconeDefinicoes }].find((l) => l.href === pathname);
  const IconePagina = pagina?.Icone;

  return (
    <div className={`min-h-screen bg-fundo p-0 text-texto md:p-6 ${ecraInteiro ? "lg:[@media(min-height:820px)]:h-screen lg:[@media(min-height:820px)]:overflow-hidden" : ""}`}>
      <div
        className={`relative isolate flex min-h-screen flex-col gap-4 overflow-clip bg-creme p-3 max-[360px]:p-2 md:min-h-[calc(100vh-3rem)] md:flex-row md:gap-6 md:rounded-painel md:border-2 md:border-texto md:p-3 ${ecraInteiro ? "lg:[@media(min-height:820px)]:h-full lg:[@media(min-height:820px)]:min-h-0" : ""}`}
      >
        <aside className="relative z-30 flex max-md:flex-wrap items-center gap-3 max-[360px]:gap-1 max-[360px]:px-1.5 rounded-barra bg-barra px-3 py-2 text-white md:sticky md:top-9 md:h-[calc(100vh-5.5rem)] md:w-56 md:shrink-0 md:self-start md:flex-col md:items-stretch md:gap-4 md:overflow-y-auto md:px-3 md:pb-8 md:pt-5">
          <div className="flex shrink-0 items-center gap-2.5 md:ml-1">
            <p className="flex h-10 w-10 shrink-0 max-[360px]:h-8 max-[360px]:w-8 items-center justify-center rounded-controlo overflow-hidden bg-barra">
              <img src="/logo-setuptech.png" alt="" className="h-full w-full object-cover" />
            </p>
            <span className="text-lg font-bold tracking-tight max-[360px]:hidden">FuryNick</span>
          </div>
          <nav aria-label="Principal" className="flex shrink-0 items-center gap-1 max-[360px]:gap-0.5 md:flex-col md:items-stretch md:gap-1">
            <p className={rotuloSecao}>Geral</p>
            {links.map(({ href, texto, Icone }) => (
              <Link
                key={href}
                href={href}
                aria-label={texto}
                aria-current={pathname === href ? "page" : undefined}
                className={classeLink(href)}
              >
                <Icone />
                <span aria-hidden="true" className={textoItem}>
                  {texto}
                </span>
                <span aria-hidden="true" className={dica}>
                  {texto}
                </span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 max-[360px]:gap-0.5 md:ml-0 md:mt-auto md:flex-col md:items-stretch">
            <p className={rotuloSecao}>Conta</p>
            <Link
              href={definicoes.href}
              aria-label={definicoes.texto}
              aria-current={pathname === definicoes.href ? "page" : undefined}
              className={classeLink(definicoes.href)}
            >
              <IconeDefinicoes />
              <span aria-hidden="true" className={textoItem}>
                {definicoes.texto}
              </span>
              <span aria-hidden="true" className={dica}>
                {definicoes.texto}
              </span>
            </Link>
            <button type="button" onClick={() => setASair(true)} aria-label="Sair" className={`${botaoIcone} ${itemInativo}`}>
              <IconeSair />
              <span aria-hidden="true" className={textoItem}>
                Sair
              </span>
              <span aria-hidden="true" className={dica}>
                Sair
              </span>
            </button>
          </div>
        </aside>
        <div className={`flex min-w-0 flex-1 flex-col ${ecraInteiro ? "gap-6 lg:min-h-0" : "gap-6"}`}>
          <header className="relative z-30 flex items-center gap-3 max-[360px]:gap-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-6">
            <div className="min-w-0">
              {agora && (
                <time dateTime={agora.toISOString()} className="block pl-3 text-4xl max-[360px]:text-3xl font-bold leading-none tracking-tight tabular-nums md:text-5xl">
                  {hora}
                </time>
              )}
            </div>
            {pagina && IconePagina && (
              <p className={`${solidoTopo} hidden items-center gap-3 py-1.5 pl-1.5 pr-6 md:flex`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primaria-suave">
                  <IconePagina className="h-4 w-4" />
                </span>
                <span className="font-semibold">{pagina.texto}</span>
              </p>
            )}
            <div className="ml-auto flex items-center gap-2 max-[360px]:gap-1.5 md:justify-self-end">
              <button
                type="button"
                onClick={() => setPesquisaAberta(true)}
                aria-label="Pesquisar"
                aria-keyshortcuts="Control+K"
                className={`${solidoTopo} group relative flex h-11 shrink-0 items-center justify-center gap-2 hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria max-[360px]:h-9 max-[360px]:w-9 w-11 xl:w-52 xl:justify-start xl:px-4`}
              >
                <IconePesquisa className="h-4 w-4 shrink-0" />
                <span aria-hidden="true" className="hidden text-sm text-texto-suave xl:inline">
                  Pesquisar
                </span>
                <span aria-hidden="true" className="ml-auto hidden rounded-full bg-campo px-2 py-0.5 text-xs text-texto-suave xl:inline">
                  Ctrl+K
                </span>
                <span aria-hidden="true" className={`${dicaAbaixo} xl:hidden`}>
                  Pesquisar (Ctrl+K)
                </span>
              </button>
              <Notificacoes user={user} className={`${solidoTopo} ${botaoTopo}`} />
              <button
                type="button"
                aria-pressed={escuro}
                aria-label="Tema João"
                onClick={() => definirTema(escuro ? "claro" : "escuro")}
                className={`${solidoTopo} ${botaoTopo}`}
              >
                {escuro ? <IconeSol className="h-4 w-4" /> : <IconeLua className="h-4 w-4" />}
                <span aria-hidden="true" className={dicaAbaixo}>
                  {escuro ? "Mudar para Tema Joana" : "Mudar para Tema João"}
                </span>
              </button>
              <Link
                href="/definicoes"
                aria-label={`${user.nome}, a minha conta`}
                className={`${solidoTopo} flex shrink-0 items-center gap-3 p-1 hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria sm:pr-5`}
              >
                {user.avatar_url ? (
                  <Avatar nome={user.nome} id={user.id} foto={user.avatar_url} className="h-10 w-10 text-sm" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primaria-suave text-sm font-semibold text-primaria-forte dark:text-texto"
                  >
                    {iniciais || <IconeUtilizador />}
                  </span>
                )}
                <span aria-hidden="true" className="hidden min-w-0 leading-tight sm:block">
                  <span className="block max-w-40 truncate font-semibold">{primeiroNome(user.nome)}</span>
                  <span className="block text-xs text-texto-suave">A minha conta</span>
                </span>
              </Link>
            </div>
          </header>
          <main className={`min-w-0 flex-1 md:pr-2 ${ecraInteiro ? "lg:flex lg:min-h-0 lg:flex-col" : ""}`}>
            {user.papel === "admin" && <AvisoLicencas />}
            {children}
          </main>
        </div>
      </div>
      {aSair && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-barra/40 p-4" onClick={() => setASair(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sair-titulo"
            aria-describedby="sair-texto"
            className="w-full max-w-sm rounded-cartao border border-linha bg-painel p-6 shadow-suave"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sair-titulo" className="text-xl font-bold tracking-tight">
              Sair da conta?
            </h2>
            <p id="sair-texto" className="mt-2 text-sm text-texto-suave">
              Tem a certeza de que quer terminar a sessão? Terá de iniciar sessão novamente para voltar a entrar.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => setASair(false)} className={botaoSec}>
                Ficar
              </button>
              <button type="button" onClick={logout} className={botao}>
                Sim, sair
              </button>
            </div>
          </div>
        </div>
      )}
      {pesquisaAberta && (
        <Pesquisa destinos={[...links, definicoes].map(({ href, texto }) => ({ href, texto }))} onFechar={fecharPesquisa} />
      )}
    </div>
  );
}
