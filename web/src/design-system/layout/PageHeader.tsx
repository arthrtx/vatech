import { cn } from '../lib/cn';

export type PageHeaderProps = Omit<React.ComponentProps<'header'>, 'title'> & {
  /** Etiqueta curta por cima do título. Maiúsculas — o tracking do `.ds-eyebrow` só funciona assim. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botões ou ligações de acção. Empilham a toda a largura no telemóvel. */
  actions?: React.ReactNode;
};

/*
| Cabeçalho de página: o bloco que responde a "onde estou e o que posso fazer
| aqui". Um por página, sempre em primeiro.
|
| `title` é obrigatório e sai num `<h1>` — uma página sem h1 quebra a
| navegação por títulos, que é como um leitor de ecrã salta o cabeçalho e a
| navegação para chegar ao conteúdo.
|
| ⚠ `Omit<…, 'title'>`: `<header>` aceita o atributo HTML `title` (a tooltip),
| e sem o Omit os dois tipos colidiam — o nosso ReactNode contra a `string` do
| DOM.
|
| As acções ficam ao lado do texto em desktop e empilham a toda a largura no
| telemóvel (`w-full`), onde um botão encolhido ao conteúdo é um alvo pequeno
| e desalinhado.
|
| ⚠ O tamanho do título entra como `text-(length:…)` e não como `text-h2`. O
| `tailwind-merge` só reconhece como tamanho os nomes que parecem t-shirt
| (`sm`, `md`, `lg`); `h2` cai no grupo da COR do texto, colide com
| `text-text-1` e um dos dois desaparece — sem erro, sem aviso. A forma
| `length:` é lida como tamanho e as duas classes sobrevivem. Aponta ao token
| de origem (`--ds-*`), que existe sempre em tokens.css. Com ela perde-se o
| line-height que o utilitário `text-h2` traz emparelhado, daí o `leading-snug`
| logo a seguir — e a seguir, porque um `leading-*` ANTES de um tamanho de
| letra também é comido pelo merge.
*/
export function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-6 md:flex-row md:items-end md:justify-between', className)} {...props}>
      <div className="max-w-(--container-text)">
        {eyebrow != null ? <p className="ds-eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-(length:--ds-text-h2) leading-snug font-bold text-balance text-text-1">{title}</h1>
        {description != null ? <p className="mt-3 text-md leading-relaxed text-text-2">{description}</p> : null}
      </div>

      {actions != null ? (
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
