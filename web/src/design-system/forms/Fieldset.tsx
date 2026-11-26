import { useId } from 'react';
import { cn } from '../lib/cn';

export type FieldsetProps = React.ComponentProps<'fieldset'> & {
  /** Nome do grupo. Visível — não é um `aria-label` disfarçado. */
  legend: React.ReactNode;
  /** Contexto do grupo inteiro, lido depois da legenda. */
  hint?: React.ReactNode;
};

/**
 * Agrupa campos que só fazem sentido juntos: morada, período, opções de um
 * radio group.
 *
 * `<fieldset>` e `<legend>` reais, e não um `<div>` com um `<h3>`: um leitor de
 * ecrã anuncia a legenda ao entrar em cada campo do grupo, e um `disabled` no
 * fieldset desactiva tudo o que está lá dentro de uma vez.
 *
 * A legenda é visível de propósito. Se o grupo não merece um nome que se veja,
 * provavelmente não merece ser um grupo.
 */
export function Fieldset({ legend, hint, className, children, ...props }: FieldsetProps) {
  /*
    | A dica precisa de identificador para o grupo lhe poder apontar. Sem isto
    | ela existe no ecrã e não existe no anúncio: a árvore de acessibilidade do
    | Chrome dava `group "Âmbitos" · desc: undefined` enquanto os campos
    | vizinhos, que passam pelo `Field`, traziam a sua descrição.
    |
    | No formulário das fichas de linha de comandos, a frase que se perdia era
    | a regra de segurança do ecrã — a que diz que uma ficha nunca pode mais do
    | que quem a emite. Quem ouve o formulário nunca a ouvia.
    |
    | Mesmo mecanismo do `Field` (`useId` + sufixo), de propósito: dois padrões
    | para a mesma ligação davam duas maneiras de a partir.
  */
  const gerado = useId();
  const dicaId = hint ? `${gerado}-dica` : undefined;
  /*
    | Quem passar a sua própria descrição fica com as duas, pela ordem em que
    | se lêem. Substituir era apagar em silêncio o que o componente promete.
  */
  const descritoPor = [props['aria-describedby'], dicaId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset
      /*
        | `min-w-0` corrige um comportamento antigo do `<fieldset>`: o valor
        | inicial da sua largura mínima é `min-content`, o que o impede de
        | encolher dentro de um flex ou grid e faz a página deslizar na
        | horizontal em telemóvel. Não se apanha em desktop.
        |
        | `border-0 p-0` remove a moldura do browser — a nossa vem do desenho.
      */
      className={cn('min-w-0 border-0 p-0', className)}
      {...props}
      aria-describedby={descritoPor}
    >
      <legend className="mb-1 text-md font-semibold text-text-1">{legend}</legend>
      {hint ? (
        <p id={dicaId} className="mb-4 max-w-(--container-text) text-sm text-text-2">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}
