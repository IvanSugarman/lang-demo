import { tool } from "langchain";
import * as z from "zod";

/**
 * 获取本地项目结构说明。
 * @description 提供给 agent 一个稳定的本地项目概览。
 * @return {string}
 */
function getProjectOverview(): string {
  return [
    "Project layout:",
    "- package.json: project manifest",
    "- src/langchain-ark-demo.ts: demo entry",
    "- src/tools: tool implementations",
    "- tsconfig.json: TypeScript config",
  ].join("\n");
}

/**
 * 创建项目结构工具。
 * @description 暴露一个用于读取当前 demo 项目结构的工具。
 * @return {ReturnType<typeof tool>}
 */
export function createInspectProjectTool() {
  return tool(() => getProjectOverview(), {
    name: "inspect_project",
    description: "Read the current demo project structure.",
    schema: z.object({}),
  });
}
