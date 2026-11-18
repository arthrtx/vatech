import { useRef } from "react";
import { input } from "./ui";

interface Props {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

export default function CampoBusca({ id, rotulo, valor, onChange, placeholder = "Pesquisar" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div role="search" className="relative max-w-md">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M13 13l4 4" />
      </svg>
      <input
        id={id}
        ref={ref}
        type="search"
        autoComplete="off"
        className={`${input} pl-9 pr-20 [&::-webkit-search-cancel-button]:appearance-none`}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      {valor && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
