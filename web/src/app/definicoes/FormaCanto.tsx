const TONS = { rosa: "fill-rosa/25", violeta: "fill-violeta/35", pessego: "fill-pessego/60" } as const;

/**
 * Mancha orgânica decorativa a sangrar num canto de um cartão bento.
 * O cartão pai tem de ser `relative isolate`: a mancha fica entre o fundo e o conteúdo, sem o recortar (popovers continuam a sair).
 */
export default function FormaCanto({ tom = "rosa", baixo = false }: { tom?: keyof typeof TONS; baixo?: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      <svg
        viewBox="0 0 160 160"
        className={`absolute h-36 w-36 ${TONS[tom]} ${baixo ? "-bottom-10 -left-10 rotate-180" : "-right-10 -top-10"}`}
      >
        <path d="M80 8c30-6 66 14 72 46s-14 52-30 70-46 32-72 22S6 118 10 84 50 14 80 8Z" />
      </svg>
    </span>
  );
}
