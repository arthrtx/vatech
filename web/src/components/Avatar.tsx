// Avatar redondo: mostra a foto quando houver, senão as iniciais numa superfície fixa por pessoa.

const fundos = ["bg-accent-wash text-accent-ink", "bg-surface-3 text-text-1", "bg-surface-2 text-text-1"];

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
  /** Escolhe a superfície; a mesma pessoa fica sempre com a mesma. */
  id: number;
  foto?: string | null;
  className?: string;
}) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className={`shrink-0 rounded-pill border border-line object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-pill border border-line font-semibold ${fundos[Math.abs(id) % fundos.length]} ${className}`}
    >
      {iniciais(nome)}
    </span>
  );
}
