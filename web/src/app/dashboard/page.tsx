"use client";

import AppShell from "@/components/AppShell";
import DashboardAdmin from "@/components/dashboard/DashboardAdmin";
import DashboardFuncionario from "@/components/dashboard/DashboardFuncionario";
import { useAuth } from "@/lib/auth";

function Conteudo() {
  const { user } = useAuth();
  if (!user) return null;
  return user.papel === "admin" ? <DashboardAdmin /> : <DashboardFuncionario user={user} />;
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Conteudo />
    </AppShell>
  );
}
