// Mocked specs import test and expect from here. With OPENAPI_SPEC set (CI
// reads slivadoc-backend's api/openapi.yaml at main), every exchange a mock
// fakes on the platform API (/api/v1/...) is checked against the spec, and the
// test fails with one line per mismatch after it has run.
import { expect, test as base, type Route } from "@playwright/test";
import { checkExchange, loadContract, type Contract } from "./openapi-contract";

const spec = process.env.OPENAPI_SPEC;
const contract = spec ? loadContract(spec) : undefined;

export { expect };

export const test = base.extend({
  // Playwright's fixture callback, named so the React hooks lint rule does not take it for use().
  page: async ({ page }, provide) => {
    if (!contract) return provide(page);
    const problems: string[] = [];
    const route = page.route.bind(page);
    page.route = ((url, handler, options) =>
      route(
        url,
        (mocked, request) =>
          handler(checked(mocked, contract, problems), request),
        options,
      )) as typeof page.route;
    await provide(page);
    expect(problems, `mocked API exchanges that disagree with ${spec}`).toEqual(
      [],
    );
  },
});

function checked(route: Route, contract: Contract, problems: string[]): Route {
  return new Proxy(route, {
    get(target, property) {
      if (property !== "fulfill") {
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (response: Parameters<Route["fulfill"]>[0] = {}) => {
        const request = target.request();
        const url = new URL(request.url());
        if (
          url.pathname.startsWith("/api/v1/") &&
          request.method() !== "OPTIONS"
        ) {
          let found: string[];
          try {
            found = checkExchange(contract, {
              method: request.method(),
              path: url.pathname,
              requestBody: json(request.postData()),
              status: response.status ?? 200,
              responseBody: response.json ?? json(response.body),
            });
          } catch (error) {
            // An unreadable spec is a mismatch too; still answer, so the test reports it instead of hanging.
            found = [String(error instanceof Error ? error.message : error)];
          }
          for (const problem of found)
            if (!problems.includes(problem)) problems.push(problem);
        }
        return target.fulfill(response);
      };
    },
  });
}

function json(text: unknown): unknown {
  if (typeof text !== "string" || text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
