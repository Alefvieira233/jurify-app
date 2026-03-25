import { redactPII } from "./security.ts";
import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";

Deno.test("redactPII - CPF", () => {
  const input = "O CPF é 123.456.789-00";
  const expected = "O CPF é ***CPF***";
  assertEquals(redactPII(input), expected);
});

Deno.test("redactPII - CNPJ", () => {
  const input = "O CNPJ é 12.345.678/0001-90";
  const expected = "O CNPJ é ***CNPJ***";
  assertEquals(redactPII(input), expected);
});

Deno.test("redactPII - OAB", () => {
  const input = "Advogado OAB SP123456";
  const expected = "Advogado OAB ***OAB***";
  assertEquals(redactPII(input), expected);
});

Deno.test("redactPII - Processo", () => {
  const input = "Processo 1234567-89.2023.8.26.0001";
  const expected = "Processo ***PROCESSO***";
  assertEquals(redactPII(input), expected);
});

Deno.test("redactPII - Email", () => {
  const input = "Contato: teste@exemplo.com.br";
  const expected = "Contato: ***EMAIL***";
  assertEquals(redactPII(input), expected);
});

Deno.test("redactPII - Phone", () => {
  const input = "Telefone (11) 99999-9999";
  const expected = "Telefone ***PHONE***";
  assertEquals(redactPII(input), expected);
});
