// Checks the API exchanges a mocked Playwright spec fakes against
// slivadoc-backend's api/openapi.yaml, so a mock cannot keep a test green
// against an API that does not exist. The route must be documented, a JSON
// request body must match the operation's request schema, and a JSON response
// must use a documented status and match that response's schema.
//
// Stricter than JSON Schema on purpose: an object schema that lists its
// properties, without allowing others, rejects undocumented properties. The
// API rejects unknown request fields (httpx.DecodeJSON), and a response field
// the spec lacks is one the mock invented or the spec forgot.
import { readFileSync } from "node:fs";
import { parse } from "yaml";

type Node = Record<string, unknown>;
type Operation = {
  method: string;
  template: string;
  pattern: RegExp;
  literals: number;
  spec: Node;
};
export type Contract = { document: Node; operations: Operation[] };
export type Exchange = {
  method: string;
  path: string;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
};

const httpMethods: Record<string, true> = {
  get: true,
  put: true,
  post: true,
  delete: true,
  patch: true,
  head: true,
};
// Annotations change nothing; any other keyword this checker does not know throws.
const keywords: Record<string, true> = {
  description: true,
  title: true,
  deprecated: true,
  default: true,
  example: true,
  examples: true,
  format: true,
  readOnly: true,
  writeOnly: true,
  $ref: true,
  type: true,
  enum: true,
  allOf: true,
  oneOf: true,
  properties: true,
  required: true,
  additionalProperties: true,
  items: true,
  minItems: true,
  maxItems: true,
  uniqueItems: true,
  minimum: true,
  maximum: true,
  minLength: true,
  maxLength: true,
  const: true,
  pattern: true,
};

export function loadContract(file: string): Contract {
  const document = parse(readFileSync(file, "utf8")) as Node;
  const operations: Operation[] = [];
  for (const [template, item] of Object.entries(
    document.paths as Record<string, Node>,
  )) {
    const segments = template.split("/");
    const pattern = new RegExp(
      `^${segments
        .map((segment) =>
          /^\{[^}]+\}$/.test(segment)
            ? "[^/]+"
            : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/")}$`,
    );
    const literals = segments.filter(
      (segment) => !segment.startsWith("{"),
    ).length;
    for (const [method, spec] of Object.entries(item)) {
      if (httpMethods[method]) {
        operations.push({
          method: method.toUpperCase(),
          template,
          pattern,
          literals,
          spec: spec as Node,
        });
      }
    }
  }
  // A literal segment wins over a parameter: /products/export before /products/{productID}.
  operations.sort((a, b) => b.literals - a.literals);
  return { document, operations };
}

/** @returns one line per mismatch, empty when the exchange matches the spec */
export function checkExchange(
  contract: Contract,
  exchange: Exchange,
): string[] {
  const operation = contract.operations.find(
    (candidate) =>
      candidate.method === exchange.method &&
      candidate.pattern.test(exchange.path),
  );
  if (!operation)
    return [
      `${exchange.method} ${exchange.path}: no such operation in api/openapi.yaml`,
    ];
  const at = `${operation.method} ${operation.template}`;
  const problems: string[] = [];
  if (exchange.requestBody !== undefined) {
    const schema = jsonSchema(contract, operation.spec.requestBody);
    if (schema)
      validate(
        contract,
        schema,
        exchange.requestBody,
        `${at} request`,
        problems,
      );
    else
      problems.push(`${at}: sends a JSON body the operation does not document`);
  }
  if (exchange.responseBody !== undefined) {
    const responses = (operation.spec.responses ?? {}) as Node;
    const status = String(exchange.status);
    const response =
      responses[status] ?? responses[`${status[0]}XX`] ?? responses.default;
    if (!response) {
      // Outages (5XX) can answer any route; the spec lists them only where the API itself returns them.
      if (exchange.status < 500)
        problems.push(`${at}: responds ${status}, which is not documented`);
    } else {
      const schema = jsonSchema(contract, response);
      if (schema)
        validate(
          contract,
          schema,
          exchange.responseBody,
          `${at} ${status}`,
          problems,
        );
    }
  }
  return problems;
}

function jsonSchema(contract: Contract, node: unknown): Node | undefined {
  let current = node as Node | undefined;
  while (typeof current?.$ref === "string")
    current = pointer(contract, current.$ref);
  const content = current?.content as Record<string, Node> | undefined;
  return content?.["application/json"]?.schema as Node | undefined;
}

function pointer(contract: Contract, ref: string): Node {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  let current: unknown = contract.document;
  for (const token of ref.slice(2).split("/")) {
    current = (current as Node | undefined)?.[
      token.replaceAll("~1", "/").replaceAll("~0", "~")
    ];
  }
  if (current === undefined) throw new Error(`unresolved $ref ${ref}`);
  return current as Node;
}

// strict is false for allOf parts and oneOf options: their siblings document
// the other properties.
function validate(
  contract: Contract,
  schema: Node,
  value: unknown,
  path: string,
  problems: string[],
  strict = true,
): void {
  for (const keyword of Object.keys(schema)) {
    if (!keywords[keyword]) {
      throw new Error(
        `${path}: schema keyword "${keyword}" is not supported by e2e/openapi-contract.ts`,
      );
    }
  }
  if (typeof schema.$ref === "string") {
    validate(
      contract,
      pointer(contract, schema.$ref),
      value,
      path,
      problems,
      strict,
    );
  }
  if (schema.type !== undefined) {
    const types = [schema.type].flat() as string[];
    if (!types.some((type) => isType(type, value))) {
      const got =
        value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
      problems.push(`${path}: expected ${types.join(" or ")}, got ${got}`);
      return;
    }
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    problems.push(
      `${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`,
    );
  }
  if (
    "const" in schema &&
    JSON.stringify(schema.const) !== JSON.stringify(value)
  ) {
    problems.push(
      `${path}: ${JSON.stringify(value)} is not ${JSON.stringify(schema.const)}`,
    );
  }
  for (const part of (schema.allOf as Node[] | undefined) ?? []) {
    validate(contract, part, value, path, problems, false);
  }
  if (Array.isArray(schema.oneOf)) {
    const matching = schema.oneOf.filter((option) => {
      const found: string[] = [];
      validate(contract, option as Node, value, path, found, false);
      return found.length === 0;
    }).length;
    if (matching !== 1)
      problems.push(
        `${path}: matches ${matching} of its oneOf schemas, want exactly 1`,
      );
  }
  if (isObject(value)) {
    const properties = (schema.properties ?? {}) as Record<string, Node>;
    for (const name of Array.isArray(schema.required)
      ? (schema.required as string[])
      : []) {
      if (!(name in value))
        problems.push(`${path}.${name}: required but missing`);
    }
    const closed =
      strict &&
      schema.properties !== undefined &&
      (schema.additionalProperties === undefined ||
        schema.additionalProperties === false) &&
      schema.allOf === undefined &&
      schema.oneOf === undefined;
    for (const [name, child] of Object.entries(value)) {
      if (properties[name])
        validate(
          contract,
          properties[name],
          child,
          `${path}.${name}`,
          problems,
        );
      else if (isObject(schema.additionalProperties)) {
        validate(
          contract,
          schema.additionalProperties,
          child,
          `${path}.${name}`,
          problems,
        );
      } else if (closed) problems.push(`${path}.${name}: not in the spec`);
    }
  }
  if (Array.isArray(value)) {
    if (isObject(schema.items)) {
      value.forEach((item, index) =>
        validate(
          contract,
          schema.items as Node,
          item,
          `${path}[${index}]`,
          problems,
        ),
      );
    }
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      problems.push(
        `${path}: ${value.length} items, want at least ${schema.minItems}`,
      );
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      problems.push(
        `${path}: ${value.length} items, want at most ${schema.maxItems}`,
      );
    }
    if (
      schema.uniqueItems === true &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    ) {
      problems.push(`${path}: items are not unique`);
    }
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum)
      problems.push(`${path}: ${value} < minimum ${schema.minimum}`);
    if (typeof schema.maximum === "number" && value > schema.maximum)
      problems.push(`${path}: ${value} > maximum ${schema.maximum}`);
  }
  if (typeof value === "string") {
    const length = [...value].length;
    if (typeof schema.minLength === "number" && length < schema.minLength)
      problems.push(`${path}: shorter than ${schema.minLength}`);
    if (typeof schema.maxLength === "number" && length > schema.maxLength)
      problems.push(`${path}: longer than ${schema.maxLength}`);
    // JSON Schema patterns are ECMA-262 and unanchored, as RegExp.test is.
    if (
      typeof schema.pattern === "string" &&
      !new RegExp(schema.pattern, "u").test(value)
    )
      problems.push(`${path}: does not match ${schema.pattern}`);
  }
}

function isType(type: string, value: unknown): boolean {
  switch (type) {
    case "null":
      return value === null;
    case "boolean":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return Number.isInteger(value);
    case "array":
      return Array.isArray(value);
    case "object":
      return isObject(value);
    default:
      throw new Error(`unknown schema type "${type}"`);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
