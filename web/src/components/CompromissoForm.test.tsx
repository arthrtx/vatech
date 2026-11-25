import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const criar = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { criarCompromisso: (...a: unknown[]) => criar(...a) },
}));

import { ApiError } from "@/lib/api";
import CompromissoForm from "./CompromissoForm";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const enviar = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement);

describe("CompromissoForm", () => {
  it("marca um compromisso com hora e devolve-o", async () => {
    const guardado = { id: 1, data: "2099-01-05", titulo: "Reunião", tipo: "reuniao", hora_inicio: "10:00", hora_fim: "11:00", descricao: null };
    criar.mockResolvedValue(guardado);
    const aoCriar = vi.fn();
    render(<CompromissoForm dataInicial="2099-01-05" aoCriar={aoCriar} aoCancelar={() => {}} />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "  Reunião " } });
    const [inicio, fim] = screen.getAllByPlaceholderText("hh:mm");
    fireEvent.change(inicio, { target: { value: "10:00" } });
    fireEvent.change(fim, { target: { value: "11:00" } });
    enviar();

    await waitFor(() => expect(aoCriar).toHaveBeenCalledWith(guardado));
    expect(criar).toHaveBeenCalledWith({ data: "2099-01-05", titulo: "Reunião", tipo: "reuniao", hora_inicio: "10:00", hora_fim: "11:00" });
  });

  it("sem hora marca o dia todo", async () => {
    criar.mockResolvedValue({ id: 2 });
    render(<CompromissoForm dataInicial="2099-01-05" aoCriar={() => {}} aoCancelar={() => {}} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Lembrete" } });
    enviar();
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar.mock.calls[0][0]).toEqual({ data: "2099-01-05", titulo: "Lembrete", tipo: "reuniao" });
  });

  it("recusa hora de fim antes do início sem chamar a API", () => {
    render(<CompromissoForm dataInicial="2099-01-05" aoCriar={() => {}} aoCancelar={() => {}} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "X" } });
    const [inicio, fim] = screen.getAllByPlaceholderText("hh:mm");
    fireEvent.change(inicio, { target: { value: "11:00" } });
    fireEvent.change(fim, { target: { value: "10:00" } });
    enviar();
    expect(screen.getByRole("alert").textContent).toContain("depois da hora de início");
    expect(criar).not.toHaveBeenCalled();
  });

  it("mostra o erro da API", async () => {
    criar.mockRejectedValue(new ApiError(422, "x", { data: ["Só é possível marcar para hoje ou para dias seguintes."] }));
    render(<CompromissoForm dataInicial="2099-01-05" aoCriar={() => {}} aoCancelar={() => {}} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "X" } });
    enviar();
    expect((await screen.findByRole("alert")).textContent).toContain("hoje ou para dias seguintes");
  });
});
