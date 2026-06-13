---
title: "MCP Host & Client: A Clean Architecture for Multi-Tool LLM Systems"
date: 2025-11-08 20:00
summary: "Implementation of an MCP host and an MCP client for multi-tool LLM systems."
category: "MCP"
tags: ["mcp", "llm", "tooling", "architecture"]
type: "article"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/mcp-host-client-a-clean-architecture-for-multi-tool-llm-systems-9e45a5b64c06"
legacyUrl: "/mcp-host-client-a-clean-architecture-for-multi-tool-llm-systems.html"
---

![](https://cdn-images-1.medium.com/max/1024/1*DvXGrbMcBlZs4G6sKlRI5g.png)

## Abstract

Developing AI systems with LLMs and tool calls can get messy fast. The Model Context Protocol (MCP) offers a simple, standardized way to access tools and data, with clear boundaries between the model, orchestration, and services. This article explains why MCP helps and what trade-offs to expect. It also demonstrates a minimal setup in which an MCP Host and Client connect to an MCP Server over Streamable HTTP and expose a single FastAPI endpoint. This article is part of [the Financial AI Assistant project](</work/designing-agentic-ai-systems-with-mcp/>):

[Designing Agentic AI Systems with the Model Context Protocol (MCP)](</work/designing-agentic-ai-systems-with-mcp/>)

## Goal and Requirements

The objective of this project is to develop a Financial AI Assistant that connects to a specialized MCP server to retrieve real-time stock market data, news, and SEC filings for publicly traded companies. The assistant analyzes the retrieved data and generates comprehensive responses to user queries, providing accurate and relevant financial insights.

To achieve these capabilities, the system must include:

  * a **FastAPI app** that exposes an endpoint.
  * an **MCP host** that contains the main logic for invoking the **agent**.
  * an **MCP client** that manages the connection to the Tool Registry MCP Server.

![](https://cdn-images-1.medium.com/max/1024/1*sNXigOXtlI0LYANzn69IZQ.png)

_High-level architecture of the MCP Host-Client setup_

## The Technologies

The following technologies and tools are used to implement the MCP Host and MCP Client:

  * [**FastAPI**](<https://fastapi.tiangolo.com/>)**:** modern, high-performance Python web framework for building APIs using standard type hints.
  * [**Python MCP SDK**](<https://github.com/modelcontextprotocol/python-sdk>)**:** official low-level Python SDK implementing the full MCP specification and providing maximum control.
  * [**OpenAI GPT-5 mini**](<https://platform.openai.com/docs/models#gpt-4o-mini>)**:** provides the natural-language reasoning and generation.
  * [**LangChain**](<https://docs.langchain.com/>)**:** a model-agnostic framework for LLM applications (chains, memory, and integrations for advanced workflows).

### What is MCP?

> MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems. Using MCP, AI applications can connect to data sources, tools and prompts -- enabling them to access key information and perform tasks.

![](https://cdn-images-1.medium.com/max/1000/0*VyMFggfw13jz6B-5)

_source: <https://modelcontextprotocol.io/docs/getting-started/intro>_

Learn more about MCP here:

[Designing Agentic AI Systems with the Model Context Protocol (MCP)](</work/designing-agentic-ai-systems-with-mcp/>)

**When MCP fits well:**

  * Integrating many tools or data sources
  * Reusing tools across multiple projects

**When to skip MCP:**

  * Only a single tool is needed
  * The workflow is a simple RAG pipeline
  * The solution targets one project only

### What is an agent?

An agent is anything that can perceive its environment and act upon that environment (collecting data, making decisions, and taking actions) to achieve specific goals. The three core components of an agent are the model, tools, and system prompt.

In this project, [a LangChain-based implementation](<https://docs.langchain.com/oss/python/langchain/agents>) is used. The create_agent function delivers a production-ready ReAct agent that systematically combines reasoning and actions: thinking, selecting the appropriate tool, executing it, observing the outcome, refining the reasoning, and generating the final response.

![](https://cdn-images-1.medium.com/max/306/1*4i37G58F9nVGAcZJe9FBYw.png)

_LangChain's create_agent implementation_

## The Solution

### Create a new project and set up a virtual environment

Use **uv** for dependency and environment management. For details, see [the official documentation](<https://docs.astral.sh/uv/>).

    # Create and enter the project directory
    mkdir finAssistant_mcphost
    cd finAssistant_mcphost

    # Initialize a new uv project
    uv init
    # Create a virtual environment
    uv venv
    # Activate the virtual environment (Unix/macOS)
    source .venv/bin/activate

### Prerequisites

Before proceeding, ensure that all necessary dependencies are declared. Add them to the pyproject.toml file, then synchronize the environment by running uv sync:

    dependencies = [
        "fastapi",
        "uvicorn[standard]",
        "pydantic",
        "pydantic-settings",
        "loguru",
        "langchain",
        "langgraph",
        "langchain-openai",
        "mcp",
    ]

### Project structure

    finAssistant_mcphost/
    ├─ src/
    │  ├─ api/
    │  │  ├─ __init__.py
    │  │  └─ chat.py                  # Chat HTTP handlers / FastAPI router
    │  ├─ host/
    │  │  ├─ __init__.py
    │  │  ├─ connection_manager.py    # Manages client/server sessions & transport
    │  │  └─ host.py                  # Orchestrates agent logic & tool calls
    │  └─ __init__.py
    │
    ├─ config.py                      # Settings/env loading (API keys, config)
    ├─ pyproject.toml                 # Project metadata & dependencies (uv-managed)
    ├─ uv.lock                        # Lockfile generated by uv
    ├─ .env.example                   # Example environment variables
    └─ README.md

### FastAPI App

The application's entry point is a FastAPI web service that exposes a /chat endpoint for interacting with an MCP Host-driven AI assistant. It provides a clean HTTP interface to send a natural-language query and receive a structured response produced by the agent.

Startup and shutdown are handled through FastAPI's lifespan context, which initializes the MCP Host when the app starts and performs cleanup on shutdown. The API uses two Pydantic models: ChatRequest, a simple schema with a single query string, and ChatResponse, which returns a reply string and, when applicable, a tool_calls list describing any tools invoked during reasoning.

    import logging
    from typing import Any
    import uvicorn
    from fastapi import FastAPI
    from pydantic import BaseModel
    from src.host.host import MCPHost
    from contextlib import asynccontextmanager

    SYSTEM_PROMPT_NAME = "scope_financial_analysis_prompt"

    host = MCPHost()
    logger = logging.getLogger("chat")
    logging.basicConfig(level=logging.INFO)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await host.initialize()
        try:
            yield
        finally:
            await host.cleanup()

    app = FastAPI(lifespan=lifespan)

    class ChatRequest(BaseModel):
        query: str

    class ChatResponse(BaseModel):
        reply: str
        tool_calls: list[dict[str, Any]] | None = None

    @app.post("/chat", response_model=ChatResponse)
    async def chat(request: ChatRequest):
        logger.info("Requesting system prompt from MCPHost...")
        logger.info(f"User query: {request.query}")
        prompt_args = {"query": request.query}
        prompt = await host.get_system_prompt(SYSTEM_PROMPT_NAME, prompt_args)
        logger.info("Processing query with LLM...")
        result = await host.process_query(prompt_text=prompt.messages[0].content.text)
        return ChatResponse(reply=result.text, tool_calls=result.tool_calls)

When a request hits /chat, the service logs the query. The MCP Host fetches the system prompt by connecting to the MCP server via the MCP Client, using the configured prompt name and the user's input. The prompt is then passed to the Agent via host.process_query(). The result is returned in the ChatResponse schema, containing the assistant's reply and any recorded tool calls.

### MCP Host

The MCP Host implements an asynchronous MCPHost that connects a LangChain ReAct agent to an MCP Tool Registry through a MCPClient. It exposes a single process_query entry point that accepts a prepared system prompt and returns the model's final text along with a structured trace of the tool calls that occurred during reasoning.

Initialization and shutdown are managed explicitly: initialize() starts all MCP connections via the connection manager, while cleanup() closes them, with guards preventing usage before initialization.

System prompts can be retrieved through get_system_prompt(name, args), which fetches server-defined prompts such as the scope_financial_analysis_prompt used by the FastAPI layer.

When handling a query, the host wraps the prompt as a SystemMessage and invokes the agent asynchronously with a bounded recursion limit. The agent is created by _get_agent(), which uses LangChain's create_agent and supplies tools discovered from the MCP server.

Tool definitions are adapted into LangChain StructuredTool wrappers via _load_langgraph_tools(), and each wrapper provides an async coroutine that logs the call and delegates execution to connection_manager.call_tool(...). This keeps the MCP tool schemas as the source of truth while presenting them in a LangChain-friendly form.

After the agent runs, the host extracts the final assistant text with _get_final_message_text and assembles a record of executed tool calls with _collect_tool_calls. If the agent exceeds the step limit and triggers a GraphRecursionError, the host returns a safe fallback message. All results are packaged as ChatResult, containing the final text and an ordered tool_calls list.

    class MCPHost:
        def __init__(self, model: str = "gpt-5-mini"):
            self.model = model
            openai_api_key = settings.OPENAI_API_KEY
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set. Please set it to your OpenAI API key.")
            self.llm = ChatOpenAI(
                model=self.model,
                temperature=0,
                api_key=openai_api_key,
            )
            self.client = MCPClient()
            self.thread_id = str(uuid.uuid4())
            self._agent = None
            self._recursion_limit = 10

        async def initialize(self):
            await self.client.initialize_all()

        async def cleanup(self):
            await self.client.cleanup_all()

        async def get_system_prompt(self, name, args) -> str:
            if not self.client.is_initialized:
                raise RuntimeError("MCP Client is not initialized. Call initialize_all() first.")
            return await self.client.get_prompt(name, args)

        async def process_query(self, prompt_text: str) -> ChatResult:
            if not self.client.is_initialized:
                raise RuntimeError("MCP Client is not initialized. Call initialize_all() first.")

            agent = await self._get_agent()
            messages = [SystemMessage(content=prompt_text)] if prompt_text else []

            try:
                result_state = await agent.ainvoke(
                    {"messages": messages},
                    config={
                        "recursion_limit": self._recursion_limit,
                        "configurable": {"thread_id": self.thread_id},
                    },
                )
                message_history: list[BaseMessage] = []
                if isinstance(result_state, dict):
                    message_history = result_state.get("messages", [])

                final_text = self._get_final_message_text(message_history)
                tool_calls = self._collect_tool_calls(message_history)

                logger.info("Final response: %s", final_text)
                return ChatResult(text=final_text, tool_calls=tool_calls)
            except GraphRecursionError:
                logger.error(
                    "LangGraph recursion limit (%d) reached without completion; returning fallback response.",
                    self._recursion_limit,
                )
                return ChatResult(
                    text="I hit the iteration limit while trying to figure this out. You can retry or rephrase the request.",
                    tool_calls=[],
                )

The code above shows the implementation of process_query. Find the implementation of the helper functions in the [repository](<https://github.com/Anastasiia-Selezen/finAssistant_mcphost>):

[GitHub - Anastasiia-Selezen/finAssistant_mcphost](<https://github.com/Anastasiia-Selezen/finAssistant_mcphost>)

### MCP Client

This module is a compact connection manager for MCP that opens a single ClientSession to a configured server and then exposes simple helpers to list tools/prompts, call tools, fetch prompts, and shut everything down cleanly.

At startup, initialize_all() connects to the "tool-registry" defined in AVAILABLE_SERVERS, which maps server keys to transport settings.

The main entry point, connect_to_server(server_key), resolves the config and chooses a transport. In this case it uses Streamable-HTTP, sets up an SSE/Web stream via streamablehttp_client(...), and hands the streams to _run_session(...), which constructs and initializes the ClientSession, prints connection banners, and, when available, shows a session ID.

After initialization, it lists tools and prompts for quick visibility.

There are some helper functions: get_mcp_tools() passes through to list_tools(), get_prompt(name, args) retrieves a server-defined prompt, and call_tool(function_name, function_args) invokes a tool with the given arguments.

When finished, cleanup_all() closes every open context via the exit stack, ensuring a tidy shutdown without dangling resources.

    from contextlib import AsyncExitStack

    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from mcp.client.streamable_http import streamablehttp_client

    from ..config import settings

    AVAILABLE_SERVERS = {
        "tool-registry": {
            "type": "streamable-http",
            "url": settings.TOOL_REGISTRY_URL,
        }
    }

    class MCPClient:
        def __init__(self):
            self.session: ClientSession | None = None
            self.exit_stack = AsyncExitStack()
            self.is_initialized = False

        async def initialize_all(self):
            await self.connect_to_server("tool-registry")
            self.is_initialized = True

        async def connect_to_server(self, server_key: str):
            config = AVAILABLE_SERVERS[server_key]

            if config["type"] == "stdio":
                stdio_transport = await self.exit_stack.enter_async_context(
                    stdio_client(StdioServerParameters(command="python", args=[config["path"]]))
                )
                self.session = await self.exit_stack.enter_async_context(ClientSession(*stdio_transport))

            elif config["type"] == "streamable-http":
                context = streamablehttp_client(url=config["url"], headers=config.get("headers"))
                print(f"Connecting to SSE server '{server_key}' with streamablehttp_client...")

                read_stream, write_stream, get_session_id = await self.exit_stack.enter_async_context(context)
                await self._run_session(read_stream, write_stream, get_session_id)

            await self.session.initialize()

            try:
                tools = await self.session.list_tools()
                print(f"🔧 Tools available for {server_key}:")
                for tool in tools.tools:
                    print(f"  - {tool.name}: {tool.description}")
            except Exception as e:
                print(f"(No tools found or error fetching tools: {e})")

            try:
                prompts = await self.session.list_prompts()
                print(f"📝 Prompts available for {server_key}:")
                for prompt in prompts.prompts:
                    print(f"  - {prompt.name}")
            except Exception as e:
                print(f"(No prompts found or error fetching prompts: {e})")

        async def _run_session(self, read_stream, write_stream, get_session_id):
            print("🤝 Initializing MCP session...")
            session = await self.exit_stack.enter_async_context(ClientSession(read_stream, write_stream))
            self.session = session
            print("⚡ Starting session initialization...")
            await session.initialize()
            print("✨ Session initialization complete!")
            print("\n✅ Connected to MCP server")
            if get_session_id:
                session_id = get_session_id()
                if session_id:
                    print(f"Session ID: {session_id}")

        async def get_mcp_tools(self):
            return await self.session.list_tools()

        async def call_tool(self, function_name, function_args):
            return await self.session.call_tool(function_name, arguments=dict(function_args))

        async def get_prompt(self, name, args):
            return await self.session.get_prompt(name, args)

        async def cleanup_all(self):
            await self.exit_stack.aclose()

The code above was adapted from this repo:

[enterprise-mcp-course/apps/pr-reviewer-mcp-host/src/host at main · decodingai-magazine/enterprise-mcp-course](<https://github.com/decodingai-magazine/enterprise-mcp-course/tree/main/apps/pr-reviewer-mcp-host/src/host>)

### How to run
First, ensure the MCP server is running. Check how to do it [here](</work/mcp-server-architecture-financial-ai-assistant/>):

[MCP Server Architecture for Financial AI Assistant](</work/mcp-server-architecture-financial-ai-assistant/>)

Start the FastAPI app with command:

uvicorn src.api.chat:app --host localhost --port 5005

After starting, logs similar to the following should appear:

    INFO:     Started server process [54373]
    INFO:     Waiting for application startup.
    Connecting to SSE server 'tool-registry' with streamablehttp_client...
    🤝 Initializing MCP session...
    ⚡ Starting session initialization...
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:mcp.client.streamable_http:Received session ID: d233d2d9650f4292b6ed3f4dab068aa5
    INFO:mcp.client.streamable_http:Negotiated protocol version: 2025-06-18
    ✨ Session initialization complete!

    ✅ Connected to MCP server
    Session ID: d233d2d9650f4292b6ed3f4dab068aa5
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 202 Accepted"
    INFO:httpx:HTTP Request: GET http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:mcp.client.streamable_http:Received session ID: d233d2d9650f4292b6ed3f4dab068aa5
    INFO:mcp.client.streamable_http:Negotiated protocol version: 2025-06-18
    INFO:httpx:HTTP Request: GET http://localhost:5555/mcp "HTTP/1.1 409 Conflict"
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 202 Accepted"
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    🔧 Tools available for tool-registry:
      - alphavantage_get_intraday: Returns current and 20+ years of historical intraday OHLCV time series of the equity specified.
      - alphavantage_get_news_sentiment: Returns live and historical market news & sentiment data from premier news outlets worldwide.
      - alphavantage_search_symbol: Returns best-matching symbols and market information based on keywords.
      - sec_map_ticker_to_cik: Map a stock ticker symbol to its Central Index Key (CIK).
      - sec_get_latest_10k_metadata: Fetch metadata for the latest 10-K filing of a ticker symbol.
      - sec_get_latest_10k_text: Extract text from the latest 10-K filing of a ticker symbol. Optionally limit to specific sections.
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    📝 Prompts available for tool-registry:
      - scope_financial_analysis_prompt
    INFO:     Application startup complete.
    INFO:     Uvicorn running on http://localhost:5005 (Press CTRL+C to quit)

Uvicorn launches the FastAPI app and completes application initialization. In parallel, the MCP client connects to the Tool Registry over Streamable-HTTP at http://localhost:5555/mcp, establishes a session (session ID displayed in the logs), and negotiates protocol version 2025-06-18.

Available tools and the prompt are listed for use. The application is served at http://localhost:5005.

**Testing via Swagger**

Navigate to /docs to open the Swagger UI and submit a test request.

Example payload:

    {
      "query": "Hey, I'm researching the company that builds the Model Y but I can't remember its stock symbol. Could you figure out the right ticker, pull a 5-minute intraday snapshot for today, summarize any headline sentiment from the last 24 hours, and grab a short excerpt from the latest 10‑K risk factors (1.A)?"
    }

After the request is submitted, logs similar to the following should appear:

    INFO:chat:Requesting system prompt from MCPHost...
    INFO:chat:User query: Hey, I'm researching the company that builds the Model Y but I can't remember its stock symbol. Could you figure out the right ticker, pull a 5-minute intraday snapshot for today, summarize any headline sentiment from the last 24 hours, and grab a short excerpt from the latest 10‑K risk factors (1.A)?
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:chat:Processing query with LLM...
    INFO:httpx:HTTP Request: POST https://api.openai.com/v1/chat/completions "HTTP/1.1 200 OK"
    INFO:mcp_host:Calling MCP tool 'alphavantage_search_symbol' with {'keywords': 'Tesla Model Y'}
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:mcp_host:MCP tool 'alphavantage_search_symbol' returned meta=None content=[TextContent(type='text', text='{"_meta":null,"content":[{"type":"text","text":"symbol,name,type,region,marketOpen,marketClose,timezone,currency,matchScore\\r\\n","annotations":null,"_meta":null}],"structuredContent":null,"isError":false}', annotations=None, meta=None)] structuredContent={'_meta': None, 'content': [{'type': 'text', 'text': 'symbol,name,type,region,marketOpen,marketClose,timezone,currency,matchScore\r\n', 'annotations': None, '_meta': None}], 'structuredContent': None, 'isError': False} isError=False
    INFO:httpx:HTTP Request: POST https://api.openai.com/v1/chat/completions "HTTP/1.1 200 OK"
    INFO:mcp_host:Calling MCP tool 'alphavantage_search_symbol' with {'keywords': 'Tesla'}
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:mcp_host:MCP tool 'alphavantage_search_symbol' returned meta=None content=[TextContent(type='text', text='{"_meta":null,"content":[{"type":"text","text":"symbol,name,type,region,marketOpen,marketClose,timezone,currency,matchScore\\r\\nTSLA,Tesla Inc,Equity,United States,09:30,16:00,UTC-04,USD,0.8889\\r\\nTL0.DEX,Tesla Inc,Equity,XETRA,08:00,20:00,UTC+02,EUR,0.7143\\r\\nTL0.FRK,Tesla Inc,Equity,Frankfurt,08:00,20:00,UTC+02,EUR,0.7143\\r\\nTSLA34.SAO,Tesla Inc,Equity,Brazil/Sao Paolo,10:00,17:30,UTC-03,BRL,0.7143\\r\\nTSLA.TRT,Tesla CDR (CAD Hedged),Equity,Toronto,09:30,16:00,UTC-05,CAD,0.6667\\r\\nZTSL.TRT,Tesla (TSLA) BMO CDR (CAD Hedged),Equity,Toronto,09:30,16:00,UTC-05,CAD,0.5000\\r\\nTL01.FRK,TESLA INC. CDR DL-001,Equity,Frankfurt,08:00,20:00,UTC+02,EUR,0.3846\\r\\n","annotations":null,"_meta":null}],"structuredContent":null,"isError":false}', annotations=None, meta=None)] structuredContent={'_meta': None, 'content': [{'type': 'text', 'text': 'symbol,name,type,region,marketOpen,marketClose,timezone,currency,matchScore\r\nTSLA,Tesla Inc,Equity,United States,09:30,16:00,UTC-04,USD,0.8889\r\nTL0.DEX,Tesla Inc,Equity,XETRA,08:00,20:00,UTC+02,EUR,0.7143\r\nTL0.FRK,Tesla Inc,Equity,Frankfurt,08:00,20:00,UTC+02,EUR,0.7143\r\nTSLA34.SAO,Tesla Inc,Equity,Brazil/Sao Paolo,10:00,17:30,UTC-03,BRL,0.7143\r\nTSLA.TRT,Tesla CDR (CAD Hedged),Equity,Toronto,09:30,16:00,UTC-05,CAD,0.6667\r\nZTSL.TRT,Tesla (TSLA) BMO CDR (CAD Hedged),Equity,Toronto,09:30,16:00,UTC-05,CAD,0.5000\r\nTL01.FRK,TESLA INC. CDR DL-001,Equity,Frankfurt,08:00,20:00,UTC+02,EUR,0.3846\r\n', 'annotations': None, '_meta': None}], 'structuredContent': None, 'isError': False} isError=False
    INFO:httpx:HTTP Request: POST https://api.openai.com/v1/chat/completions "HTTP/1.1 200 OK"
    INFO:mcp_host:Calling MCP tool 'alphavantage_get_intraday' with {'symbol': 'TSLA', 'interval': '5min'}
    INFO:mcp_host:Calling MCP tool 'alphavantage_get_news_sentiment' with {'tickers': 'TSLA'}
    INFO:mcp_host:Calling MCP tool 'sec_get_latest_10k_metadata' with {'ticker': 'TSLA'}
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: POST http://localhost:5555/mcp "HTTP/1.1 200 OK"
    INFO:mcp_host:MCP tool 'sec_get_latest_10k_metadata' returned meta=None content=[TextContent(type='text', text='{"ticker":"TSLA","cik":"1318605","filing":{"ticker":"TSLA","formType":"10-K/A","accessionNo":"0001104659-25-042659","cik":"1318605","companyNameLong":"Tesla, Inc. (Filer)","companyName":"Tesla, Inc.","linkToFilingDetails":"https://www.sec.gov/Archives/edgar/data/1318605/000110465925042659/tm252787d2_10ka.htm","description":"Form 10-K/A - Annual report [Section 13 and 15(d), not S-K Item 405]: [Amend]","linkToTxt":"https://www.sec.gov/Archives/edgar/data/1318605/000110465925042659/0001104659-25-042659.txt","filedAt":"2025-04-30T17:08:56-04:00","documentFormatFiles":[{"sequence":"1","size":"874910","documentUrl":"https://www.sec.gov/ix?doc=/Archives/edgar/data/1318605/000110465925042659/tm252787d2_10ka.htm","description":"FORM 10-K/A","type":"10-K/A"},{"sequence":"2","size":"2916","documentUrl":"https://www.sec.gov/Archives/edgar/data/1318605/000110465925042659/tm252787d2_ex31-3.htm","description":"EXHIBIT 31.3","type":"EX-31.3"}

The logs show that the LLM received a query asking to identify the company behind the Model Y, find its ticker, and retrieve intraday data, news sentiment, and recent 10-K information. The first search for "Tesla Model Y" returned no match, followed by a successful search for "Tesla," which resolved to the ticker TSLA. The host then executed the tools for intraday data, news sentiment, and SEC 10-K metadata, each completing with HTTP 200 OK responses.

At completion, the agent returns the final response:

    INFO:mcp_host:Final response: The company that builds the Model Y is **Tesla, Inc.**, and its stock symbol is **TSLA**.

    ### 5-Minute Intraday Snapshot (Latest Data)
    - **Timestamp**: 2025-10-27 19:55:00
    - **Open**: $455.28
    - **High**: $455.82
    - **Low**: $455.25
    - **Close**: $455.66
    - **Volume**: 55,069 shares

    ### Headline Sentiment from the Last 24 Hours
    Recent headlines indicate a **Somewhat-Bullish** sentiment towards Tesla:
    1. **[Trump Says He Likes Elon Musk Again After Tesla CEO's "Stupid Moment" Criticizing President](https://www.benzinga.com/news/politics/25/10/48470001/trump-says-he-likes-elon-musk-again-after-tesla-ceos-stupid-moment-criticizing-president)** - This article discusses a positive shift in the relationship between Trump and Musk, which may positively influence TSLA stock.
    2. **[Not Nearly Enough People Are Talking About This News From Tesla's Earnings Report](https://www.fool.com/investing/2025/10/28/not-enough-talk-about-tesla-earnings-profit/)** - Despite record revenue, concerns about potential unprofitability are raised.

    ### Latest 10-K Risk Factors (Excerpt from Section 1.A)
    The latest 10-K filing for Tesla includes various risk factors. Here's a brief excerpt:
    - **Risk of Unprofitability**: Tesla has experienced periods of unprofitability and may continue to do so in the future, which could adversely affect its financial condition and stock price.

    For more detailed information, you can view the full filing [here](https://www.sec.gov/Archives/edgar/data/1318605/000110465925042659/tm252787d2_10ka.htm).

    If you need further details or have additional questions, feel free to ask!

It contains all the requested information, structured in a clear, easy-to-understand format, with corresponding links to the news sources and the 10-K filing text. This makes the response reliable and verifiable.

The response body follows the ChatResponse schema defined in the FastAPI app and contains two parts: a reply and tool_calls. The tool_calls field is a list of traces for every tool the agent invoked, each entry records the tool name, the arguments provided, and the result.

These traces are valuable for debugging (to investigate failures) and for optimization (to see where the system may stall or make unnecessary tool calls). It's a good practice to keep these traces in logs or send them to observability stack.

Example of the response body:

    {
      "reply": "The company that builds the Model Y is **Tesla, Inc.**, and its stock symbol is **TSLA**.",
      "tool_calls": [
        {
          "name": "alphavantage_search_symbol",
          "args": {
            "keywords": "Tesla"
          },
          "result": "..."
        },
        {
          "name": "alphavantage_get_intraday",
          "args": {
            "symbol": "TSLA",
            "interval": "5min"
          },
          "result": "..."
        }
      ]
    }

![](https://cdn-images-1.medium.com/max/1024/1*yse0RuWVMcf-5q1eIxWdvA.png)

_Response body in Swagger UI_

Of course, testing the application with a single sample query is not sufficient. A proper testing strategy should include a wider range of examples designed to reveal how the model decides which tools to call and to assess the consistency of its generated responses. However, these topics are beyond the scope of this post.

## Conclusion

This implementation demonstrates how the Model Context Protocol (MCP) can bring structure and transparency to multi-tool AI systems. By connecting a LangChain ReAct agent to an MCP Tool Registry via an asynchronous Host-Client setup, the assistant can reason over queries, invoke external tools safely, and produce verifiable, traceable results.

The MCP Host focuses on reasoning and orchestration, the MCP Client manages reliable communication with the Tool Registry, and the FastAPI layer exposes the system to the outside world. While the initial setup requires more architectural discipline than a monolithic RAG pipeline, the long-term payoff is modularity, interoperability, and transparency.

## Pros:

  * **Standardized Integration:** MCP provides a consistent, open protocol for connecting AI models with external tools, prompts and resources, reducing the need for custom glue code.
  * **Modularity:** New tools or data sources can be added without changing core logic.
  * **Extensible deployment:** FastAPI with Streamable HTTP works for both local development and scalable production.

## Cons:

  * **Initial complexity:** Setting up MCP clients, hosts, and transports requires familiarity with the protocol and async patterns.
  * **Limited SDK maturity:** The Python MCP SDK is still evolving.
  * **Latency stacking:** Each tool call adds a network hop, batching or caching may be required for production performance.

## Lessons Learned

  1. **Keep boundaries clean:** The Host handles reasoning, the Client handles transport, and the Server defines tools, never mix responsibilities.
  2. **Observability & traceability:** Log every tool call and store structured traces; add telemetry early to debug, audit reasoning steps, and monitor external interactions as the system scales.
  3. **Strong architectural design:** A solid understanding of software architecture principles is essential for building maintainable, modular, and scalable MCP systems.
