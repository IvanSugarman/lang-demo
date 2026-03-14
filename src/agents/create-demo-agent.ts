import { createAgent } from "langchain";
import type { RuntimeConfig } from "../config/runtime-config.ts";
import { createArkModel } from "../models/create-ark-model.ts";
import { createInspectProjectTool } from "../tools/inspect-project-tool.ts";
import { createSuggestTechStackTool } from "../tools/suggest-tech-stack-tool.ts";
import { createTavilySearchTool } from "../tools/tavily-search-tool.ts";

/**
 * Demo Agent 实例类型。
 */
export type DemoAgent = ReturnType<typeof createAgent>;

/**
 * 系统提示词，约束 agent 的输出风格。
 */
const SYSTEM_PROMPT = `
你是一名资深编码助手。

在解决用户请求时：
1. 优先给出具体、可执行的实现步骤。
2. 在可以提升可靠性时，优先使用可用的工具。
3. 回答要尽量简洁，但保证对落地实现有指导意义。
4. 当工具返回的结果已经足够时，不要额外编造事实。
`.trim();

/**
 * 创建最小 agent。
 * @description 保持和 quickstart 一致的 model + tools + invoke 结构。
 * @param {RuntimeConfig} config 运行时配置
 * @return {DemoAgent}
 */
export function createDemoAgent(config: RuntimeConfig): DemoAgent {
  /** ARK 模型实例。 */
  const model = createArkModel(config);
  /** 项目结构工具。 */
  const inspectProjectTool = createInspectProjectTool();
  /** 技术栈建议工具。 */
  const suggestTechStackTool = createSuggestTechStackTool();
  /** Tavily 搜索工具。 */
  const tavilySearchTool = createTavilySearchTool({
    apiKey: config.tavilyApiKey,
  });

  return createAgent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    tools: [inspectProjectTool, suggestTechStackTool, tavilySearchTool],
  });
}
