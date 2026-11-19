interface Props<T extends string> {
  legenda: string;
  opcoes: { valor: T; rotulo: string }[];
  selecionados: T[];
  onChange: (v: T[]) => void;
}

const base =
  "min-h-11 rounded-controlo px-4 py-2 text-sm text-texto hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const normal = "border border-linha-forte bg-painel font-medium";
const ativo = "border-2 border-primaria bg-primaria-suave px-[15px] py-[7px] font-bold";

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
