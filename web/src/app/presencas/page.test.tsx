import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api";

let papel = "estagiario";
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 2, nome: "Ana", papel, estagio_inicio: "2026-01-05" } }),
}));
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const atrasada = vi.fn();
const presencas = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    presencas: (...a: unknown[]) => presencas(...a),
    funcionarios: vi.fn().mockResolvedValue([]),
    marcarPresencaAtrasada: (...a: unknown[]) => atrasada(...a),
    definirAlmoco: vi.fn(),
  },
}));

import PresencasPage from "./page";

beforeEach(() => {
  papel = "estagiario";
  presencas.mockReset().mockResolvedValue([]);
  atrasada.mockReset();
});
afterEach(cleanup);

const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Esqueci de marcar presença" }));
function preencher(d = "2026-02-03", e = "09:00", s = "17:00") {
  fireEvent.change(screen.getByLabelText("Dia"), { target: { value: d } });
  fireEvent.change(screen.getByLabelText("Entrada"), { target: { value: e } });
  fireEvent.change(screen.getByLabelText("Saída"), { target: { value: s } });
}

describe("Estágio: esqueci de marcar", () => {
  it("o botão só aparece ao estagiário", () => {
    papel = "admin";
    render(<PresencasPage />);
    expect(screen.queryByRole("button", { name: "Esqueci de marcar presença" })).toBeNull();
  });

  it("a etiqueta Atrasada só aparece quando atrasada=true", async () => {
    const base = { user_id: 2, entrada: "2026-02-03T09:00:00", saida: "2026-02-03T17:00:00" };
    presencas.mockResolvedValue([
      { ...base, id: 1, data: "2026-02-03", atrasada: true },
      { ...base, id: 2, data: "2026-02-02", atrasada: false },
    ]);
    render(<PresencasPage />);
    await screen.findAllByRole("row");
    await waitFor(() => expect(screen.getAllByText("Atrasada")).toHaveLength(1));
  });

  it("submete os dados, fecha o formulário e recarrega a lista", async () => {
    atrasada.mockResolvedValue({});
    render(<PresencasPage />);
    await waitFor(() => expect(presencas).toHaveBeenCalledTimes(1));
    abrir();
    expect((screen.getByLabelText("Dia") as HTMLInputElement).min).toBe("2026-01-05");
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Registar" }));
    await waitFor(() => expect(atrasada).toHaveBeenCalledWith({ data: "2026-02-03", entrada: "09:00", saida: "17:00" }));
    await waitFor(() => expect(screen.queryByLabelText("Dia")).toBeNull());
    await waitFor(() => expect(presencas).toHaveBeenCalledTimes(2));
  });

  it("mostra a mensagem da API", async () => {
    atrasada.mockRejectedValue(new ApiError(422, "Já existe presença nesse dia."));
    render(<PresencasPage />);
    abrir();
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Registar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Já existe presença nesse dia.");
  });

  it("valida entrada < saída sem chamar a API", () => {
    render(<PresencasPage />);
    abrir();
    preencher("2026-02-03", "17:00", "09:00");
    fireEvent.click(screen.getByRole("button", { name: "Registar" }));
    expect(screen.getByRole("alert").textContent).toBe("A entrada tem de ser anterior à saída.");
    expect(atrasada).not.toHaveBeenCalled();
  });

  it("Cancelar e Escape fecham sem chamar a API", () => {
    render(<PresencasPage />);
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("Dia")).toBeNull();
    abrir();
    fireEvent.keyDown(screen.getByLabelText("Dia"), { key: "Escape" });
    expect(screen.queryByLabelText("Dia")).toBeNull();
    expect(atrasada).not.toHaveBeenCalled();
  });
});
