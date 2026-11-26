import { cn } from '../lib/cn';

export type EmptyStateProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  /** Ícone ou ilustração. Decorativo — o texto é que informa. */
  icon?: React.ReactNode;
  /** O que não existe, na linguagem do domínio: "Ainda não há servidores". */
  title: string;
  /** Porque está vazio e o que fazer a seguir. */
  description?: string;
  /** Uma acção. Duas transformam um ecrã de arranque numa escolha. */
  action?: React.ReactNode;
};

/**
 * Estado vazio de um ecrã inteiro.
 *
 * Um ecrã vazio é o primeiro que muita gente vê num produto novo. Se disser só
 * "sem dados", quem lá chega fica sem saber se está avariado, se lhe faltam
 * permissões, ou se ainda não fez nada — por isso leva sempre título,
 * explicação e um caminho para a frente.
 */
export function EmptyState({ className, icon, title, description, action, children, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-line bg-surface-1 p-card text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex size-12 items-center justify-center rounded-pill bg-surface-2 text-text-3"
        >
          {icon}
        </div>
      ) : null}

      <h3 className="text-md font-semibold text-text-1">{title}</h3>
      {description ? <p className="mt-2 max-w-(--container-text) text-sm text-text-2">{description}</p> : null}
      {children}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
