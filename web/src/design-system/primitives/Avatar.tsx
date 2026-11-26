'use client';

import { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Exportado para o AvatarGroup poder desenhar o contador "+N" com exactamente
| a mesma medida e forma. Duplicar as classes lá dentro faria os dois divergir
| ao primeiro ajuste de tamanho. Não sai no barril — não é API pública.
|
| xs não tem token de controlo próprio (a escala começa nos 32px); usa o
| degrau de espaço de 24px, que é o mesmo valor sem o inventar.
*/
export const avatar = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-surface-2 font-semibold text-text-2 select-none',
  {
    variants: {
      size: {
        xs: 'size-(--ds-space-6) text-2xs',
        sm: 'size-(--ds-control-h-sm) text-xs',
        md: 'size-(--ds-control-h-md) text-sm',
        lg: 'size-(--ds-control-h-lg) text-md',
      },
      shape: {
        circle: 'rounded-pill',
        /** Cantos suavizados, para quando o avatar acompanha uma tabela ou um cartão. */
        pill: 'rounded-lg',
      },
    },
    defaultVariants: { size: 'md', shape: 'circle' },
  },
);

export type AvatarProps = Omit<React.ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatar> & {
    /** Nome da pessoa. Serve de `alt`, de fonte das iniciais e de texto acessível. */
    name: string;
    /** Retrato. Se falhar a carregar, entram as iniciais — sem quadrado partido. */
    src?: string;
  };

/** Duas letras: primeira do primeiro nome, primeira do último. */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1] ?? '') : '';
  const letras = (primeira.charAt(0) + ultima.charAt(0)).toUpperCase();
  return letras === '' ? '?' : letras;
}

/**
 * Retrato de pessoa ou entidade.
 *
 * O fallback não é decoração: um `<img>` com URL morto rende o ícone de imagem
 * partida do browser, que é pior do que não haver retrato nenhum.
 */
export function Avatar({ className, size, shape, name, src, ...props }: AvatarProps) {
  const [falhou, setFalhou] = useState(false);
  const mostraImagem = typeof src === 'string' && src !== '' && !falhou;

  return (
    <span className={cn(avatar({ size, shape }), className)} {...props}>
      {mostraImagem ? (
        // <img> e não o <Image> do Next: o pacote não pode depender do framework.
        <img src={src} alt={name} onError={() => setFalhou(true)} className="size-full object-cover" />
      ) : (
        <>
          <span aria-hidden="true">{iniciais(name)}</span>
          <span className="ds-sr-only">{name}</span>
        </>
      )}
    </span>
  );
}
