import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { carregarFeriados, datasDoAno, reiniciarFeriados, versaoFeriados } from "./feriados";
import { diasUteis } from "./diasUteis";

const h = (date: string, localName: string, global = true, types = ["Public"]) => ({ date, localName, name: localName, global, types });

/** 2030 como a API o devolve: 13 nacionais, Carnaval (Optional) e um regional. */
const api2030 = [
  h("2030-01-01", "Ano Novo"),
  h("2030-03-05", "Carnaval", true, ["Optional"]),
  h("2030-04-19", "Sexta-Feira Santa"),
  h("2030-04-21", "Páscoa"),
  h("2030-04-25", "Dia da Liberdade"),
  h("2030-05-01", "Dia do Trabalhador"),
  h("2030-06-10", "Dia de Portugal"),
  h("2030-06-20", "Corpo de Deus"),
  h("2030-08-15", "Assunção de Nossa Senhora"),
  h("2030-10-05", "Implantação da República"),
  h("2030-11-01", "Dia de Todos os Santos"),
  h("2030-12-01", "Restauração da Independência"),
  h("2030-12-08", "Imaculada Conceição"),
  h("2030-12-25", "Natal"),
  h("2030-07-01", "Dia da Madeira", false),
];

const resposta = (corpo: unknown, ok = true) => ({ ok, json: () => Promise.resolve(corpo) }) as Response;

describe("feriados nacionais via API", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    reiniciarFeriados();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.useRealTimers());

  it("normaliza os nomes da API para os do cálculo local", async () => {
    const variantes = api2030.map((d) =>
      d.date === "2030-04-21" ? h(d.date, "Domingo de Páscoa") : d.date === "2030-06-10" ? h(d.date, "Dia de Portugal, de Camões e das Comunidades Portuguesas") : d.date === "2030-11-01" ? h(d.date, "Todos-os-Santos") : d,
    );
    fetchMock.mockResolvedValue(resposta(variantes));
    await carregarFeriados(2030);
    const nomes = datasDoAno(2030).map((d) => d.nome);
    expect(nomes).toContain("Páscoa");
    expect(nomes).toContain("Dia de Portugal");
    expect(nomes).toContain("Dia de Todos os Santos");
  });

  it("usa a API quando disponível, filtra regionais e Optional", async () => {
    fetchMock.mockResolvedValue(resposta([...api2030, h("2030-02-12", "Dia especial", true, ["Optional"])]));
    const v0 = versaoFeriados();
    await carregarFeriados(2030);
    expect(versaoFeriados()).toBe(v0 + 1);
    const datas = datasDoAno(2030);
    const feriados = datas.filter((d) => d.tipo === "feriado");
    expect(feriados).toHaveLength(13);
    expect(feriados.map((d) => d.nome)).toContain("Corpo de Deus");
    expect(datas.some((d) => d.iso === "2030-07-01")).toBe(false);
    expect(datas.some((d) => d.iso === "2030-02-12")).toBe(false);
    // Carnaval continua local, como comemorativa
    expect(datas.find((d) => d.nome.startsWith("Carnaval"))?.tipo).toBe("comemorativa");
    expect(fetchMock.mock.calls[0][0]).toBe("https://date.nager.at/api/v3/PublicHolidays/2030/PT");
  });

  it("datas da API substituem o cálculo local (diasUteis incluído)", async () => {
    const alterado = api2030.map((x) => (x.date === "2030-06-10" ? { ...x, date: "2030-06-11" } : x));
    fetchMock.mockResolvedValue(resposta(alterado));
    expect(diasUteis("2030-06-10", "2030-06-11")).toBe(0 + 1); // local: 10 é feriado, 11 conta
    await carregarFeriados(2030);
    expect(diasUteis("2030-06-10", "2030-06-11")).toBe(1); // API: 11 é feriado, 10 conta
    expect(diasUteis("2030-06-10", "2030-06-10")).toBe(1);
    expect(diasUteis("2030-06-11", "2030-06-11")).toBe(0);
  });

  it("não repete o fetch para o mesmo ano (memória e em curso)", async () => {
    fetchMock.mockResolvedValue(resposta(api2030));
    await Promise.all([carregarFeriados(2030), carregarFeriados(2030)]);
    await carregarFeriados(2030);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reaproveita o localStorage sem fetch", async () => {
    fetchMock.mockResolvedValue(resposta(api2030));
    await carregarFeriados(2030);
    reiniciarFeriados(); // nova sessão, localStorage mantém-se
    await carregarFeriados(2030);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(datasDoAno(2030).filter((d) => d.tipo === "feriado")).toHaveLength(13);
  });

  it("cai no cálculo local se o fetch falha", async () => {
    fetchMock.mockRejectedValue(new Error("rede"));
    await carregarFeriados(2030);
    const feriados = datasDoAno(2030).filter((d) => d.tipo === "feriado");
    expect(feriados).toHaveLength(13);
    expect(feriados.some((d) => d.iso === "2030-04-21")).toBe(true); // Páscoa calculada
    await carregarFeriados(2030);
    expect(fetchMock).toHaveBeenCalledTimes(1); // não insiste na mesma sessão
  });

  it("cai no cálculo local com HTTP de erro ou resposta inválida", async () => {
    fetchMock.mockResolvedValueOnce(resposta([], false));
    await carregarFeriados(2031);
    fetchMock.mockResolvedValueOnce(resposta({ erro: true }));
    await carregarFeriados(2032);
    fetchMock.mockResolvedValueOnce(resposta([h("2030-01-01", "Ano de outro ano")]));
    await carregarFeriados(2033);
    for (const ano of [2031, 2032, 2033]) expect(datasDoAno(ano).filter((d) => d.tipo === "feriado")).toHaveLength(13);
  });

  it("cai no cálculo local ao fim de 5 s sem resposta", async () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {}));
    const p = carregarFeriados(2030);
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(datasDoAno(2030).filter((d) => d.tipo === "feriado")).toHaveLength(13);
  });

  it("mantém municipais e comemorativas locais", async () => {
    fetchMock.mockResolvedValue(resposta(api2030));
    await carregarFeriados(2030);
    const datas = datasDoAno(2030, "porto");
    expect(datas.find((d) => d.tipo === "municipal")?.iso).toBe("2030-06-24");
    expect(datas.some((d) => d.nome === "Dia dos Namorados")).toBe(true);
  });
});
