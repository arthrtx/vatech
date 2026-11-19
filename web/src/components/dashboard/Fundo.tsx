/**
 * Fundo quente do Dashboard (inspirado no HUROH): creme com manchas de pêssego, laranja e rosa
 * por trás dos widgets em vidro. Decorativo; fica parado com movimento reduzido.
 */
export default function Fundo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-cartao bg-gradient-to-br from-pessego/70 via-creme to-rosa-suave p-3 md:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-[30%] h-[28rem] w-[28rem] rounded-full bg-laranja/70 blur-3xl motion-safe:animate-flutuar" />
        <div className="absolute -right-16 -top-16 h-96 w-96 rounded-full bg-rosa/35 blur-3xl motion-safe:animate-flutuar [animation-delay:-6s]" />
        <div className="absolute bottom-[-8rem] left-[35%] h-[26rem] w-[36rem] rounded-full bg-pessego blur-3xl motion-safe:animate-flutuar [animation-delay:-12s]" />
        <div className="absolute right-[15%] top-[45%] h-72 w-72 rounded-full bg-rosa/30 blur-3xl motion-safe:animate-flutuar [animation-delay:-3s]" />
      </div>
      {children}
    </div>
  );
}
