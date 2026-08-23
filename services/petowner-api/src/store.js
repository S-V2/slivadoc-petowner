import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const emptyState = {
  posts: [],
  messages: {},
};

export class JsonStore {
  constructor(filePath) {
    this.filePath = resolve(filePath);
    this.state = structuredClone(emptyState);
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8"));
      this.state = {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        messages: parsed.messages && typeof parsed.messages === "object" ? parsed.messages : {},
      };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await this.persist();
    }
    return this.state;
  }

  snapshot() {
    return structuredClone(this.state);
  }

  async update(mutator) {
    const result = mutator(this.state);
    await this.persist();
    return result;
  }

  async persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      const temporary = `${this.filePath}.tmp`;
      await writeFile(temporary, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
      await rename(temporary, this.filePath);
    });
    return this.writeQueue;
  }
}
