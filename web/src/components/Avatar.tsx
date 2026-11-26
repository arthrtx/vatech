// Avatar redondo: mostra a foto quando houver, senão as iniciais numa cor fixa por pessoa.

const fundos = ["bg-rosa/20", "bg-violeta/30", "bg-positivo/25", "bg-laranja/30", "bg-pessego/45"];

export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Avatar({
  nome,
  id,
  foto,
  className = "h-10 w-10 text-sm",
}: {
  nome: string;
  /** Escolhe a cor; a mesma pessoa fica sempre com a mesma. */
  id: number;
  foto?: string | null;
  className?: string;
}) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-texto ring-1 ring-linha ${fundos[Math.abs(id) % fundos.length]} ${className}`}
    >
      {iniciais(nome)}
    </span>
  );
}
