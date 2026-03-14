import { tool } from "langchain";
import * as z from "zod";

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
 * Tavily Search API 地址。
 */
const DEFAULT_TAVILY_ENDPOINT = "https://api.tavily.com/search";

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
 * 创建 Tavily 搜索工具。
 * @description 暴露一个可搜索互联网的工具给 agent 使用。
 * @param {TavilyDependencies} [dependencies] Tavily 依赖注入配置
 * @return {ReturnType<typeof tool>}
 */
export function createTavilySearchTool(
  dependencies: TavilyDependencies = {},
) {
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
