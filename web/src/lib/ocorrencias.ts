import type { MotivoOcorrencia, TipoOcorrencia } from "./api";

export const tiposOcorrencia: { valor: TipoOcorrencia; rotulo: string }[] = [
  { valor: "falta", rotulo: "Falta" },
  { valor: "atraso", rotulo: "Atraso" },
];

export const motivosOcorrencia: { valor: MotivoOcorrencia; rotulo: string }[] = [
  { valor: "imprevisto", rotulo: "Imprevisto" },
  { valor: "doenca", rotulo: "Doença" },
  { valor: "transportes", rotulo: "Transportes" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloTipo = (t: TipoOcorrencia) => tiposOcorrencia.find((x) => x.valor === t)?.rotulo ?? t;
export const rotuloMotivo = (m: MotivoOcorrencia) => motivosOcorrencia.find((x) => x.valor === m)?.rotulo ?? m;
