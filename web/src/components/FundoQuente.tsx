/**
 * Fundo quente comum a todas as páginas (inspirado no HUROH): creme com manchas de pêssego,
 * laranja e rosa por trás do conteúdo. Decorativo; fica parado com movimento reduzido.
 * O elemento pai precisa de `relative isolate overflow-clip` (clip, não hidden, para o menu sticky continuar a funcionar).
 */
export const classeFundoQuente = "bg-gradient-to-br from-pessego/70 via-creme to-rosa-suave";

export default function FundoQuente() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -left-24 top-[30%] h-[28rem] w-[28rem] rounded-full bg-laranja/70 blur-3xl motion-safe:animate-flutuar dark:opacity-50" />
      <div className="absolute -right-16 -top-16 h-96 w-96 rounded-full bg-rosa/35 blur-3xl motion-safe:animate-flutuar [animation-delay:-6s]" />
      <div className="absolute bottom-[-8rem] left-[35%] h-[26rem] w-[36rem] rounded-full bg-pessego blur-3xl motion-safe:animate-flutuar [animation-delay:-12s]" />
      <div className="absolute right-[15%] top-[45%] h-72 w-72 rounded-full bg-rosa/30 blur-3xl motion-safe:animate-flutuar [animation-delay:-3s]" />
    </div>
  );
}
