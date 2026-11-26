import Link from "next/link";
import { Button } from "@/design-system/primitives";
import { Card, CardFooter } from "@/design-system/layout";
import { Stat } from "@/design-system/data";

interface Props {
  rotulo: string;
  /** null = fonte falhou: mostra "-", nunca 0. */
  valor: number | null;
  aCarregar: boolean;
  ligacao?: { href: string; texto: string };
}

export default function CartaoContador({ rotulo, valor, aCarregar, ligacao }: Props) {
  return (
    <li>
      <Card className="flex h-full flex-col justify-between">
        <Stat
          label={rotulo}
          value={
            aCarregar ? (
              <span data-skeleton aria-hidden="true" className="block h-8 w-16 rounded-sm bg-surface-3 motion-safe:animate-pulse" />
            ) : valor === null ? (
              <>
                <span aria-hidden="true">-</span>
                <span className="ds-sr-only">indisponível</span>
              </>
            ) : (
              valor
            )
          }
        />
        {ligacao && (
          <CardFooter padding="compact">
            <Button asChild variant="ghost" size="sm">
              <Link href={ligacao.href}>{ligacao.texto}</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </li>
  );
}
