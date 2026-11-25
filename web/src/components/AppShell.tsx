"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AvisoLicencas from "./AvisoLicencas";
import type { Papel } from "@/lib/api";
import { primeiroNome } from "@/lib/saudacao";
import {
  IconeAgenda,
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
import FundoQuente, { classeFundoQuente } from "./FundoQuente";
import Notificacoes from "./Notificacoes";
import Pesquisa from "./Pesquisa";
import { useTema } from "@/lib/tema";
import { botao, botaoSec } from "./ui";

// Dica com o nome do item: aparece ao passar o rato ou com foco de teclado.
// Abaixo do ícone no telemóvel (barra de topo), à direita no desktop (barra lateral).
const dica =
  "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-controlo bg-barra px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:left-full md:top-1/2 md:mt-0 md:ml-3 md:translate-x-0 md:-translate-y-1/2";
// Dica para o avatar na barra de topo: sempre por baixo, alinhada à direita.
const dicaAbaixo =
  "pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-controlo bg-barra px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";
// Peças de vidro da barra de topo (relógio, página actual, botões e conta).
const vidroTopo = "rounded-full bg-painel/55 text-texto ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10";
const botaoTopo =
  "group relative flex h-11 w-11 shrink-0 items-center justify-center hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const itemInativo = "text-texto-suave hover:bg-primaria-suave hover:text-texto";
const botaoIcone =
  "group relative flex h-10 w-10 items-center justify-center rounded-controlo focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

export default function AppShell({
  children,
  soAdmin = false,
  papeis,
  ecraInteiro = false,
}: {
  children: React.ReactNode;
  soAdmin?: boolean;
  /** Papéis com acesso à página; os outros são redirecionados para «/». */
  papeis?: Papel[];
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
  const semAcesso = !!user && ((soAdmin && user.papel !== "admin") || (!!papeis && !papeis.includes(user.papel)));
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
    { href: "/agenda", texto: "Agenda", Icone: IconeAgenda },
  ];
  if (user.papel === "admin") {
    links.push({ href: "/funcionarios", texto: "Funcionários", Icone: IconeFuncionarios });
  }
  if (user.papel === "admin" || user.papel === "estagiario") {
    links.push({ href: "/presencas", texto: "Estágio", Icone: IconeUtilizador });
  }
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
        className={`relative isolate flex min-h-screen flex-col gap-4 overflow-clip p-3 md:min-h-[calc(100vh-3rem)] md:flex-row md:gap-6 md:rounded-painel md:p-5 md:shadow-suave ${classeFundoQuente} ${ecraInteiro ? "lg:[@media(min-height:820px)]:h-full lg:[@media(min-height:820px)]:min-h-0" : ""}`}
      >
        <FundoQuente />
        <aside className="relative z-30 flex items-center gap-3 rounded-barra bg-painel/45 px-3 py-2 text-texto shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 md:sticky md:top-11 md:min-h-[calc(100vh-5.5rem)] md:w-[4.5rem] md:shrink-0 md:self-start md:flex-col md:gap-4 md:px-0 md:py-5">
          <p className="flex h-10 w-10 items-center justify-center rounded-controlo overflow-hidden bg-barra">
            <img src="/logo-setuptech.png" alt="" className="h-full w-full object-cover" />
            <span className="sr-only">Setuptech</span>
          </p>
          <span aria-hidden="true" className="hidden h-px w-8 bg-linha md:block" />
          <nav aria-label="Principal" className="flex shrink-0 gap-1 md:flex-col md:gap-3">
            {links.map(({ href, texto, Icone }) => (
              <Link
                key={href}
                href={href}
                aria-label={texto}
                aria-current={pathname === href ? "page" : undefined}
                className={classeLink(href)}
              >
                <Icone />
                <span aria-hidden="true" className={dica}>
                  {texto}
                </span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 gap-1 md:ml-0 md:mt-auto md:flex-col md:gap-3">
            <Link
              href={definicoes.href}
              aria-label={definicoes.texto}
              aria-current={pathname === definicoes.href ? "page" : undefined}
              className={classeLink(definicoes.href)}
            >
              <IconeDefinicoes />
              <span aria-hidden="true" className={dica}>
                {definicoes.texto}
              </span>
            </Link>
            <button type="button" onClick={() => setASair(true)} aria-label="Sair" className={`${botaoIcone} ${itemInativo}`}>
              <IconeSair />
              <span aria-hidden="true" className={dica}>
                Sair
              </span>
            </button>
          </div>
        </aside>
        <div className={`flex min-w-0 flex-1 flex-col ${ecraInteiro ? "gap-4 lg:min-h-0" : "gap-6"}`}>
          <header className="relative z-30 flex items-center gap-3 md:grid md:grid-cols-[1fr_auto_1fr]">
            <div className="min-w-0">
              {agora && (
                <time dateTime={agora.toISOString()} className="block pl-3 text-4xl font-bold leading-none tracking-tight tabular-nums md:text-5xl">
                  {hora}
                </time>
              )}
            </div>
            {pagina && IconePagina && (
              <p className={`${vidroTopo} hidden items-center gap-3 py-1.5 pl-1.5 pr-6 md:flex`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primaria-suave">
                  <IconePagina className="h-4 w-4" />
                </span>
                <span className="font-semibold">{pagina.texto}</span>
              </p>
            )}
            <div className="ml-auto flex items-center gap-2 md:justify-self-end">
              <button
                type="button"
                onClick={() => setPesquisaAberta(true)}
                aria-label="Pesquisar"
                aria-keyshortcuts="Control+K"
                className={`${vidroTopo} ${botaoTopo}`}
              >
                <IconePesquisa className="h-4 w-4" />
                <span aria-hidden="true" className={dicaAbaixo}>
                  Pesquisar (Ctrl+K)
                </span>
              </button>
              <Notificacoes user={user} className={`${vidroTopo} ${botaoTopo}`} />
              <button
                type="button"
                aria-pressed={escuro}
                aria-label="Tema João"
                onClick={() => definirTema(escuro ? "claro" : "escuro")}
                className={`${vidroTopo} ${botaoTopo}`}
              >
                {escuro ? <IconeSol className="h-4 w-4" /> : <IconeLua className="h-4 w-4" />}
                <span aria-hidden="true" className={dicaAbaixo}>
                  {escuro ? "Mudar para Tema Joana" : "Mudar para Tema João"}
                </span>
              </button>
              <Link
                href="/definicoes"
                aria-label={`${user.nome}, a minha conta`}
                className={`${vidroTopo} flex shrink-0 items-center gap-3 p-1 hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria sm:pr-5`}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-barra/40 p-4 backdrop-blur-sm" onClick={() => setASair(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sair-titulo"
            aria-describedby="sair-texto"
            className="w-full max-w-sm rounded-cartao bg-painel/90 p-6 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sair-titulo" className="text-lg font-semibold">
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
