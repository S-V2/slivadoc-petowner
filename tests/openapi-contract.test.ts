import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkExchange, loadContract } from "./e2e/openapi-contract.ts";

function contractOf(yaml: string) {
  const file = join(mkdtempSync(join(tmpdir(), "openapi-")), "openapi.yaml");
  writeFileSync(file, yaml);
  return loadContract(file);
}

const contract = contractOf(`
openapi: 3.1.0
paths:
  /api/v1/products/{productID}:
    get:
      responses:
        "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Product" } } } }
        "404": { $ref: "#/components/responses/Error" }
  /api/v1/products/export:
    get:
      responses:
        "200": { content: { application/json: { schema: { type: object, additionalProperties: true } } } }
  /api/v1/products:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string, minLength: 1 }
                price: { type: integer, minimum: 0 }
                code: { type: string, pattern: "^[A-Z]+$" }
      responses:
        "201": { content: { application/json: { schema: { type: object, properties: { id: { type: string } } } } } }
components:
  responses:
    Error:
      content: { application/json: { schema: { type: object, required: [code], properties: { code: { type: string } } } } }
  schemas:
    Product:
      type: object
      required: [id, stock]
      properties:
        id: { type: string, format: uuid }
        stock: { type: [integer, "null"] }
        status: { type: string, enum: [active, archived] }
        kind: { const: product }
`);

test("an exchange must use a documented route and status", () => {
  assert.deepEqual(
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/orders",
      status: 200,
    }),
    ["GET /api/v1/orders: no such operation in api/openapi.yaml"],
  );
  // The literal /export wins over {productID}, whose schema would reject this body.
  assert.deepEqual(
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/products/export",
      status: 200,
      responseBody: { rows: 3 },
    }),
    [],
  );
  assert.deepEqual(
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/products/p1",
      status: 409,
      responseBody: { code: "x" },
    }),
    ["GET /api/v1/products/{productID}: responds 409, which is not documented"],
  );
  assert.deepEqual(
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/products/p1",
      status: 503,
      responseBody: { code: "down" },
    }),
    [],
  );
  assert.deepEqual(
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/products/p1",
      status: 404,
      responseBody: { code: "not_found" },
    }),
    [],
  );
});

test("a response must match its schema and may not invent fields", () => {
  const product = (body: unknown) =>
    checkExchange(contract, {
      method: "GET",
      path: "/api/v1/products/p1",
      status: 200,
      responseBody: body,
    });
  assert.deepEqual(product({ id: "p1", stock: null, status: "active" }), []);
  assert.deepEqual(
    product({
      id: "p1",
      stock: 1.5,
      status: "sold",
      kind: "service",
      colour: "red",
    }),
    [
      "GET /api/v1/products/{productID} 200.stock: expected integer or null, got number",
      'GET /api/v1/products/{productID} 200.status: "sold" is not one of ["active","archived"]',
      'GET /api/v1/products/{productID} 200.kind: "service" is not "product"',
      "GET /api/v1/products/{productID} 200.colour: not in the spec",
    ],
  );
  assert.deepEqual(product({ stock: 2 }), [
    "GET /api/v1/products/{productID} 200.id: required but missing",
  ]);
});

test("a request body must match the operation's request schema", () => {
  assert.deepEqual(
    checkExchange(contract, {
      method: "POST",
      path: "/api/v1/products",
      requestBody: { name: "", price: -1, code: "ab", sku: "A1" },
      status: 201,
      responseBody: { id: "p2" },
    }),
    [
      "POST /api/v1/products request.name: shorter than 1",
      "POST /api/v1/products request.price: -1 < minimum 0",
      "POST /api/v1/products request.code: does not match ^[A-Z]+$",
      "POST /api/v1/products request.sku: not in the spec",
    ],
  );
});

// An unquoted description with commas inside a YAML flow mapping splits into
// extra keys; the checker must reject them rather than ignore the schema.
test("a description split at its commas fails loudly", () => {
  const malformed = contractOf(`
paths:
  /api/v1/orders:
    post:
      requestBody: { content: { application/json: { schema: { type: object, properties: { quote_id: { type: string, description: Quote for this brand, channel and branch } } } } } }
      responses: { "201": { description: created } }
`);
  assert.throws(
    () =>
      checkExchange(malformed, {
        method: "POST",
        path: "/api/v1/orders",
        requestBody: { quote_id: "q1" },
        status: 201,
      }),
    /schema keyword "channel and branch" is not supported/,
  );
});
