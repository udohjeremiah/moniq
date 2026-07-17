export { readPackageJson, writePackageJson } from "./package-json.js";
export { getScript, type PackageJson, setScript } from "./scripts.js";
export {
  detectPackageManager,
  discoverWorkspace,
  findWorkspaceRoot,
  type Package,
  type PackageManager,
} from "./workspace.js";
