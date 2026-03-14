import "dotenv/config";
import { pathToFileURL } from "node:url";
import { runDemo } from "./run-demo.ts";

/**
 * 当前文件是否作为主入口执行。
 */
const isMainModule =
  process.argv[1] != null &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  runDemo().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
