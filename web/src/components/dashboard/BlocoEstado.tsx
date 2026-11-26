import type { ReactNode } from "react";
import type { Fonte } from "@/lib/useFonte";
import { Button } from "@/design-system/primitives";
import { Card, CardBody, CardHeader } from "@/design-system/layout";
import { EmptyState, Skeleton } from "@/design-system/data";
import { Alert } from "@/design-system/overlays";

interface Props<T> {
  titulo: string;
  fonte: Fonte<T>;
  mensagemErro: string;
  /** Linhas do skeleton: mesma geometria das linhas finais. */
  linhas: number;
  vazio: (dados: T) => boolean;
  vazioTitulo: string;
  vazioTexto: string;
  vazioAcao?: ReactNode;
  children: (dados: T) => ReactNode;
  /** Classes extra de grelha (ex.: lg:col-span-2). */
  className?: string;
}

/** Um cartão com os 4 estados: a carregar (skeleton), erro, vazio, com dados. */
export default function BlocoEstado<T>({
  titulo,
  fonte,
  mensagemErro,
  linhas,
  vazio,
  vazioTitulo,
  vazioTexto,
  vazioAcao,
  children,
  className,
}: Props<T>) {
  let corpo: ReactNode;
  if (fonte.erro) {
    corpo = (
      <Alert
        tone="critical"
        title={mensagemErro}
        action={
          <Button variant="outline" tone="neutral" size="sm" onClick={fonte.tentar}>
            Tentar de novo
          </Button>
        }
      />
    );
  } else if (fonte.dados === null) {
    corpo = (
      <ul aria-busy="true" aria-label={`A carregar: ${titulo}`} className="flex flex-col gap-3">
        {Array.from({ length: linhas }, (_, i) => (
          <li key={i} aria-hidden="true" data-skeleton className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
            <Skeleton className="w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
    );
  } else if (vazio(fonte.dados)) {
    corpo = (
      <EmptyState
        className="border-0 bg-transparent px-0 py-6"
        title={vazioTitulo}
        description={vazioTexto}
        action={vazioAcao}
      />
    );
  } else {
    corpo = children(fonte.dados);
  }

  return (
    <Card asChild className={className}>
      <section>
        <CardHeader padding="compact">
          <h2 className="text-md font-semibold text-text-1">{titulo}</h2>
        </CardHeader>
        <CardBody padding="compact" className="flex flex-col gap-4">
          {corpo}
        </CardBody>
      </section>
    </Card>
  );
}
