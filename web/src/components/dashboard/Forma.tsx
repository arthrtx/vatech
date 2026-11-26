export type TipoForma = "estrela" | "coracao" | "triangulo" | "flor" | "mancha";

/**
 * Forma orgânica decorativa do estilo bento. A cor vem da classe `text-*` do chamador (fill = currentColor),
 * por isso usa só tokens e acompanha o tema escuro. Posicionar no canto do cartão com `absolute` + valores negativos.
 */
export default function Forma({ tipo, className = "" }: { tipo: TipoForma; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className={`pointer-events-none absolute ${className}`} fill="currentColor">
      {tipo === "estrela" && <path d="M50 0C54 30 70 46 100 50C70 54 54 70 50 100C46 70 30 54 0 50C30 46 46 30 50 0Z" />}
      {tipo === "coracao" && <path d="M50 92C8 62 0 36 16 18C31 3 46 11 50 24C54 11 69 3 84 18C100 36 92 62 50 92Z" />}
      {tipo === "triangulo" && <path d="M50 14L90 84H10Z" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" />}
      {tipo === "flor" && (
        <>
          <circle cx="50" cy="24" r="22" />
          <circle cx="74" cy="42" r="22" />
          <circle cx="65" cy="71" r="22" />
          <circle cx="35" cy="71" r="22" />
          <circle cx="26" cy="42" r="22" />
          <circle cx="50" cy="50" r="20" />
        </>
      )}
      {tipo === "mancha" && <path d="M50 4C76 1 99 25 96 52C93 79 70 99 44 96C19 93 2 70 5 45C8 19 27 7 50 4Z" />}
    </svg>
  );
}
