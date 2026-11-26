import { Slot } from 'radix-ui';

/*
| `asChild` — deixar o consumidor escolher o elemento.
|
| Um componente do sistema decide o que rende: o `Button` é um `<button>`, o
| `Card` é um `<div>`. Isso está certo até ao momento em que a aplicação precisa
| que aquele botão seja o `<Link>` do Next, ou que aquela pilha seja um `<ul>`.
| Sem forma de o dizer, a saída é embrulhar — e um `<Link>` à volta de um `<a>`
| gera HTML inválido, além de perder o prefetch e a navegação sem recarregar.
|
| Foi o primeiro achado da migração do painel: a lista de leads teve de pôr o
| `Link` por fora do `Card`, e o padrão «linha clicável» repete-se em quase
| todas as listas da aplicação.
|
| A mecânica é o `Slot` do Radix: em vez de render o seu próprio elemento, o
| componente funde as suas props e classes no filho único que recebeu.
*/

/**
 * A raiz do Slot, para o ternário no sítio da chamada:
 *
 * ```tsx
 * const Elemento = asChild ? Raiz : 'button';
 * return <Elemento className={cn(...)} {...props} />;
 * ```
 *
 * ⚠ **Escreve-se mesmo assim, com o ternário à vista.** A primeira versão disto
 * era um helper — `elementoOuFilho(asChild, 'button')` — e o `eslint` recusou-o
 * em nove ficheiros com `react-hooks/static-components`: «este componente é
 * criado durante o render». O valor devolvido É estável (ou o Slot, ou uma
 * string), mas a regra não vê através de uma chamada de função, e presume o
 * pior — que cada render cria um componente novo e remonta a subárvore.
 *
 * O ternário no sítio da chamada é a forma que a regra reconhece, e é também a
 * que o shadcn usa. Não a esconder atrás de um helper é o preço de ter o
 * `eslint` a olhar por isto; e valeu a pena, porque o `tsc` deu verde nos nove
 * ficheiros e os três agentes que os escreveram deram o trabalho por bom.
 */
export const Raiz = Slot.Root;

/** O prop, para os componentes o estenderem sem repetir a explicação. */
export type ComAsChild = {
  /**
   * Funde as props e as classes no filho único em vez de render o elemento
   * próprio. Serve para o controlo ser um `<Link>`, um `<label>` ou outro
   * elemento sem perder o que este componente traz.
   *
   * Exige exactamente um filho elemento — não um texto, não dois irmãos.
   * Quando o componente tem conteúdo próprio a coexistir com o filho (o
   * spinner do `Button`, por exemplo), envolve-se o filho em `Slot.Slottable`
   * para o Radix saber qual deles é o verdadeiro.
   */
  asChild?: boolean;
};
