"use client";

import { useCallback, useEffect, useState } from "react";
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
  IconeRelogio,
  IconeSair,
  IconeSol,
  IconeUtilizador,
} from "./Icones";
import Notificacoes from "./Notificacoes";
import Pesquisa from "./Pesquisa";
import { useTema } from "@/lib/tema";
import { AppShell as Concha, MobileNav, Sidebar, SidebarGroup, SidebarItem, SidebarNav, Topbar, UserMenu } from "@/design-system/shell";
import { ConfirmDialog } from "@/design-system/overlays";
import { Kbd } from "@/design-system/primitives";
import { cn } from "@/design-system/lib/cn";

// Botão só com ícone da barra superior: alvo de 44px, sem contorno, realce no hover.
const botaoTopo =
  "relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-md text-text-2 transition-colors duration-[var(--ds-motion-base)] ease-ds hover:bg-wash hover:text-text-1";
// Linha de navegação no painel do telemóvel e botão «Sair» da barra lateral: mesmo desenho do SidebarItem.
const linhaBase =
  "flex min-h-touch w-full items-center gap-3 rounded-md px-3 text-md font-medium transition-colors duration-[var(--ds-motion-base)] ease-ds lg:text-sm";
const linhaInativa = "text-text-2 hover:bg-wash hover:text-text-1";
const linhaAtiva = "bg-accent-wash font-semibold text-accent-ink";

const ID_CONTEUDO = "conteudo";

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
    return <p className="p-6 text-text-2">A carregar...</p>;
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
  if (user.papel === "admin") {
    links.push({ href: "/historico", texto: "Histórico", Icone: IconeRelogio });
  }
  const definicoes = { href: "/definicoes", texto: "Definições", Icone: IconeDefinicoes };

  const hora = agora ? new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" }).format(agora) : "";
  const pagina = [...links, definicoes].find((l) => l.href === pathname);
  const IconePagina = pagina?.Icone;

  // Navegação de cliente nas linhas do sistema (que são âncoras simples); cliques com modificador seguem o browser.
  const irPara = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  const marca = (
    <div className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-setuptech.png" alt="" className="size-9 shrink-0 rounded-md object-cover" />
      <span className="truncate text-lg font-bold tracking-tight text-text-1">Nick Fury</span>
    </div>
  );

  const itemLateral = ({ href, texto, Icone }: (typeof links)[number]) => (
    <SidebarItem key={href} href={href} active={pathname === href} onClick={irPara(href)} icon={<Icone className="size-5" />}>
      {texto}
    </SidebarItem>
  );

  const linhaMovel = ({ href, texto, Icone }: (typeof links)[number]) => (
    <a
      key={href}
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      onClick={irPara(href)}
      className={cn(linhaBase, pathname === href ? linhaAtiva : linhaInativa)}
    >
      <Icone className="size-5 shrink-0" />
      <span className="min-w-0 truncate">{texto}</span>
    </a>
  );

  const botaoSair = (
    <button type="button" onClick={() => setASair(true)} className={cn(linhaBase, linhaInativa)}>
      <IconeSair className="size-5 shrink-0" />
      <span>Sair</span>
    </button>
  );

  return (
    <>
      <a
        href={`#${ID_CONTEUDO}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--ds-z-toast)] focus:rounded-md focus:bg-surface-1 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-text-1 focus:shadow-float"
      >
        Saltar para o conteúdo
      </a>
      <Concha
        className={ecraInteiro ? "lg:items-stretch lg:[@media(min-height:820px)]:h-dvh lg:[@media(min-height:820px)]:overflow-hidden" : undefined}
        contentId={ID_CONTEUDO}
        contentClassName={ecraInteiro ? "lg:flex lg:min-h-0 lg:flex-col" : undefined}
        sidebar={
          <Sidebar header={marca} footer={botaoSair}>
            <SidebarNav label="Principal">
              <SidebarGroup title="Geral">{links.map(itemLateral)}</SidebarGroup>
              <SidebarGroup title="Conta">{itemLateral(definicoes)}</SidebarGroup>
            </SidebarNav>
          </Sidebar>
        }
        topbar={
          <Topbar
            leading={
              <MobileNav label="Menu" footer={botaoSair}>
                {marca}
                {[...links, definicoes].map(linhaMovel)}
              </MobileNav>
            }
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setPesquisaAberta(true)}
                  aria-label="Pesquisar"
                  aria-keyshortcuts="Control+K"
                  title="Pesquisar (Ctrl+K)"
                  className={cn(botaoTopo, "xl:w-56 xl:justify-start xl:gap-2 xl:border xl:border-line-strong xl:bg-surface-2 xl:px-3")}
                >
                  <IconePesquisa className="size-4 shrink-0" />
                  <span aria-hidden="true" className="hidden text-sm text-text-3 xl:inline">
                    Pesquisar
                  </span>
                  <Kbd aria-hidden="true" className="ml-auto hidden xl:inline-flex">
                    Ctrl+K
                  </Kbd>
                </button>
                <Notificacoes user={user} className={botaoTopo} />
                <button
                  type="button"
                  aria-pressed={escuro}
                  aria-label="Tema João"
                  title={escuro ? "Mudar para Tema Joana" : "Mudar para Tema João"}
                  onClick={() => definirTema(escuro ? "claro" : "escuro")}
                  className={botaoTopo}
                >
                  {escuro ? <IconeSol className="size-4" /> : <IconeLua className="size-4" />}
                </button>
                <UserMenu
                  name={primeiroNome(user.nome)}
                  email={user.email}
                  avatarUrl={user.avatar_url ?? undefined}
                  items={[
                    { label: "A minha conta", icon: <IconeUtilizador className="size-4" />, onSelect: () => router.push("/definicoes") },
                    { label: "Sair", icon: <IconeSair className="size-4" />, tone: "critical", onSelect: () => setASair(true) },
                  ]}
                />
              </>
            }
          >
            {pagina && IconePagina && (
              <p className="flex shrink-0 items-center gap-2 text-md font-semibold text-text-1">
                <IconePagina className="size-5 shrink-0 text-text-2" />
                <span>{pagina.texto}</span>
              </p>
            )}
            {agora && (
              <time dateTime={agora.toISOString()} className="ds-tabular ml-auto hidden text-sm text-text-2 sm:block">
                {hora}
              </time>
            )}
          </Topbar>
        }
      >
        {user.papel === "admin" && <AvisoLicencas />}
        {children}
      </Concha>
      <ConfirmDialog
        open={aSair}
        onOpenChange={setASair}
        title="Sair da conta?"
        description="Tem a certeza de que quer terminar a sessão? Terá de iniciar sessão novamente para voltar a entrar."
        cancelLabel="Ficar"
        confirmLabel="Sim, sair"
        onConfirm={logout}
      />
      {pesquisaAberta && (
        <Pesquisa destinos={[...links, definicoes].map(({ href, texto }) => ({ href, texto }))} onFechar={fecharPesquisa} />
      )}
    </>
  );
}
