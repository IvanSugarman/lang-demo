import { tool } from "langchain";
import * as z from "zod";

/**
 * 技术栈建议输入。
 */
type SuggestTechStackInput = {
  /** 主题描述。 */
  topic: string;
};

/**
 * 获取简单的技术栈建议。
 * @description 根据输入主题返回最小可行的技术栈建议。
 * @param {SuggestTechStackInput} input 主题输入
 * @return {string}
 */
function suggestTechStack(input: SuggestTechStackInput): string {
  return [
    `Suggested stack for ${input.topic}:`,
    "- Runtime: Node.js",
    "- Language: TypeScript",
    "- Tooling: ESLint + Prettier",
    "- Package manager: npm",
  ].join("\n");
}

/**
 * 创建技术栈建议工具。
 * @description 暴露一个用于返回最小技术栈建议的工具。
 * @return {ReturnType<typeof tool>}
 */
export function createSuggestTechStackTool() {
  return tool(({ topic }) => suggestTechStack({ topic }), {
    name: "suggest_tech_stack",
    description: "Suggest a minimal technical stack for a coding task.",
    schema: z.object({
      topic: z.string().describe("The coding topic or feature to plan for."),
    }),
  });
}
