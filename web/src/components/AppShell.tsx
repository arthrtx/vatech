"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { botaoSec } from "./ui";

export default function AppShell({
  children,
  soAdmin = false,
}: {
  children: React.ReactNode;
  soAdmin?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (soAdmin && user.papel !== "admin") router.replace("/");
  }, [loading, user, soAdmin, router]);

  if (loading || !user || (soAdmin && user.papel !== "admin")) {
    return <p className="p-6 text-zinc-700">A carregar...</p>;
  }

  const links = [{ href: "/", texto: user.papel === "admin" ? "Pedidos" : "Os meus pedidos" }];
  links.push({ href: "/agenda", texto: "Agenda" });
  if (user.papel === "admin") links.push({ href: "/funcionarios", texto: "Funcionários" });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-zinc-300 bg-white p-4 md:w-56 md:border-b-0 md:border-r">
        <p className="text-lg font-semibold">vatech</p>
        <nav aria-label="Principal" className="flex flex-wrap gap-2 md:flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                pathname === l.href ? "bg-zinc-900 text-white" : "text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              {l.texto}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <p className="break-words text-sm text-zinc-700">{user.nome}</p>
          <button type="button" onClick={logout} className={botaoSec}>
            Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
