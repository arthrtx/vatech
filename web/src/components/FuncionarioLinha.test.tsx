import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FuncionarioLinha from "./FuncionarioLinha";
import type { User } from "@/lib/api";

afterEach(cleanup);

const user: User = { id: 3, nome: "Rui", email: "rui@x.pt", papel: "funcionario", empresa_id: 1 };

describe("FuncionarioLinha", () => {
  it("mostra o ID da conta no cartão", () => {
    render(
      <ul>
        <FuncionarioLinha user={user} />
      </ul>,
    );
    expect(screen.getByText("ID 3")).toBeTruthy();
  });

  it("é só de leitura: sem Editar nem Apagar, e clicar abre a vista", () => {
    const onVer = vi.fn();
    render(
      <ul>
        <FuncionarioLinha user={user} onVer={onVer} />
      </ul>,
    );
    expect(screen.queryByRole("button", { name: /Editar|Apagar/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver Rui" }));
    expect(onVer).toHaveBeenCalled();
  });

  it("mostra as pontes descontadas ao saldo, só quando há", () => {
    const f = { user_id: 3, nome: "Rui", dias_ano: 22, dias_max: 25, transitados: 0, usados: 5, por_marcar: 17 };
    const { rerender } = render(
      <ul>
        <FuncionarioLinha user={user} ferias={{ ...f, pontes: 3 }} />
      </ul>,
    );
    expect(screen.getByText("Pontes: 3 dias")).toBeTruthy();
    rerender(
      <ul>
        <FuncionarioLinha user={user} ferias={{ ...f, pontes: 0 }} />
      </ul>,
    );
    expect(screen.queryByText(/Pontes:/)).toBeNull();
  });

  it("mostra o cargo por baixo do email só quando existe", () => {
    const { rerender } = render(
      <ul>
        <FuncionarioLinha user={{ ...user, cargo: "Programador" }} onVer={() => {}} />
      </ul>,
    );
    expect(screen.getByText("Programador")).toBeTruthy();
    rerender(
      <ul>
        <FuncionarioLinha user={{ ...user, cargo: null }} onVer={() => {}} />
      </ul>,
    );
    expect(screen.queryByText("Programador")).toBeNull();
  });
});
