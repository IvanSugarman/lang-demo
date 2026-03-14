# LangChain ARK Demo

一个基于 LangChain JavaScript quickstart 改出来的最小 TypeScript demo，使用火山 ARK Coding Plan 的 OpenAI 兼容接口。

## 安装依赖

项目依赖已经在 `package.json` 中声明：

```bash
npm install
```

## 环境变量

参考 `.env.example`：

```bash
export ARK_API_KEY="your-ark-api-key"
export ARK_CODING_MODEL="ark-code-latest"
export ARK_BASE_URL="https://ark.cn-beijing.volces.com/api/coding/v3"
```

如果你使用 BytePlus 区域，可以把 `ARK_BASE_URL` 改成：

```bash
export ARK_BASE_URL="https://ark.ap-southeast.bytepluses.com/api/coding/v3"
```

## 运行 demo

```bash
npm run demo
```

也可以直接带一段自定义问题：

```bash
npm run demo -- "Build a tiny React component plan for a pricing card."
```

## 类型检查

```bash
npm run typecheck
```

## LangSmith Trace

这份 demo 使用 `createAgent`，因此在 LangSmith 中天然支持 tracing。只要 `.env` 中具备下面这些变量，运行 `npm run demo` 时就会自动产生 trace：

```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your-langsmith-api-key
LANGSMITH_PROJECT=your-project-name
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

当前代码还额外做了两件事：

- 给根运行加了固定的 `runName / tags / metadata`
- 在 CLI 结束前调用 `awaitPendingTraceBatches()`，避免短进程里 trace 还没发完就退出

## Demo 做了什么

- 使用 `createAgent` 创建一个最小 agent
- 使用 `ChatOpenAI` 对接 ARK Coding Plan
- 使用 Node 原生 TypeScript 执行入口文件
- 注册了两个本地工具：
  - `inspect_project`
  - `suggest_tech_stack`

这样可以完整对应 LangChain quickstart 的核心结构：`model + tools + agent.invoke(...)`。
