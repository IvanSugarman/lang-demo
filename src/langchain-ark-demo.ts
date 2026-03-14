import "dotenv/config";
import { pathToFileURL } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import { Client } from "langsmith";
import * as z from "zod";

/**
 * 运行时配置。
 */
type RuntimeConfig = {
  /** ARK API Key。 */
  apiKey: string;
  /** ARK 模型标识。 */
  model: string;
  /** ARK OpenAI 兼容地址。 */
  baseURL: string;
  /** 用户输入的问题。 */
  prompt: string;
  /** 是否启用 LangSmith tracing。 */
  tracingEnabled: boolean;
  /** LangSmith 项目名。 */
  langsmithProject: string;
  /** Tavily API Key。 */
  tavilyApiKey: string;
};

/**
 * Demo Agent 实例类型。
 */
type DemoAgent = ReturnType<typeof createAgent>;

/**
 * Tavily 搜索输入。
 */
type TavilySearchInput = {
  /** 搜索关键词。 */
  query: string;
  /** 搜索主题。 */
  topic?: "general" | "news";
  /** 搜索深度。 */
  searchDepth?: "basic" | "advanced" | "fast" | "ultra-fast";
  /** 返回结果数。 */
  maxResults?: number;
};

/**
 * Tavily 单条搜索结果。
 */
type TavilySearchResult = {
  /** 搜索结果标题。 */
  title: string;
  /** 搜索结果链接。 */
  url: string;
  /** 搜索结果摘要。 */
  content: string;
  /** 搜索结果分数。 */
  score?: number;
};

/**
 * Tavily 搜索响应。
 */
type TavilySearchResponse = {
  /** 原始查询。 */
  query: string;
  /** 搜索答案。 */
  answer?: string;
  /** 搜索结果列表。 */
  results?: TavilySearchResult[];
};

/**
 * Tavily 依赖注入配置。
 */
type TavilyDependencies = {
  /** Tavily API Key。 */
  apiKey?: string;
  /** Tavily 请求地址。 */
  endpoint?: string;
  /** 自定义 fetch 实现。 */
  fetchImpl?: typeof fetch;
};

/**
 * 当前文件是否作为主入口执行。
 */
const isMainModule =
  process.argv[1] != null &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

/**
 * 默认的用户问题。
 */
const DEFAULT_PROMPT =
  "请设计一个最小的 TypeScript 工具函数，并说明你会采用的项目目录结构。";

/**
 * ARK Coding Plan 的默认模型标识。
 */
const DEFAULT_ARK_MODEL = "ark-code-latest";

/**
 * Tavily Search API 地址。
 */
const DEFAULT_TAVILY_ENDPOINT = "https://api.tavily.com/search";

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
 * 根据环境变量读取配置。
 * @return {RuntimeConfig}
 */
function readRuntimeConfig(): RuntimeConfig {
  /** ARK API Key。 */
  const apiKey = process.env.ARK_API_KEY ?? "";
  /** ARK 模型名。 */
  const model = process.env.ARK_CODING_MODEL ?? DEFAULT_ARK_MODEL;
  /** ARK 兼容接口地址。 */
  const baseURL = process.env.ARK_BASE_URL ?? "";
  /** 当前会话的用户问题。 */
  const prompt = process.argv.slice(2).join(" ").trim() || DEFAULT_PROMPT;
  /** 是否启用 LangSmith tracing。 */
  const tracingEnabled = process.env.LANGSMITH_TRACING === "true";
  /** LangSmith 项目名。 */
  const langsmithProject = process.env.LANGSMITH_PROJECT ?? "default";
  /** Tavily API Key。 */
  const tavilyApiKey = process.env.TAVILY_API_KEY ?? "";

  return {
    apiKey,
    model,
    baseURL,
    prompt,
    tracingEnabled,
    langsmithProject,
    tavilyApiKey,
  };
}

/**
 * 校验运行所需的环境变量。
 * @description 缺少关键配置时直接抛错，避免把错误带到模型调用阶段。
 * @param {RuntimeConfig} config 运行时配置
 * @return {void}
 */
function assertRuntimeConfig(config: RuntimeConfig): void {
  if (config.apiKey && config.baseURL) {
    return;
  }

  throw new Error(
    [
      "Missing ARK_API_KEY or ARK_BASE_URL.",
      "Example:",
      "ARK_API_KEY=your-api-key ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3 npm run demo",
    ].join("\n"),
  );
}

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
    "- tsconfig.json: TypeScript config",
  ].join("\n");
}

/**
 * 获取简单的技术栈建议。
 * @description 根据输入主题返回最小可行的技术栈建议。
 * @param {{ topic: string }} input 主题输入
 * @return {string}
 */
function suggestTechStack(input: { topic: string }): string {
  return [
    `Suggested stack for ${input.topic}:`,
    "- Runtime: Node.js",
    "- Language: TypeScript",
    "- Tooling: ESLint + Prettier",
    "- Package manager: npm",
  ].join("\n");
}

/**
 * 格式化 Tavily 搜索结果。
 * @description 将 Tavily 响应压缩成适合 agent 消费的纯文本。
 * @param {TavilySearchResponse} response Tavily 搜索响应
 * @return {string}
 */
export function formatTavilySearchResponse(
  response: TavilySearchResponse,
): string {
  /** Tavily 搜索结果列表。 */
  const results = response.results ?? [];
  /** Tavily 答案摘要。 */
  const answerSection = response.answer?.trim()
    ? `Answer:\n${response.answer.trim()}`
    : "";
  /** 搜索来源摘要。 */
  const sourcesSection = results.length > 0
    ? [
      "Sources:",
      ...results.map((result, index) => [
        `${index + 1}. ${result.title}`,
        `URL: ${result.url}`,
        `Snippet: ${result.content}`,
      ].join("\n")),
    ].join("\n\n")
    : "Sources:\nNo Tavily results found.";

  return [answerSection, sourcesSection].filter(Boolean).join("\n\n");
}

/**
 * 执行 Tavily 网络搜索。
 * @description 调用 Tavily Search API，并返回格式化后的搜索内容。
 * @param {TavilySearchInput} input Tavily 搜索输入
 * @param {TavilyDependencies} [dependencies] Tavily 依赖注入配置
 * @return {Promise<string>}
 */
export async function searchWithTavily(
  input: TavilySearchInput,
  dependencies: TavilyDependencies = {},
): Promise<string> {
  /** Tavily API Key。 */
  const apiKey = dependencies.apiKey ?? process.env.TAVILY_API_KEY ?? "";

  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY.");
  }

  /** Tavily 请求地址。 */
  const endpoint = dependencies.endpoint ?? DEFAULT_TAVILY_ENDPOINT;
  /** Tavily fetch 实现。 */
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  /** Tavily 响应对象。 */
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: input.query,
      topic: input.topic ?? "general",
      search_depth: input.searchDepth ?? "basic",
      max_results: input.maxResults ?? 5,
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    /** Tavily 错误文本。 */
    const errorText = await response.text();
    throw new Error(
      `Tavily search failed with status ${response.status}: ${errorText}`,
    );
  }

  /** Tavily 响应数据。 */
  const data = await response.json() as TavilySearchResponse;
  return formatTavilySearchResponse(data);
}

/**
 * 创建项目结构工具。
 */
const inspectProjectTool = tool(() => getProjectOverview(), {
  name: "inspect_project",
  description: "Read the current demo project structure.",
  schema: z.object({}),
});

/**
 * 创建技术栈建议工具。
 */
const suggestTechStackTool = tool(({ topic }) => suggestTechStack({ topic }), {
  name: "suggest_tech_stack",
  description: "Suggest a minimal technical stack for a coding task.",
  schema: z.object({
    topic: z.string().describe("The coding topic or feature to plan for."),
  }),
});

/**
 * Tavily 搜索工具的输入结构。
 */
const tavilySearchToolSchema = z.object({
  query: z.string().min(1).describe("The search query."),
  topic: z.enum(["general", "news"]).optional().describe(
    "Use news for recent events and general for broader web search.",
  ),
  searchDepth: z.enum(["basic", "advanced", "fast", "ultra-fast"])
    .optional()
    .describe("Controls the tradeoff between latency and relevance."),
  maxResults: z.number().int().min(1).max(20).optional().describe(
    "Maximum number of search results to return.",
  ),
});

/**
 * 创建 Tavily 搜索工具。
 * @description 暴露一个可搜索互联网的工具给 agent 使用。
 * @param {TavilyDependencies} [dependencies] Tavily 依赖注入配置
 */
export function createTavilySearchTool(
  dependencies: TavilyDependencies = {},
){
  return tool(async ({
    query,
    topic,
    searchDepth,
    maxResults,
  }) => searchWithTavily(
    {
      query,
      topic,
      searchDepth,
      maxResults,
    },
    dependencies,
  ), {
    name: "search_web",
    description: "Search the internet for up-to-date information using Tavily.",
    schema: tavilySearchToolSchema,
  });
}

/**
 * 创建 ARK 对应的 LangChain 模型实例。
 * @description 通过 OpenAI 兼容协议把 LangChain 模型指向 ARK。
 * @param {RuntimeConfig} config 运行时配置
 * @return {ChatOpenAI}
 */
function createArkModel(config: RuntimeConfig): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0,
    useResponsesApi: false,
    configuration: {
      baseURL: config.baseURL,
    },
  });
}

/**
 * 创建最小 agent。
 * @description 保持和 quickstart 一致的 model + tools + invoke 结构。
 * @param {RuntimeConfig} config 运行时配置
 * @return {DemoAgent}
 */
function createDemoAgent(config: RuntimeConfig): DemoAgent {
  /** ARK 模型实例。 */
  const model = createArkModel(config);
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

/**
 * 格式化最终输出。
 * @description 提取最后一条消息，统一转成字符串输出。
 * @param {Awaited<ReturnType<DemoAgent["invoke"]>>} response Agent 返回值
 * @return {string}
 */
function formatAgentResponse(
  response: Awaited<ReturnType<DemoAgent["invoke"]>>,
): string {
  /** 最后一条消息。 */
  const lastMessage = response.messages.at(-1);

  if (lastMessage == null) {
    return "No response returned.";
  }

  if (typeof lastMessage.content === "string") {
    return lastMessage.content;
  }

  return JSON.stringify(lastMessage.content, null, 2);
}

/**
 * 运行 demo。
 * @description 构造 agent 并执行一次最小对话调用。
 * @return {Promise<void>}
 */
async function main(): Promise<void> {
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

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
