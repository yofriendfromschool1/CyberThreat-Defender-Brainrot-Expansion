/**
 * A tiny, dependency-free formula interpreter for custom win/lose rules.
 * It supports arithmetic, comparisons, booleans, parentheses and min/max/abs.
 * No JavaScript evaluation is used, so host formulas cannot execute code.
 */

export type FormulaValue = number | boolean;
export type FormulaVariables = Record<string, number | boolean>;

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," }
  | { type: "eof"; value: "" };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let raw = "";
      while (index < source.length && /[0-9.]/.test(source[index]!)) {
        raw += source[index];
        index += 1;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number "${raw}" at character ${index}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let raw = "";
      while (index < source.length && /[a-zA-Z0-9_]/.test(source[index]!)) {
        raw += source[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value: raw });
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      index += 1;
      continue;
    }
    const two = source.slice(index, index + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      tokens.push({ type: "operator", value: two });
      index += 2;
      continue;
    }
    if (["+", "-", "*", "/", "%", "<", ">", "!"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    throw new Error(`Unexpected character "${char}" at position ${index + 1}`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class FormulaParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: FormulaVariables,
  ) {}

  parse(): FormulaValue {
    const value = this.parseOr();
    if (this.peek().type !== "eof") {
      throw new Error(`Unexpected token near "${this.peek().value}"`);
    }
    return value;
  }

  private peek(): Token {
    return this.tokens[this.index]!;
  }

  private take(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  private peekOperator(value?: string): boolean {
    const token = this.peek();
    return token.type === "operator" && (value === undefined || token.value === value);
  }

  private takeOperator(): string {
    const token = this.take();
    if (token.type !== "operator") {
      throw new Error(`Expected an operator near "${token.value}"`);
    }
    return token.value;
  }

  private parseOr(): FormulaValue {
    let left = this.parseAnd();
    while (this.peekOperator("||")) {
      this.takeOperator();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): FormulaValue {
    let left = this.parseEquality();
    while (this.peekOperator("&&")) {
      this.takeOperator();
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): FormulaValue {
    let left = this.parseComparison();
    while (this.peekOperator("==") || this.peekOperator("!=")) {
      const operator = this.takeOperator();
      const right = this.parseComparison();
      left = operator === "==" ? left === right : left !== right;
    }
    return left;
  }

  private parseComparison(): FormulaValue {
    let left = this.parseAdditive();
    while (this.peekOperator("<") || this.peekOperator("<=") || this.peekOperator(">") || this.peekOperator(">=")) {
      const operator = this.takeOperator();
      const right = this.parseAdditive();
      const a = Number(left);
      const b = Number(right);
      if (operator === "<") left = a < b;
      else if (operator === "<=") left = a <= b;
      else if (operator === ">") left = a > b;
      else left = a >= b;
    }
    return left;
  }

  private parseAdditive(): FormulaValue {
    let left = this.parseMultiplicative();
    while (this.peekOperator("+") || this.peekOperator("-")) {
      const operator = this.takeOperator();
      const right = this.parseMultiplicative();
      left = operator === "+" ? Number(left) + Number(right) : Number(left) - Number(right);
    }
    return left;
  }

  private parseMultiplicative(): FormulaValue {
    let left = this.parseUnary();
    while (this.peekOperator("*") || this.peekOperator("/") || this.peekOperator("%")) {
      const operator = this.takeOperator();
      const right = this.parseUnary();
      if ((operator === "/" || operator === "%") && Number(right) === 0) {
        throw new Error("Division by zero in formula");
      }
      if (operator === "*") left = Number(left) * Number(right);
      else if (operator === "/") left = Number(left) / Number(right);
      else left = Number(left) % Number(right);
    }
    return left;
  }

  private parseUnary(): FormulaValue {
    const token = this.peek();
    if (token.type === "operator" && token.value === "!") {
      this.take();
      return !this.parseUnary();
    }
    if (token.type === "operator" && token.value === "-") {
      this.take();
      return -Number(this.parseUnary());
    }
    if (token.type === "operator" && token.value === "+") {
      this.take();
      return Number(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaValue {
    const token = this.take();
    if (token.type === "number") return token.value;
    if (token.type === "identifier") {
      const functions: Record<string, (values: number[]) => number> = {
        min: (values) => Math.min(...values),
        max: (values) => Math.max(...values),
        abs: (values) => Math.abs(values[0] ?? 0),
        floor: (values) => Math.floor(values[0] ?? 0),
        ceil: (values) => Math.ceil(values[0] ?? 0),
      };
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (this.peek().type === "paren" && this.peek().value === "(") {
        const fn = functions[token.value];
        if (!fn) throw new Error(`Unknown function "${token.value}"`);
        this.take();
        const args: number[] = [];
        if (!(this.peek().type === "paren" && this.peek().value === ")")) {
          args.push(Number(this.parseOr()));
          while (this.peek().type === "comma") {
            this.take();
            args.push(Number(this.parseOr()));
          }
        }
        if (!(this.peek().type === "paren" && this.peek().value === ")")) {
          throw new Error(`Expected ")" after ${token.value}(`);
        }
        this.take();
        return fn(args);
      }
      if (!(token.value in this.variables)) {
        throw new Error(`Unknown variable "${token.value}"`);
      }
      return this.variables[token.value]!;
    }
    if (token.type === "paren" && token.value === "(") {
      const value = this.parseOr();
      if (!(this.peek().type === "paren" && this.peek().value === ")")) {
        throw new Error('Expected ")"');
      }
      this.take();
      return value;
    }
    throw new Error(`Unexpected token "${token.value}"`);
  }
}

export function evaluateFormula(source: string, variables: FormulaVariables): FormulaValue {
  if (!source.trim()) return false;
  if (source.length > 500) {
    throw new Error("Formula is too long (maximum 500 characters)");
  }
  return new FormulaParser(tokenize(source), variables).parse();
}

export function validateFormula(source: string, sampleVariables: FormulaVariables): string | null {
  if (!source.trim()) return null;
  try {
    evaluateFormula(source, sampleVariables);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export const FORMULA_HELP =
  "Variables: score, hp, round, lives, assets, hand, deck, credits, eliminated, pointsToWin, opponents. " +
  "Operators: + - * / % < <= > >= == != && || !. Functions: min, max, abs, floor, ceil. " +
  "Example: score >= pointsToWin && opponents == 0";
