import { describe, it, expect } from "vitest";
import { clienteCasaBusca, filtrarClientes } from "./busca-cliente";

const joao = {
  nome: "João Alves de Sá",
  cpf_cnpj: "12345678901",
  email: "joao@exemplo.com",
};
const empresa = {
  nome: "Móveis Cruzeiro Ltda",
  cpf_cnpj: "11222333000181",
  email: null,
};

describe("clienteCasaBusca", () => {
  it("termo vazio casa com todos", () => {
    expect(clienteCasaBusca(joao, "")).toBe(true);
    expect(clienteCasaBusca(joao, "   ")).toBe(true);
  });

  it("casa por nome, acento-insensível dos dois lados", () => {
    expect(clienteCasaBusca(joao, "joao")).toBe(true);
    expect(clienteCasaBusca(joao, "SÁ")).toBe(true);
    expect(clienteCasaBusca(empresa, "moveis")).toBe(true);
  });

  it("casa no meio do nome", () => {
    expect(clienteCasaBusca(joao, "alves")).toBe(true);
  });

  it("casa por e-mail quando existe", () => {
    expect(clienteCasaBusca(joao, "exemplo.com")).toBe(true);
  });

  it("casa pelos dígitos do documento, ignorando pontuação digitada", () => {
    expect(clienteCasaBusca(joao, "123.456")).toBe(true);
    expect(clienteCasaBusca(empresa, "11222333")).toBe(true);
  });

  it("1 dígito não dispara busca por documento", () => {
    expect(clienteCasaBusca(joao, "1")).toBe(false);
  });

  it("sem correspondência retorna false", () => {
    expect(clienteCasaBusca(joao, "cruzeiro")).toBe(false);
  });
});

describe("filtrarClientes", () => {
  it("termo vazio devolve a lista inteira (mesma referência de itens)", () => {
    const lista = [joao, empresa];
    expect(filtrarClientes(lista, "")).toEqual(lista);
  });

  it("filtra pelo termo", () => {
    expect(filtrarClientes([joao, empresa], "cruzeiro")).toEqual([empresa]);
  });
});
