interface Props<T extends string> {
  legenda: string;
  opcoes: { valor: T; rotulo: string }[];
  selecionados: T[];
  onChange: (v: T[]) => void;
}

const base =
  "min-h-11 rounded-full border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";
const normal = "border-linha-forte bg-painel font-medium text-texto hover:bg-primaria-suave";
const ativo = "border-primaria bg-primaria font-semibold text-white hover:bg-primaria-forte";

export default function GrupoChips<T extends string>({ legenda, opcoes, selecionados, onChange }: Props<T>) {
  const alternar = (v: T) =>
    onChange(selecionados.includes(v) ? selecionados.filter((s) => s !== v) : [...selecionados, v]);
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-medium text-texto">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const sel = selecionados.includes(o.valor);
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={sel}
              onClick={() => alternar(o.valor)}
              className={`${base} ${sel ? ativo : normal}`}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
