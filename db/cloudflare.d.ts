declare module "cloudflare:workers" {
  export const env: {
    // Hosting may not have provisioned a database yet; getDb validates the binding.
    DB?: import("@cloudflare/workers-types/index").D1Database;
  };
}
