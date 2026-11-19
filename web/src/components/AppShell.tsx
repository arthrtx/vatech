"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { primeiroNome, saudacao } from "@/lib/saudacao";
import {
  IconeAgenda,
  IconeDashboard,
  IconeDefinicoes,
  IconeFuncionarios,
  IconePedidos,
  IconePesquisa,
  IconeSair,
  IconeUtilizador,
} from "./Icones";
import Pesquisa from "./Pesquisa";

// Dica com o nome do item: aparece ao passar o rato ou com foco de teclado.
// Abaixo do ícone no telemóvel (barra de topo), à direita no desktop (barra lateral).
const dica =
  "pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-controlo bg-texto px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:left-full md:top-1/2 md:mt-0 md:ml-3 md:translate-x-0 md:-translate-y-1/2";
// Dica para o avatar na barra de topo: sempre por baixo, alinhada à direita.
const dicaAbaixo =
  "pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-controlo bg-texto px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";
const itemInativo = "text-white/85 hover:bg-white/15 hover:text-white";
const botaoIcone =
  "group relative flex h-10 w-10 items-center justify-center rounded-controlo focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

export default function AppShell({
  children,
  soAdmin = false,
  ecraInteiro = false,
}: {
  children: React.ReactNode;
  soAdmin?: boolean;
  /** Em ecrã grande (lg+) a página cabe na janela, sem scroll; o conteúdo gere o próprio espaço. */
  ecraInteiro?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [agora, setAgora] = useState<Date | null>(null);
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
    const atualizar = () => setAgora(new Date());
    atualizar();
    const t = setInterval(atualizar, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (soAdmin && user.papel !== "admin") router.replace("/");
  }, [loading, user, soAdmin, router]);

  if (loading || !user || (soAdmin && user.papel !== "admin")) {
    return <p className="p-6 text-texto-suave">A carregar...</p>;
  }

  const links = [
    { href: "/dashboard", texto: "Dashboard", Icone: IconeDashboard },
    { href: "/", texto: user.papel === "admin" ? "Pedidos" : "Os meus pedidos", Icone: IconePedidos },
    { href: "/agenda", texto: "Agenda", Icone: IconeAgenda },
  ];
  if (user.papel === "admin") links.push({ href: "/funcionarios", texto: "Funcionários", Icone: IconeFuncionarios });
  const definicoes = { href: "/definicoes", texto: "Definições" };
  const classeLink = (href: string) => `${botaoIcone} ${pathname === href ? "bg-rosa" : itemInativo}`;

  const iniciais = user.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  let hoje = "";
  if (agora) {
    const data = new Intl.DateTimeFormat("pt", { weekday: "long", day: "numeric", month: "long" }).format(agora);
    const hora = new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" }).format(agora);
    hoje = `${data.charAt(0).toUpperCase() + data.slice(1)} · ${hora}`;
  }

  return (
    <div className={`min-h-screen bg-fundo p-0 text-texto md:p-6 ${ecraInteiro ? "lg:h-screen lg:overflow-hidden" : ""}`}>
      <div className={`flex min-h-screen flex-col gap-4 bg-painel p-3 md:min-h-[calc(100vh-3rem)] md:flex-row md:gap-6 md:rounded-painel md:p-5 md:shadow-suave ${ecraInteiro ? "lg:h-full lg:min-h-0" : ""}`}>
        <aside className="flex items-center gap-3 rounded-barra bg-primaria px-3 py-2 text-white md:sticky md:top-11 md:h-[calc(100vh-5.5rem)] md:w-[4.5rem] md:shrink-0 md:self-start md:flex-col md:gap-4 md:px-0 md:py-5">
          <p className="flex h-10 w-10 items-center justify-center rounded-controlo bg-white/20 text-base font-semibold">
            <span aria-hidden="true">v</span>
            <span className="sr-only">vatech</span>
          </p>
          <span aria-hidden="true" className="hidden h-px w-8 bg-white/25 md:block" />
          <nav aria-label="Principal" className="flex gap-1 md:flex-col md:gap-3">
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
          <div className="ml-auto flex gap-1 md:ml-0 md:mt-auto md:flex-col md:gap-3">
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
            <button type="button" onClick={logout} aria-label="Sair" className={`${botaoIcone} ${itemInativo}`}>
              <IconeSair />
              <span aria-hidden="true" className={dica}>
                Sair
              </span>
            </button>
          </div>
        </aside>
        <div className={`flex min-w-0 flex-1 flex-col ${ecraInteiro ? "gap-4 lg:min-h-0" : "gap-6"}`}>
          <header className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {agora ? `${saudacao(agora)}, ` : ""}
                {primeiroNome(user.nome)}
              </p>
              <p className="hidden truncate text-sm text-texto-suave sm:block">{hoje}</p>
            </div>
            <button
              type="button"
              onClick={() => setPesquisaAberta(true)}
              aria-keyshortcuts="Control+K"
              className="ml-auto flex h-11 w-full max-w-xs items-center gap-2 rounded-controlo bg-campo px-4 text-sm text-texto-suave hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              <IconePesquisa />
              <span>Pesquisar</span>
              <span aria-hidden="true" className="ml-auto text-xs">
                Ctrl+K
              </span>
            </button>
            <span
              tabIndex={0}
              aria-label={user.nome}
              className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-sm font-semibold text-primaria-forte focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              <span aria-hidden="true">{iniciais || <IconeUtilizador />}</span>
              <span aria-hidden="true" className={dicaAbaixo}>
                {user.nome}
              </span>
            </span>
          </header>
          <main className={`min-w-0 flex-1 md:pr-2 ${ecraInteiro ? "lg:flex lg:min-h-0 lg:flex-col" : ""}`}>{children}</main>
        </div>
      </div>
      {pesquisaAberta && (
        <Pesquisa destinos={[...links, definicoes].map(({ href, texto }) => ({ href, texto }))} onFechar={fecharPesquisa} />
      )}
    </div>
  );
}
