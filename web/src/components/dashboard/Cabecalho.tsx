const formato = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function Cabecalho({ titulo, hoje }: { titulo: string; hoje: string }) {
  const data = formato.format(new Date(`${hoje}T12:00:00`));
  return (
    <div>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="mt-1 text-sm text-zinc-700">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
    </div>
  );
}
