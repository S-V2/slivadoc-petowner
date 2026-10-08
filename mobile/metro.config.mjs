import metro from "expo/metro-config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const config = metro.getDefaultConfig(projectRoot);
// Native and web consume the same pure navigation and prerequisite rules.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(projectRoot, "../shared")])];

export default config;
