import { Client } from "langsmith";
import { createDemoAgent } from "./agents/create-demo-agent.ts";
import {
  assertRuntimeConfig,
  readRuntimeConfig,
} from "./config/runtime-config.ts";
import { formatAgentResponse } from "./formatters/format-agent-response.ts";

/**
 * 运行 demo。
 * @description 构造 agent 并执行一次最小对话调用。
 * @return {Promise<void>}
 */
export async function runDemo(): Promise<void> {
  /** 运行时配置。 */
  const config = readRuntimeConfig();
  assertRuntimeConfig(config);
  /** LangSmith 客户端。 */
  const langsmithClient = new Client();

  /** 当前 demo agent。 */
  const agent = createDemoAgent(config);
  /** Agent 的执行结果。 */
  const response = await agent.invoke({
    messages: [
      {
        role: "user",
        content: config.prompt,
      },
    ],
  }, {
    runName: "ark_langchain_demo",
    tags: ["demo", "langchain", "ark", "langsmith"],
    metadata: {
      provider: "volcengine-ark",
      model: config.model,
      langsmithProject: config.langsmithProject,
    },
  });

  console.log("=== ARK LangChain Demo ===");
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`Model: ${config.model}`);
  console.log(`用户问题: ${config.prompt}`);
  if (config.tracingEnabled) {
    console.log(`LangSmith Project: ${config.langsmithProject}`);
  }
  console.log("");
  console.log(formatAgentResponse(response));

  if (config.tracingEnabled) {
    await langsmithClient.awaitPendingTraceBatches();
  }
}
