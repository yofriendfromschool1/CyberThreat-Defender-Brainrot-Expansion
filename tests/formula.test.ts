import { describe, expect, it } from "vitest";
import { evaluateFormula, validateFormula } from "../src/shared/formula.js";

const vars = {
  score: 12,
  hp: 18,
  round: 4,
  lives: 2,
  assets: 3,
  hand: 6,
  deck: 20,
  credits: 7,
  eliminated: false,
  pointsToWin: 30,
  opponents: 2,
};

describe("custom formula interpreter", () => {
  it("evaluates arithmetic with normal precedence", () => {
    expect(evaluateFormula("1 + 2 * 3", vars)).toBe(7);
    expect(evaluateFormula("(1 + 2) * 3", vars)).toBe(9);
    expect(evaluateFormula("10 / 4", vars)).toBe(2.5);
    expect(evaluateFormula("10 % 4", vars)).toBe(2);
    expect(evaluateFormula("-5 + 2", vars)).toBe(-3);
  });

  it("resolves variables and comparisons", () => {
    expect(evaluateFormula("score + assets", vars)).toBe(15);
    expect(evaluateFormula("score + 3 >= pointsToWin / 2", vars)).toBe(true);
    expect(evaluateFormula("hp < 10", vars)).toBe(false);
    expect(evaluateFormula("opponents == 2", vars)).toBe(true);
    expect(evaluateFormula("opponents != 1", vars)).toBe(true);
  });

  it("supports boolean logic and functions", () => {
    expect(evaluateFormula("score > 10 && hp > 10", vars)).toBe(true);
    expect(evaluateFormula("score > 20 || round == 4", vars)).toBe(true);
    expect(evaluateFormula("!eliminated", vars)).toBe(true);
    expect(evaluateFormula("min(score, hp, credits)", vars)).toBe(7);
    expect(evaluateFormula("max(score, hp, credits)", vars)).toBe(18);
    expect(evaluateFormula("abs(0 - 9)", vars)).toBe(9);
    expect(evaluateFormula("floor(9.8)", vars)).toBe(9);
    expect(evaluateFormula("ceil(9.1)", vars)).toBe(10);
  });

  it("treats an empty formula as false", () => {
    expect(evaluateFormula("", vars)).toBe(false);
    expect(evaluateFormula("   ", vars)).toBe(false);
    expect(validateFormula("", vars)).toBeNull();
  });

  it("rejects unknown variables, functions and bad syntax", () => {
    expect(() => evaluateFormula("unknown > 1", vars)).toThrow(/Unknown variable/);
    expect(() => evaluateFormula("process(1)", vars)).toThrow(/Unknown function/);
    expect(() => evaluateFormula("1 +", vars)).toThrow();
    expect(() => evaluateFormula("(1 + 2", vars)).toThrow();
    expect(() => evaluateFormula("1 @ 2", vars)).toThrow(/Unexpected character/);
    expect(validateFormula("score >", vars)).toBeTruthy();
  });

  it("rejects division by zero instead of producing Infinity", () => {
    expect(() => evaluateFormula("score / 0", vars)).toThrow(/Division by zero/);
    expect(() => evaluateFormula("score % (2 - 2)", vars)).toThrow(/Division by zero/);
  });

  it("limits formula length", () => {
    expect(() => evaluateFormula("1".repeat(501), vars)).toThrow(/too long/);
    expect(validateFormula("1".repeat(501), vars)).toMatch(/too long/);
  });

  it("returns a readable validation error", () => {
    expect(validateFormula("score >=", vars)).toBeTruthy();
    expect(validateFormula("score >= pointsToWin", vars)).toBeNull();
  });
});
