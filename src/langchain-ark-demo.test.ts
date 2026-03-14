import test from "node:test";
import assert from "node:assert/strict";
import {
  createTavilySearchTool,
  formatTavilySearchResponse,
  searchWithTavily,
} from "./tools/tavily-search-tool.ts";

test("formatTavilySearchResponse should include answer and sources", () => {
  /** 格式化后的 Tavily 结果。 */
  const formatted = formatTavilySearchResponse({
    query: "langchain tavily",
    answer: "LangChain can use Tavily for web search.",
    results: [
      {
        title: "LangChain Docs",
        url: "https://docs.langchain.com",
        content: "LangChain supports tools for web search.",
      },
    ],
  });

  assert.match(formatted, /Answer:/);
  assert.match(formatted, /Sources:/);
  assert.match(formatted, /LangChain Docs/);
});

test("searchWithTavily should send Tavily request with expected payload", async () => {
  /** 捕获的请求地址。 */
  let capturedUrl = "";
  /** 捕获的请求初始化参数。 */
  let capturedInit: RequestInit | undefined;

  /** Tavily 搜索结果。 */
  const result = await searchWithTavily(
    {
      query: "latest langchain news",
      topic: "news",
      searchDepth: "advanced",
      maxResults: 3,
    },
    {
      apiKey: "test-key",
      fetchImpl: async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            query: "latest langchain news",
            answer: "LangChain shipped updates.",
            results: [
              {
                title: "Release Notes",
                url: "https://example.com/release",
                content: "Latest release details.",
              },
            ],
          }),
        } as Response;
      },
    },
  );

  assert.equal(capturedUrl, "https://api.tavily.com/search");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(capturedInit?.headers, {
    "Content-Type": "application/json",
    Authorization: "Bearer test-key",
  });
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    query: "latest langchain news",
    topic: "news",
    search_depth: "advanced",
    max_results: 3,
    include_answer: true,
    include_raw_content: false,
  });
  assert.match(result, /Release Notes/);
});

test("searchWithTavily should fail when api key is missing", async () => {
  await assert.rejects(
    () => searchWithTavily({ query: "langchain" }, { apiKey: "" }),
    /Missing TAVILY_API_KEY/,
  );
});

test("createTavilySearchTool should validate input with schema", async () => {
  /** Tavily 搜索工具。 */
  const tavilySearchTool = createTavilySearchTool({
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: "langchain",
        results: [],
      }),
    }) as Response,
  });

  await assert.rejects(
    () => tavilySearchTool.invoke({ query: "", maxResults: 1 }),
    /expected schema/i,
  );
});
