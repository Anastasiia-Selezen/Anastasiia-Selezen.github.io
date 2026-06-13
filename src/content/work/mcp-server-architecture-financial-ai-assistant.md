---
title: "MCP Server Architecture for Financial AI Assistant"
date: 2025-11-08 20:00
summary: "Implementation of an MCP server for a financial AI assistant."
category: "MCP"
tags: ["mcp", "financial-ai", "server", "architecture"]
type: "article"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/mcp-server-architecture-for-financial-ai-assistant-82013c5a4363"
legacyUrl: "/mcp-server-architecture-for-financial-ai-assistant.html"
---

![](https://cdn-images-1.medium.com/max/1024/1*lj-lB0RCKSnABMJGZYvNyA.png)

## Abstract

This article presents an implementation of an MCP Server using FastMCP with Streamable HTTP transport and examines the benefits and trade-offs of this approach. It demonstrates an advanced method for combining multiple servers into a unified MCP Server that remains easily accessible to the MCP Client and MCP Host. The implementation covers using prebuilt MCP Server, authoring custom servers and server definitions, and defining tools and prompts. This article is part of [the Financial AI Assistant project](</work/designing-agentic-ai-systems-with-mcp/>):

[Designing Agentic AI Systems with the Model Context Protocol (MCP)](</work/designing-agentic-ai-systems-with-mcp/>)

## Goal and Requirements

The project aims to implement an MCP Server that enables real-time access to stock market data, news, and SEC filings by exposing specialized tools and prompt. These capabilities can be accessed by any MCP client.

![](https://cdn-images-1.medium.com/max/1024/1*SRB1WLVpEwEXIz_ouWQ9oQ.png)

_The MCP client connects to the MCP server, which exposes tools and prompt_

Wrapping tools and prompts within MCP Server supports independent development and broad reuse. A server can be built and maintained separately from other components and plugged into multiple applications without reinventing existing functionality.

To achieve these capabilities, the system must include:

  * **Three FastMCP server definitions** providing tools and prompts:
    - **Alpha Vantage:** a proxy for the official Alpha Vantage MCP Server.
    - **SEC:** a custom FastMCP server definition that implements core logic and integrates SEC APIs via an SECAPIClient.
    - **Agent Scope:** a server definition that exposes the system prompt.
  * **Tool Registry MCP Server** that aggregates tools and prompts from all servers/server definitions for streamlined discovery by the MCP Client and MCP Host.

## The Technologies

The following technologies and tools are used to implement the MCP Server:

  * [**FastMCP**](<https://gofastmcp.com/getting-started/welcome>): high-level framework for shipping MCP apps quickly; includes ready-made patterns and production components (routing, transports, etc.).
  * [**Python MCP SDK**](<https://github.com/modelcontextprotocol/python-sdk>)**:** official low-level Python SDK implementing the full MCP specification and providing maximum control.
  * [**Alpha Vantage MCP**](<https://mcp.alphavantage.co/>)**:** The official Alpha Vantage API MCP Server enables LLMs and agentic workflows to seamlessly interact with real-time and historical stock market data
  * [**SEC API**](<https://sec-api.io/>)**:** Gateway to search the latest SEC filings and access all corporate documents from the SEC EDGAR archive filed since 1994.

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

  * A single tool is sufficient
  * The workflow is a simple RAG pipeline
  * The solution targets one project only

> Before implementing an MCP Server for an existing client, **ensure the client supports the required primitives**. See [the official documentation](<https://modelcontextprotocol.io/clients>) for details.

## The Solution

### Create a new project and set up a virtual environment

Use **uv** for dependency and environment management. For details, see [the official documentation](<https://docs.astral.sh/uv/>).

    # Create and enter the project directory
    mkdir finAssistant_mcpserver
    cd finAssistant_mcpserver

    # Initialize a new uv project
    uv init

    # Create a virtual environment
    uv venv

    # Activate the virtual environment (Unix/macOS)
    source .venv/bin/activate

### Prerequisites

Before proceeding, ensure that all necessary dependencies are declared. Add them to the pyproject.toml file, then synchronize the environment by running uv sync:

    dependencies = [
        "anyio",
        "pydantic",
        "pydantic-settings",
        "loguru",
        "requests",
        "fastmcp",
        "html2text",
        "sec-api",
        "mcp",
        "brotli"
    ]

### Project structure

    finAssistant_mcpserver/
    ├─ src/
    │  ├─ api_clients/
    │  │  ├─ __init__.py
    │  │  └─ sec_api_client.py            # Handles SEC API calls
    │  │
    │  ├─ server/
    │  │  ├─ __init__.py
    │  │  ├─ alpha_vantage.py         # Proxy to official Alpha Vantage MCP Server
    │  │  ├─ sec.py                   # Custom SEC MCP server definition (uses SECAPIClient)
    │  │  ├─ agent_scope.py           # Server definition exposing the system prompt
    │  │  ├─ prompts.py               # Prompt definitions
    │  │  └─ tool_registry.py         # Aggregates tools/prompts for discovery
    │  │
    │  ├─ config.py                   # Settings/env loading (API keys, config)
    │  └─ main.py                     # App entrypoint (FastMCP + HTTP transport)
    │
    ├─ pyproject.toml                 # Project metadata & dependencies (uv-managed)
    ├─ uv.lock                        # Lockfile generated by uv
    ├─ .env.example                   # Example environment variables
    └─ README.md

## Connecting to the Alpha Vantage MCP via a FastMCP Proxy

Alpha Vantage provides an official MCP Server that can be addressed directly:

    ALPHAVANTAGE_MCP_URL = f"https://mcp.alphavantage.co/mcp?apikey={settings.ALPHA_VANTAGE_API_KEY}"

To expose a single aggregated Tool Registry MCP Server and to import Alpha Vantage, a FastMCP proxy is used to connect to the official Alpha Vantage MCP Server.

A FastMCP proxy doesn't implement tools itself. It forwards incoming requests upstream, waits for the response, and relays it back. All tools, resources, and prompts available through the proxy are mirrored from the remote server and cannot be edited directly.

If only a subset of tools should be exposed to the LLM, FastMCP's proxy enables tool filtering: copy required tools into a local component, and leave non-relevant tools unproxied.

For this project, **three tools** are exposed:

  * **get_intraday**: Retrieves intraday time series data. It fetches recent OHLCV candles for a specified ticker at a chosen interval (proxy for Alpha Vantage TIME_SERIES_INTRADAY).
  * **get_news_sentiment:** Retrieves news sentiment data. It returns recent news items and sentiment scores for a specified ticker (proxy for Alpha Vantage NEWS_SENTIMENT).
  * **search_symbol.** Searches for a stock symbol. It finds valid tickers based on a company name or keyword query (proxy for Alpha Vantage SYMBOL_SEARCH).

### Configuration

A minimal config supplies the upstream Alpha Vantage MCP URL and authentication details, defines the transport layer (streamable-http), and sets headers for handling response encoding/compression.

    ALPHAVANTAGE_MCP_CONFIG = {
        "mcpServers": {
            "alphavantage_proxy": {
                "url": ALPHAVANTAGE_MCP_URL,
                "transport": "streamable-http",
                "headers": {"Accept-Encoding": "gzip, deflate, br, zstd"},
            }
        }
    }

### Creating the proxy and local server definition

Create the proxy (client-side) and a local FastMCP server definition that will hold copied tools.

    alphavantage_proxy = FastMCP.as_proxy(
        ALPHAVANTAGE_MCP_CONFIG,
        name="alphavantage_proxy",
    )

    alphavantage_mcp = FastMCP("alphavantage_tools")

### Filtering to a selected subset of tools

_SELECTED_TOOLS maps remote tool IDs to local aliases. load_alpha_vantage_tools() calls await alphavantage_proxy.get_tools() to pull the remote tool inventory. For each selected tool, the function looks it up by its remote name, uses Tool.from_tool(proxy_tool, name=local_name) to clone the tool but with a local alias, and registers it on the local alphavantage_mcp with add_tool(...).

    _SELECTED_TOOLS = {
        "TIME_SERIES_INTRADAY": "get_intraday",
        "NEWS_SENTIMENT": "get_news_sentiment",
        "SYMBOL_SEARCH": "search_symbol",
    }

    _tools_loaded = False

    async def load_alpha_vantage_tools() -> None:
        """Populate alphavantage_mcp with the three mirrored tools (idempotent)."""
        global _tools_loaded
        if _tools_loaded:
            return

        log.info("Loading Alpha Vantage tools via FastMCP proxy...")
        mirrored = await alphavantage_proxy.get_tools()

        for remote_name, local_name in _SELECTED_TOOLS.items():
            try:
                proxy_tool = mirrored[remote_name]
            except KeyError as exc:
                raise RuntimeError(
                    f"Alpha Vantage tool {remote_name} not found in proxy inventory"
                ) from exc

            # Use a transformed copy so the local alias preserves the remote call target.
            local_tool = Tool.from_tool(proxy_tool, name=local_name)
            alphavantage_mcp.add_tool(local_tool)

        _tools_loaded = True
        log.info("Alpha Vantage tools ready.")

Registering tools on alphavantage_mcp ensures the local copies win over mirrored versions, allowing you to expose only the intended subset.

The complete implementation is available in the [repository](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>).

[GitHub - Anastasiia-Selezen/finAssistant_mcpserver](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>)

Details on other Alpha Vantage MCP tools, parameters, and response schemas can be found in [the official Alpha Vantage MCP documentation](<https://mcp.alphavantage.co/>).

## Implementing the Custom SEC MCP Server definition

The SEC MCP server definition exposes three tools:

  * **sec_map_ticker_to_cik**: Maps a stock ticker symbol to its Central Index Key (CIK). It enables conversion from a public ticker (e.g., AAPL) to the corresponding SEC identifier used in filings.
  * **sec_get_latest_10k_metadata**: Retrieves metadata for the latest 10-K filing of a given ticker symbol, including filing date, accession number, and report details.
  * **sec_get_latest_10k_text**: Extracts text content from the latest 10-K filing of a ticker symbol. It can optionally limit the output to specific sections such as _Management Discussion_ or _Risk Factors_.

### Creating the server definition

The example below shows how a tool is created; the other two tools follow the same pattern.

  * Import SECAPIClient, which encapsulates all SEC API interactions.
  * Initialize FastMCP.
  * Decorate each function with @sec_mcp.tool(...) to expose it as an MCP tool with a description, tags, and annotations.

    import asyncio
    import logging
    from collections.abc import Iterable

    from api_clients.sec_api_client import SECAPIClient
    from fastmcp import FastMCP

    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)

    sec_mcp = FastMCP("sec_tools")
    sec_client = SECAPIClient()

    @sec_mcp.tool(
        description="Map a stock ticker symbol to its Central Index Key (CIK).",
        tags={"sec", "mapping", "ticker", "cik"},
        annotations={"title": "Map Ticker to CIK", "readOnlyHint": True, "openWorldHint": True},
    )
    async def map_ticker_to_cik(ticker: str):
        try:
            cik = await asyncio.to_thread(sec_client.map_ticker_to_cik, ticker)
            return {"ticker": ticker.strip().upper(), "cik": cik}
        except Exception as exc:
            logger.exception("Failed to map ticker %s", ticker)
            return {"error": str(exc)}

### Tool metadata

  * **description:** Human-readable summary of the tool.
  * **tags:** Useful for grouping, discovery, and server-/client-side filtering (e.g., FastMCP supports tag-based filtering).
  * **annotations:
* **readOnlyHint: True -- declares the tool does not modify state.
* openWorldHint: True -- indicates it talks to external systems.

With these annotations, the function is exposed as a **read-only, external-data** tool "Map Ticker to CIK", appropriately tagged for LLM discovery via MCP.

### Call flow

In the tool function, SECAPIClient.map_ticker_to_cik is invoked and wrapped with asyncio.to_thread(...) because SECAPIClient.map_ticker_to_cik is synchronous (network I/O). Offloading the call keeps the MCP Server responsive and scalable.

SECAPIClient.map_ticker_to_cik accepts a ticker and returns the corresponding CIK as a string; the MCP tool then packages the result into a dictionary (e.g., {"ticker": "...", "cik": "..."}).

This separation keeps the MCP server definition clear and minimal, with operational logic contained in sec_api_client.py.

### SECAPIClient class implementation

The SECAPIClient class encapsulates helper methods used by map_ticker_to_cik.

Its constructor gets the API key from settings.SEC_API_KEY unless an explicit api_key is provided, raising an EnvironmentError if none is available.

It initializes QueryApi, ExtractorApi, and MappingApi from sec_api, stores a default tuple of common 10-K item numbers ("1", "1A", "7", "7A", "8") for later extraction, and maintains a _cik_cache: Dict[str, str] to memoize ticker to CIK lookups, reducing latency and API usage.

    import re
    from collections.abc import Iterable

    import html2text
    import requests
    from config import settings
    from sec_api import ExtractorApi, MappingApi, QueryApi

    class SECAPIClient:
        """
        Minimal helper class that exposes three SEC API interactions:
          • map_ticker_to_cik      -- Map a ticker symbol to its CIK identifier.
          • get_latest_10k_filing  -- Retrieve metadata for the latest 10-K filing.
          • extract_filing_text    -- Extract human-readable text from a filing.
        """

        def __init__(
            self,
            *,
            api_key: str | None = None,
            default_sections: Iterable[str] | None = None,
        ) -> None:
            self.api_key = api_key or settings.SEC_API_KEY
            if not self.api_key:
                raise OSError("SEC_API_KEY environment variable is required.")

            self.query_api = QueryApi(api_key=self.api_key)
            self.extractor_api = ExtractorApi(api_key=self.api_key)
            self.mapping_api = MappingApi(api_key=self.api_key)
            self.default_sections = tuple(default_sections or ("1", "1A", "7", "7A", "8"))
            self._cik_cache: dict[str, str] = {}

The map_ticker_to_cik method normalizes and validates the ticker, checks the cache, and delegates resolution to _resolve_cik_by_ticker, raising an error if resolution fails.

The _resolve_cik_by_ticker helper invokes the MappingApi, processes the response and extracts only the necessary CIK value for return.

        def map_ticker_to_cik(self, ticker: str) -> str:
            """Return the CIK for the given ticker symbol."""
            normalized = ticker.strip().upper()
            if not normalized:
                raise ValueError("Ticker symbol must be provided.")

            if normalized not in self._cik_cache:
                cik = self._resolve_cik_by_ticker(normalized)
                if not cik:
                    raise ValueError(f"Unable to map ticker {ticker!r} to a CIK.")
                self._cik_cache[normalized] = cik

            return self._cik_cache[normalized]

        def _resolve_cik_by_ticker(self, ticker: str) -> Optional[str]:
            """
            Use the Mapping API to resolve `ticker` and return the first CIK found.
            The API can respond with either a dict, a dict containing `data`, or a list.
            """
            try:
                response = self.mapping_api.resolve("ticker", ticker)
            except Exception as exc:
                raise RuntimeError(f"Mapping API lookup failed for ticker {ticker!r}") from exc

            entries = []
            if isinstance(response, dict):
                data = response.get("data")
                if isinstance(data, list):
                    entries = data
                else:
                    entries = [response]
            elif isinstance(response, list):
                entries = response

            for entry in entries:
                cik = entry.get("cik") or entry.get("CIK") or entry.get("cik_str") or entry.get("cikNumber")
                if cik:
                    return str(cik).strip()
            return None

The functions get_latest_10k_metadata and get_latest_10k_text follow the same logic as map_ticker_to_cik, encapsulating API interactions and functionality within the client class while keeping the MCP server definition minimalistic. The complete implementation is available in the [repository](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>).

[GitHub - Anastasiia-Selezen/finAssistant_mcpserver](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>)

## Implementing the Agent Scope MCP Server definition

The Agent Scope MCP server definition does not invoke tools like the two servers described above. Instead, it serves a system prompt: a structured, reusable template that is fetched at runtime and filled with the user's query. It follows the same standardized server structure.

**Setup**

  * Initialize a FastMCP server instance.
  * Use the @agent_scope_mcp.prompt(...) decorator to publish a prompt named financial_analysis_prompt.

**Behavior
** The prompt function accepts query and returns a formatted system prompt.

    import logging

    from fastmcp import FastMCP
    from server.prompts import SYSTEM_PROMPT

    agent_scope_mcp = FastMCP("agent_scope_prompts")

    log = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)

    @agent_scope_mcp.prompt(
        name="financial_analysis_prompt",
        description="Prompt for analyzing financial data, stocks and market trends.",
        tags={"financial", "analysis", "stocks"},
    )
    def financial_analysis_prompt(query: str):
        """
        Format the FINANCIAL_ANALYSIS_PROMPT using the provided arguments dict.
        All keys in arguments will be passed as keyword arguments to format().
        """
        log.info(f"Formatting financial analysis prompt with arguments: {query}")
        return SYSTEM_PROMPT.format(query)

SYSTEM_PROMPT is a template string that includes a placeholder for the query.

    # prompts.py

    SYSTEM_PROMPT = """
    You are the lead financial analyst. Your job is to answer the user's question: {}, by orchestrating MCP tools and keep answers focused and factual.

      Available tools
      • `alphavantage.search_symbol(keywords)` - resolve ambiguous company names to tickers; call before any market data request if the ticker is uncertain.
      • `alphavantage.get_intraday(symbol, interval)` - intraday OHLC and volume; pick an interval that matches the user's timeframe and report the last refresh time from the payload.
      • `alphavantage.get_news_sentiment(tickers, topics?, time_from?, time_to?)` - headline-level sentiment; only call when the user asks about news, catalysts, or sentiment. Omit optional parameters unless the user specifies them.
      • `sec.map_ticker_to_cik(ticker)` - convert a market ticker to its SEC CIK; cache and reuse the result for subsequent SEC calls.
      • `sec.get_latest_10k_metadata(ticker)` - latest 10-K metadata (filing date, accession number, document links); use when the user wants filing stats or links.
      • `sec.get_latest_10k_text(ticker, sections?)` - plain-text excerpt of the latest 10-K; accept a comma-delimited list of sections if the user requests specific items.

      Interaction principles
      1. Interpret the user's request, asking for clarification when the ticker, timeframe, or data type is unclear.
      2. Plan tool usage before acting; avoid redundant calls and rely on previous results whenever possible (e.g., reuse the CIK you already mapped).
      3. Call only the tools necessary to answer the question. If the tools cannot satisfy the request, explain the limitation honestly.
      4. Ground every statement in tool outputs. Note timestamps, units, and data gaps; do not fabricate values.
      5. Match the user's desired level of detail. Deliver concise answers for narrow questions and provide richer context only when the user asks for it--never generate a full multi-section report by default.
      6. Close responses with optional next steps only when they add clear value.
      7. Limit yourself to at most five total tool calls. If you still cannot answer, stop and share your best analysis along with the gap.

      Stay professional, transparent, and aligned with the user's intent at all times.
    """

## Implementing the Tool Registry MCP Server

An aggregator MCP Server ("tool registry") that imports several MCP Servers/server definitions (Alpha Vantage, SEC, and a prompts server) into one place so hosts connect to a single endpoint.

### Class attributes

  * self.registry = FastMCP("tool_registry"): FastMCP server instance that exposes all imported tools, prompts, and resources.
  * self.all_tags: Set[str]: Deduplicated set of tool tags across imported servers.
  * self._is_initialized: Initialization guard to prevent re-running setup (ensures idempotence).

### Initialization flow

  1. import_server(..., prefix=...): Imports the three upstream server definitions with distinct prefixes.
  2. Collects tags from all exposed tools.
  3. Marks the registry as initialized.

### Accessors

  * get_registry(): Returns the aggregated FastMCP server (single endpoint).
  * get_all_tags(): Returns the precomputed tag set for discovery and filtering.

    import logging

    from fastmcp import FastMCP
    from server.agent_scope import agent_scope_mcp
    from server.alpha_vantage import alphavantage_mcp, load_alpha_vantage_tools
    from server.sec import sec_mcp

    log = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)

    class McpServersRegistry:
        def __init__(self):
            self.registry = FastMCP("tool_registry")
            self.all_tags: set[str] = set()
            self._is_initialized = False

        async def initialize(self):
            if self._is_initialized:
                return

            log.info("Initializing McpServersRegistry...")
            await load_alpha_vantage_tools()
            await self.registry.import_server(alphavantage_mcp, prefix="alphavantage")
            await self.registry.import_server(agent_scope_mcp, prefix="scope")
            await self.registry.import_server(sec_mcp, prefix="sec")

            all_tools = await self.registry.get_tools()
            for tool in all_tools.values():
                if tool.tags:
                    self.all_tags.update(tool.tags)

            log.info(f"Registry initialization complete. Found tags: {self.all_tags}")
            self._is_initialized = True

        def get_registry(self) -> FastMCP:
            """returns the initialized tool registry."""
            return self.registry

        def get_all_tags(self) -> set[str]:
            """returns the pre-calculated set of all tool tags."""
            return self.all_tags

> Note that when a server is [**imported**](<https://gofastmcp.com/python-sdk/fastmcp-server-server#import-server>), its objects are immediately registered to the importing server. This is a one-time operation and future changes to the imported server will not be reflected in the importing server.

> Unlike importing (with [import_server](<https://gofastmcp.com/python-sdk/fastmcp-server-server#import-server>)), [**mounting**](<https://gofastmcp.com/python-sdk/fastmcp-server-server#mount>)establishes a dynamic connection between servers. This means changes to the mounted server are immediately reflected when accessed through the parent.

> Source: [FastMCP documentation](<https://gofastmcp.com/python-sdk/fastmcp-server-server>)

This code is adapted from the [**enterprise-mcp-course**](<https://github.com/decodingai-magazine/enterprise-mcp-course>). Additional details about building the tool-registry MCP Server are available in the ["Building the MCP Global Server" (DecodingAI)](<https://www.decodingai.com/i/168398468/building-the-mcp-global-server>).

[Build with MCP Like a Real Engineer](<https://www.decodingai.com/i/168398468/building-the-mcp-global-server>)

## How to start the MCP Server

Once all MCP Servers/server definitions are implemented, start a single Tool Registry MCP Server that aggregates the upstream servers and exposes one endpoint.

In the code below, McpServersRegistry() constructs the registry object. anyio.run(mcp_tool_manager.initialize) runs the async initialization, importing upstream servers and registering tools and the prompt. mcp_tool_manager.get_registry().run(...) then launches the server over the streamable-http transport on localhost:5555.

    # main.py
    import anyio
    from server.tool_registry import McpServersRegistry

    def main():
        mcp_tool_manager = McpServersRegistry()
        anyio.run(mcp_tool_manager.initialize)

        mcp_tool_manager.get_registry().run(
            transport="streamable-http", host="localhost", port=5555
        )

    if __name__ == "__main__":
        main()

After running uv run main.py, the following logs appear:

    INFO:server.tool_registry:Initializing McpServersRegistry...
    INFO:server.alpha_vantage:Loading Alpha Vantage tools via FastMCP proxy...
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 200 OK"
    INFO:mcp.client.streamable_http:Received session ID: c260cc50-bef5-4c5f-b0de-d266b321dc9a
    INFO:mcp.client.streamable_http:Negotiated protocol version: 2024-11-05
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 202 Accepted"
    INFO:httpx:HTTP Request: GET https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 500 Internal Server Error"
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: DELETE https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 204 No Content"
    INFO:server.alpha_vantage:Alpha Vantage tools ready.
    INFO:server.tool_registry:Registry initialization complete. Found tags: {'cik', 'filing', '10-K', 'text', 'sec', 'mapping', 'metadata', 'ticker'}

    ╭──────────────────────────────────────────────────────────────────────────────╮
    │                                                                              │
    │                         ▄▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀▀ █▀█                        │
    │                         █▀  █▀█ ▄▄█  █  █ ▀ █ █▄▄ █▀▀                        │
    │                                                                              │
    │                               FastMCP 2.13.0.2                               │
    │                                                                              │
    │                                                                              │
    │                  🖥  Server name: tool_registry                               │
    │                                                                              │
    │                  📦 Transport:   HTTP                                        │
    │                  🔗 Server URL:  http://localhost:5555/mcp                   │
    │                                                                              │
    │                  📚 Docs:        https://gofastmcp.com                       │
    │                  🚀 Hosting:     https://fastmcp.cloud                       │
    │                                                                              │
    ╰──────────────────────────────────────────────────────────────────────────────╯

    [11/05/25 22:41:26] INFO     Starting MCP server 'tool_registry' with transport 'streamable-http' on http://localhost:5555/mcp                                                           server.py:2050
    INFO:     Started server process [64687]
    INFO:     Waiting for application startup.
    INFO:mcp.server.streamable_http_manager:StreamableHTTP session manager started
    INFO:     Application startup complete.
    INFO:     Uvicorn running on http://localhost:5555 (Press CTRL+C to quit)

This log indicates that the aggregated Tool Registry MCP Server is running, available at <http://localhost:5555/mcp>, and ready for MCP clients to connect over the streamable-http transport. 🎉

## How to test the MCP Server

In order to make sure that the MCP Server is working as expected, as with any piece of software it has to be tested. In case of a large number of tools, the tests should be automated, checking not only the connection to the server but also that the tools return expected values. For quick manual testing and debugging purposes, the [MCP Inspector](<https://modelcontextprotocol.io/docs/tools/inspector>) can be used.

> The [MCP Inspector](<https://github.com/modelcontextprotocol/inspector>) is an interactive developer tool for testing and debugging MCP Servers.

Instructions on how to run it are available in[ the official repository](<https://github.com/modelcontextprotocol/inspector?tab=readme-ov-file#running-the-inspector>).

After starting it, connect to the running MCP Server. On the left side, select the needed configuration. In this case, choose Streamable HTTP, specify the URL (<http://localhost:5555/mcp>), and set the connection type to Proxy. Press Connect.

![](https://cdn-images-1.medium.com/max/628/1*ISZCg4uugQvlCIh_1lsmXQ.png)

After successfully connecting to the MCP Server, the available resources/tools/prompts can be inspected. Navigate to the Tools tab, click **List Tools**, and all available tools will be displayed.

![](https://cdn-images-1.medium.com/max/1024/1*50fYrKeBzhlXnxUdSBm9fw.png)

Then, click on the tool that needs to be inspected. It will appear on the right side, where the required parameters can be entered.

![](https://cdn-images-1.medium.com/max/1024/1*WlJRjdEK_DJXBoxS6vnPqA.png)

_Inspecting alphavantage_get_intraday tool_

Click **Run Tool** to execute it. Once the execution is complete, a **Tool Result: Success/Error** message will appear below the button.

The returned result can also be viewed. In this example, the **alphavantage_get_intraday** tool was executed with the parameters **AMD** and **5min. T** he result is shown in the image below.

![](https://cdn-images-1.medium.com/max/1024/1*JslmYy7wPvbGlPa4Z9Su6Q.png)

Also, checking the MCP Server logs shows that it received the request. A local MCP client connected over _streamable-http_ , creating a new transport session. The server processed a **ListToolsRequest** and then a **CallToolRequest**. That call triggered the Alpha Vantage upstream MCP: a client session was established (session ID shown), protocol version **2024-11-05** was negotiated and calls to upstream server were made.

    INFO:mcp.server.streamable_http_manager:Created new transport with session ID: 8430e746a8c6497da9fef67b7b5e2cda
    INFO:     ::1:60145 - "POST /mcp HTTP/1.1" 200 OK
    INFO:     ::1:60145 - "POST /mcp HTTP/1.1" 202 Accepted
    INFO:     ::1:60145 - "GET /mcp HTTP/1.1" 200 OK
    INFO:     ::1:60148 - "POST /mcp HTTP/1.1" 200 OK
    INFO:mcp.server.lowlevel.server:Processing request of type ListToolsRequest
    INFO:     ::1:60196 - "POST /mcp HTTP/1.1" 200 OK
    INFO:mcp.server.lowlevel.server:Processing request of type CallToolRequest
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 200 OK"
    INFO:mcp.client.streamable_http:Received session ID: 12c987b2-a01c-4e76-9b9a-e40f9d7191e6
    INFO:mcp.client.streamable_http:Negotiated protocol version: 2024-11-05
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 202 Accepted"
    INFO:httpx:HTTP Request: GET https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 500 Internal Server Error"
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: POST https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 200 OK"
    INFO:httpx:HTTP Request: DELETE https://mcp.alphavantage.co/mcp?apikey= "HTTP/1.1 204 No Content"

In this simple way, it is possible to manually check a tool and observe what is happening inside.

## Conclusion

This article provides a step-by-step guide to implementing and evaluating MCP Server with FastMCP and MCP Inspector. The resulting architecture exposes a single-endpoint Tool Registry MCP Server that composes three focused server/server definitions: a proxy for the official Alpha Vantage MCP, a custom SEC MCP with core logic in SECAPIClient**,** and an Agent Scope prompts server definition, so MCP hosts and clients can query a consistent interface. This small example can be easily extended to a production system in the future.

## Pros:

  * **One endpoint, many tools:** Alpha Vantage, SEC, and prompt tools appear under a single interface, making MCP client setup and tool discovery (tags, titles, annotations) straightforward.
  * **Clear separation of concerns:** Minimalistic tool wrappers. Provider-specific logic lives in SECAPIClient.
  * **Reusable building blocks:** Each server stands on its own and can be reused across other projects.
  * **Easy to test:** MCP Inspector enables quick manual checks. Logs show session IDs, protocol negotiation, and upstream calls for transparent debugging.

## Cons:

  * **Added latency:** Each call spins up a Streamable-HTTP session and runs MCP negotiation, which is slower than direct SDK calls.
  * **Import vs. mount trade-off:** import_server takes a snapshot of tools, upstream changes won't appear dynamically unless mount is used.
  * **Security risks:** MCP Servers pose significant security risks because they can execute commands and perform API calls.

## Lessons Learned

  1. **Structure matters:** Define a clear, understandable tool interface with precise names, meaningful tags, and concise descriptions. Keep server implementations minimal and move core logic into helper classes (e.g., SECAPIClient) to stay maintainable and extensible.
  2. **Use structured logging:** Consistent, detailed logs make issues easy to trace and significantly speed up debugging.
  3. **Leverage MCP Inspector:** It's an effective way to manually validate that tools behave as expected.
  4. **Choose import vs. mount intentionally:** Use import for stable, snapshot-style integration and mount when live updates from upstream servers are required.
