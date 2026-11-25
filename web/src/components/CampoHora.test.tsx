import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CampoHora, { lerHora, mascaraHora } from "./CampoHora";

afterEach(cleanup);

describe("mascaraHora", () => {
  it("põe os dois pontos enquanto se escreve", () => {
    expect(mascaraHora("09", "0")).toBe("09:");
    expect(mascaraHora("0930", "09:3")).toBe("09:30");
  });
  it("não volta a pôr os dois pontos ao apagar", () => expect(mascaraHora("09", "09:")).toBe("09"));
  it("completa a hora com zero", () => {
    expect(mascaraHora("9", "")).toBe("09:");
    expect(mascaraHora("9:", "9")).toBe("09:");
  });
});

describe("lerHora", () => {
  it("aceita horas válidas e recusa as outras", () => {
    expect(lerHora("9:05")).toBe("09:05");
    expect(lerHora("23:59")).toBe("23:59");
    expect(lerHora("24:00")).toBeNull();
    expect(lerHora("12:60")).toBeNull();
  });
});

describe("CampoHora", () => {
  it("escreve com máscara e só envia a hora completa", () => {
    const onChange = vi.fn();
    render(<CampoHora id="h" valor="" onChange={onChange} />);
    const campo = screen.getByPlaceholderText("hh:mm");
    fireEvent.change(campo, { target: { value: "12" } });
    expect((campo as HTMLInputElement).value).toBe("12:");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: "12:30" } });
    expect(onChange).toHaveBeenCalledWith("12:30");
  });

  it("escolhe no relógio", () => {
    const onChange = vi.fn();
    render(<CampoHora id="h" valor="" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Abrir relógio"));
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    expect(onChange).toHaveBeenLastCalledWith("14:00");
    fireEvent.click(screen.getByRole("button", { name: "45" }));
    expect(onChange).toHaveBeenLastCalledWith("00:45");
  });
});
