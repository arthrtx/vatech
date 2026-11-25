import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const atualizarUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 2, nome: "Ana", papel: "estagiario", almoco_inicio: null, almoco_fim: null }, atualizarUser }),
}));
const definirAlmoco = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { definirAlmoco: (...a: unknown[]) => definirAlmoco(...a) },
}));

import HorarioAlmoco from "./HorarioAlmoco";

afterEach(cleanup);

describe("HorarioAlmoco", () => {
  it("guarda o horário e avisa a página", async () => {
    const u = { id: 2, almoco_inicio: "12:30", almoco_fim: "13:30" };
    definirAlmoco.mockResolvedValue(u);
    const onGuardado = vi.fn();
    render(<HorarioAlmoco onGuardado={onGuardado} />);

    const guardar = screen.getByRole("button", { name: "Guardar almoço" });
    expect(guardar).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Almoço das"), { target: { value: "12:30" } });
    fireEvent.change(screen.getByLabelText("até às"), { target: { value: "13:30" } });
    fireEvent.click(guardar);

    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(definirAlmoco).toHaveBeenCalledWith({ almoco_inicio: "12:30", almoco_fim: "13:30" });
    expect(atualizarUser).toHaveBeenCalledWith(u);
  });
});
