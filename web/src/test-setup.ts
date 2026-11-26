import { vi } from "vitest";

// Sem rede nos testes: a API de feriados falha e fica o cálculo local (fallback).
vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("sem rede nos testes"))));
