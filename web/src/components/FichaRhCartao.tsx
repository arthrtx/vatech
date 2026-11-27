"use client";

import type { EstadoConta, FichaRh } from "@/lib/api";
import { rotuloPapel } from "@/lib/rotulos";
import { Avatar, Badge, Button } from "@/design-system/primitives";
import { Card } from "@/design-system/layout";

const estadoConta: Record<EstadoConta, string> = { pendente: "Conta pendente", aprovado: "Conta ativa", recusado: "Conta recusada" };

/** Ficha de uma pessoa: dados principais, contagens e as duas ações (vista geral e abrir a ficha). */
export default function FichaRhCartao({ ficha, onVista, onAbrir }: { ficha: FichaRh; onVista: () => void; onAbrir: () => void }) {
  return (
    <li>
      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={ficha.nome} src={ficha.avatar_url ?? undefined} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate text-md font-semibold text-text-1">{ficha.nome}</h3>
            <p className="break-all text-sm text-text-3">{ficha.email}</p>
            {ficha.cargo && <p className="text-sm text-text-3">{ficha.cargo}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{rotuloPapel(ficha)}</Badge>
          <Badge tone="neutral">{estadoConta[ficha.estado_conta ?? "aprovado"]}</Badge>
        </div>
        <p className="text-sm text-text-3 tabular-nums">
          {ficha.n_ficheiros} {ficha.n_ficheiros === 1 ? "ficheiro" : "ficheiros"} · {ficha.n_infos} {ficha.n_infos === 1 ? "informação" : "informações"}
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" tone="neutral" size="sm" onClick={onVista} aria-label={`Vista geral de ${ficha.nome}`}>
            Vista geral
          </Button>
          <Button type="button" variant="outline" tone="neutral" size="sm" onClick={onAbrir} aria-label={`Abrir ficha de ${ficha.nome}`}>
            Abrir ficha
          </Button>
        </div>
      </Card>
    </li>
  );
}
