'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Toast as Radix } from 'radix-ui';
import { cn } from '../lib/cn';
import { BotaoFechar, IconeAviso, IconeBom, IconeCritico, IconeGrave, IconeInfo } from './internals';

/*
| Os mesmos cinco tons do `Alert` e do `Banner`, com os mesmos nomes. Um Toast
| com meia tabela obrigava quem o usasse a escolher outro tom para o mesmo
| facto — "réplica atrasada" ficava crítica ou ficava aviso, e nenhuma das duas
| é verdade.
*/
export type ToastTone = 'info' | 'good' | 'warning' | 'serious' | 'critical';

const ICONE = {
  info: IconeInfo,
  good: IconeBom,
  warning: IconeAviso,
  serious: IconeGrave,
  critical: IconeCritico,
} as const;

const TINTA = {
  info: 'text-info-ink',
  good: 'text-good-ink',
  warning: 'text-warning-ink',
  serious: 'text-serious-ink',
  critical: 'text-critical-ink',
} as const;

/*
| Quanto tempo fica no ecrã, por tom. Um erro exige ler e decidir; uma
| confirmação de "guardado" só precisa de ser vista. Manter os dois no mesmo
| tempo faz uma das duas coisas errada.
| TODO: token em falta: --ds-toast-dwell-* (os tokens de movimento vão até
| 400ms e descrevem transições, não permanência).
*/
const PERMANENCIA: Record<ToastTone, number> = {
  info: 5000,
  good: 5000,
  warning: 8000,
  serious: 10000,
  critical: 12000,
};

export type ToastOptions = {
  /** A frase que resume o que aconteceu. Obrigatória. */
  title: string;
  /** Detalhe opcional. Se o utilizador tiver de agir, a acção vai em `action`. */
  description?: string;
  tone?: ToastTone;
  /** Uma acção, no máximo — "Anular", "Ver". Mais do que uma pede um diálogo. */
  action?: { label: string; onClick: () => void };
  /** Milissegundos até fechar sozinho. Por omissão depende do tom. */
  duration?: number;
};

type ToastEmFila = ToastOptions & { id: string };

type ToastApi = {
  /** Põe um toast no ecrã. Devolve o id, para o poder fechar antes do tempo. */
  show: (opcoes: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContexto = createContext<ToastApi | null>(null);

/*
| Onde a pilha aparece.
|
| Em desktop: canto inferior direito, longe do conteúdo e do cursor.
| No telemóvel: EM CIMA. Em baixo ficaria por cima da zona do polegar e da
| barra de gestos do sistema — um toast com botão de anular ali é uma armadilha
| de toque, e a barra de gestos come-lhe metade.
|
| `outline-hidden` e não `outline-none`: a área recebe foco por gestão do
| Radix (F6) e o contorno tem de sobreviver ao modo de cores forçadas
| (CONVENÇÕES §5).
*/
const viewport = [
  'fixed z-[var(--ds-z-toast)] flex w-full list-none flex-col gap-3 outline-hidden',
  'top-0 left-0 p-gutter-mobile pt-[calc(var(--ds-space-5)+env(safe-area-inset-top))]',
  'sm:top-auto sm:right-0 sm:bottom-0 sm:left-auto sm:w-auto sm:max-w-(--container-form) sm:p-6',
].join(' ');

export type ToastProps = Omit<React.ComponentProps<typeof Radix.Root>, 'title'> &
  ToastOptions & {
    /** Chamado quando fecha, por tempo, por gesto ou pelo botão. */
    onClose?: () => void;
  };

/**
 * O cartão de um toast. Tem de viver dentro de `<ToastProvider>`.
 *
 * Normalmente não se usa à mão — `useToast().show()` cria-o. Fica exportado
 * para o caso de uma pilha controlada pelo próprio ecrã.
 */
export function Toast({
  title,
  description,
  tone = 'info',
  action,
  duration,
  className,
  onClose,
  onOpenChange,
  ...props
}: ToastProps) {
  const Icone = ICONE[tone];

  return (
    <Radix.Root
      duration={duration ?? PERMANENCIA[tone]}
      /*
      | `foreground` faz o Radix anunciar de imediato (aria-live assertivo);
      | `background` espera que o leitor de ecrã acabe o que está a dizer.
      | Interromper alguém para dizer "guardado" é ruído; para dizer que a
      | gravação falhou, não é.
      */
      type={tone === 'critical' || tone === 'serious' || tone === 'warning' ? 'foreground' : 'background'}
      onOpenChange={(aberto) => {
        onOpenChange?.(aberto);
        if (!aberto) onClose?.();
      }}
      className={cn(
        'flex items-start gap-3 rounded-lg border border-line bg-surface-1 p-4 shadow-float',
        'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
        'translate-y-0 opacity-100 transition-[translate,opacity] duration-[var(--ds-motion-base)] ease-ds',
        'starting:-translate-y-4 starting:opacity-0 sm:starting:translate-y-4',
        className,
      )}
      {...props}
    >
      {/* O ícone é o que distingue erro de sucesso para quem não separa as cores. */}
      <Icone className={cn('mt-0.5', TINTA[tone])} />

      <div className="min-w-0 flex-1">
        <Radix.Title className="text-sm font-semibold text-text-1">{title}</Radix.Title>
        {description ? (
          <Radix.Description className="mt-1 text-sm text-text-2">{description}</Radix.Description>
        ) : null}
        {action ? (
          <Radix.Action asChild altText={action.label}>
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 -ml-3 inline-flex min-h-touch items-center rounded-md px-3 text-sm font-bold text-accent-ink hover:bg-accent-wash"
            >
              {action.label}
            </button>
          </Radix.Action>
        ) : null}
      </div>

      <Radix.Close asChild>
        <BotaoFechar aria-label={`Dispensar: ${title}`} className="-mt-1 -mr-2" />
      </Radix.Close>
    </Radix.Root>
  );
}

export type ToastProviderProps = React.ComponentProps<typeof Radix.Provider>;

/**
 * Vai uma vez, à volta da app. Guarda a fila e desenha a área de anúncio.
 *
 * A área tem `aria-live` posto pelo Radix — por isso é ela que fica montada
 * desde o início, e não cada toast: uma região viva que só nasce ao mesmo
 * tempo que a mensagem não é lida por metade dos leitores de ecrã.
 */
export function ToastProvider({ children, swipeDirection = 'right', ...props }: ToastProviderProps) {
  const [itens, setItens] = useState<ToastEmFila[]>([]);
  // Contador em vez de randomUUID: é estável, não precisa de crypto e o id
  // nunca chega ao HTML servido.
  const contador = useRef(0);

  const show = useCallback((opcoes: ToastOptions) => {
    contador.current += 1;
    const id = `ds-toast-${contador.current}`;
    setItens((atuais) => [...atuais, { ...opcoes, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setItens((atuais) => atuais.filter((item) => item.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContexto.Provider value={api}>
      <Radix.Provider swipeDirection={swipeDirection} {...props}>
        {children}
        {itens.map(({ id, ...opcoes }) => (
          <Toast key={id} {...opcoes} onClose={() => dismiss(id)} />
        ))}
        <Radix.Viewport className={viewport} />
      </Radix.Provider>
    </ToastContexto.Provider>
  );
}

/** Acesso à fila de toasts. Rebenta de propósito fora do `ToastProvider`. */
export function useToast() {
  const api = useContext(ToastContexto);
  if (!api) {
    throw new Error('useToast() precisa de um <ToastProvider> acima na árvore.');
  }
  return api;
}
