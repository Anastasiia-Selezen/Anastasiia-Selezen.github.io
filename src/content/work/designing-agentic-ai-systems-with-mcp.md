---
title: "Designing Agentic AI Systems with the Model Context Protocol (MCP)"
date: 2025-11-08 20:00
summary: "MCP architecture and design patterns for agentic AI systems."
category: "MCP"
tags: ["mcp", "agents", "llm", "architecture"]
type: "article"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/designing-agentic-ai-systems-with-the-model-context-protocol-mcp-cad3b5412141"
legacyUrl: "/designing-agentic-ai-systems-with-the-model-context-protocol-mcp.html"
---

![](https://cdn-images-1.medium.com/max/1024/1*683mx4DjKGAfm8MkGIG7tg.png)

## Abstract

This article presents the architecture of an agentic AI assistant that autonomously handles complex tasks by invoking tools via the Model Context Protocol (MCP). As assistants evolve from simple chatbots into systems that orchestrate complex workflows, development can quickly become chaotic. The article outlines an MCP-based design, explains the protocol and highlights the advantages and challenges of such an approach.

## Goal and Requirements

The objective of this project is to enhance the Financial AI Assistant by adopting the MCP. Learn more about the earlier project here:

[Financial AI Assistant Powered by CrewAI](</work/financial-ai-assistant-powered-by-crewai/>)

### System requirements

The AI Assistant can retrieve real-time stock data, market news, and SEC filings for publicly traded companies. It analyzes this information and returns clear, well-grounded answers to user requests. It **does not** provide investment advice or recommendations, its purpose is to **help analyze** stocks, companies, and market data.

By connecting to external tools, such as an Alpha Vantage MCP server and an SEC MCP server, the assistant keeps information up-to-date, improving accuracy, relevance, and utility.

To achieve these capabilities, the system must include:

  * **MCP Servers** (e.g., Alpha Vantage, SEC) exposing real-time data and filings.
  * **A clearly defined agent prompt** to set scope, tone, and constraints.
  * **MCP Host and MCP Client** for coordinating tool access.
  * **A ReAct-style agent architecture** to interpret queries and decide when to call tools.

## The Technologies

### What is the MCP?

The official definition is:

> [MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems.](<https://modelcontextprotocol.io/docs/getting-started/intro>)

What is it all about? Think of it like a movie set.

The **Director** runs the show. They know the vision and decide what's needed to make the movie come alive.

Each **Assistant Director (AD)** has a headset and a direct line to one or more departments. They pass the Director's requests and bring back what's needed.

Each **department** is a team of specialists. They have the expertise and the resources to deliver exactly what's needed when asked.

<img class="image-compact" src="https://cdn-images-1.medium.com/max/1024/1*qNUo4QhW1lhQDOYiODVtJw.png" alt="">

_The Director gives the orders → the ADs relay them → the departments deliver_

This kind of setup keeps the production organized, no matter how complex the movie becomes. Everyone knows their role, communication stays clear, and adding a new department doesn't throw the whole system off balance.

That's the same spirit behind the MCP-based design. A structure built to keep things modular, connected, and easy to manage as the project grows.

Switching to MCP terminology:

  * **Director = MCP Host**
  * **Assistant Directors (ADs) = MCP Clients**
  * **Departments = MCP Servers**

The **MCP Host** is the AI application that coordinates the system. It manages one or more **MCP Clients**, which maintain connections to **MCP Servers** and obtain context from those servers for the host to use.

![](https://cdn-images-1.medium.com/max/1024/1*9aA6Hr9x3-GF5N5Z8TzWBA.png)

_MCP Architecture (<https://modelcontextprotocol.io/docs/learn/architecture>)_

While MCP servers are often colloquially called "tools," that's not their only role. MCP defines **three core primitives** that servers can expose. These primitives are the key concept in MCP, they specify what clients and servers can offer each other, what context can be shared with AI applications, and what actions can be taken.

  * **Tools**: Executable functions that AI applications can invoke to perform actions _(e.g., calling an API endpoint, updating a database record, running a computation pipeline)_
  * **Prompts**: Reusable templates that help structure interactions with language models _(e.g., system prompts, chain-of-thought scaffolds, or few-shot examples)_
  * **Resources**: Read-only data sources that provide context _(e.g., configuration files, vector embeddings, documentation)_

Beyond server-exposed primitives, MCP clients can also expose primitives that enable richer interactions for server authors:

  * **Sampling:** Lets servers request LLM completions via the client, supporting agentic workflows while keeping permissions and security under client control.
  * **Elicitation:** Allows servers to request specific information from users during an interaction, providing a structured way to collect data on demand.
  * **Roots:** Lets clients declare which directories a server should consider, communicating the intended scope.

When relying on existing MCP clients, be mindful of which primitives they support. Further details are available in [the official documentation](<https://modelcontextprotocol.io/clients>).

### Transport layer

For the MCP host to get what it needs, the MCP client must establish a connection to an MCP server. MCP supports two transport mechanisms that handle communication and authentication:

  * **Stdio transport:** Uses standard input/output between local processes on the same machine. It's fast and avoids any network overhead.
  * **Streamable HTTP transport:** Uses HTTP POST for client-to-server messages and optional Server-Sent Events (SSE) for streaming responses. Suitable for remote servers and works with standard HTTP auth (bearer tokens, API keys, custom headers).

In MCP, a **host** can manage any number of **clients**. Each **client** maintains exactly one connection to exactly one **server**. To communicate with multiple servers from a single host, multiple client instances are required, one per server.

This can be simplified with an aggregator (proxy) server placed in front of downstream servers. The aggregator exposes a single, unified server interface while maintaining separate connections behind the scenes.

LangChain's [`MultiServerMCPClient`](<https://docs.langchain.com/oss/python/langchain/mcp#use-mcp-tools>) offers this "one client façade → many servers" pattern: it takes a map of server configurations, opens one MCP connection per server, and presents a single client object to the application. This is well-suited when plugging in ready-made MCP servers.

When several servers are being developed in-house, a custom aggregator (e.g., a [FastMCP wrapper server](<https://gofastmcp.com/python-sdk/fastmcp-server-server#import-server>) that imports and composes other MCP servers) may be preferred for tighter control over routing, auth, logging, and evolution of server contracts.

### Lifecycle and Data Layer
MCP is a stateful protocol and therefore requires explicit lifecycle management with three phases:

  1. Initialization
  2. Operation
  3. Shutdown

During **initialization**, the client and server agree on a protocol version and the capabilities they will use. MCP's data layer relies on JSON-RPC 2.0 to structure all client-server messages. The handshake begins with the client sending an initialize request. In this request, `jsonrpc` is always "2.0", `id` correlates the response, `method` is "initialize", and `params` includes the requested `protocolVersion`, the client's offered capabilities (for example, roots events, sampling, and elicitation), and `clientInfo` for diagnostics and display. Example:

    {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "initialize",
      "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {
          "roots": {
            "listChanged": true
          },
          "sampling": {},
          "elicitation": {}
        },
        "clientInfo": {
          "name": "ExampleClient",
          "title": "Example Client Display Name",
          "version": "1.0.0"
        }
      }
    }

The server replies with an initialize result that mirrors the structure: the agreed `protocolVersion`, the server's capabilities (such as tools, resources, and prompts), `serverInfo` for observability, and optional instructions to guide client behavior.

    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "protocolVersion": "2024-11-05",
        "capabilities": {
          "logging": {},
          "prompts": {
            "listChanged": true
          },
          "resources": {
            "subscribe": true,
            "listChanged": true
          },
          "tools": {
            "listChanged": true
          }
        },
        "serverInfo": {
          "name": "ExampleServer",
          "title": "Example Server Display Name",
          "version": "1.0.0"
        },
        "instructions": "Optional instructions for the client"
      }
    }

Once initialized, normal **operation** covers tool calls, resource reads, prompt access, client-side sampling and elicitation, logging, notifications, and progress updates, all constrained by the negotiated capabilities.

**Shutdown** is simply a clean close of the underlying transport (for example, ending the HTTP connection) after outstanding requests complete.

![](https://cdn-images-1.medium.com/max/1024/1*PGdBHrBwOMPpQdOCoBsy4A.png)

_MCP Lifecycle_

## The Solution

Building on the theory above, the updated architecture for the Financial AI Assistant is as follows:

![](https://cdn-images-1.medium.com/max/1024/1*Voq3LwoWXZ5KEi3TfhMYmg.png)

_MCP Architecture for the Financial AI Assistant_

The MCP Host is the central orchestrator. It exposes an API endpoint that receives user queries and coordinates communication between multiple MCP Clients, each connected to a specific MCP Server.

The MCP Host invokes a ReAct agent configured with tools discovered via the MCP Servers. The agent selects from the available tools, makes decisions, and executes actions to fulfill the request.

This approach requires maintaining three MCP clients and three MCP servers, which increases operational complexity, introduces duplication, and expands the potential points of failure.

An alternative approach is to implement an MCP server aggregator (e.g., a [FastMCP wrapper server](<https://gofastmcp.com/python-sdk/fastmcp-server-server#import-server>) that imports and composes other MCP servers). The architecture would then look as follows:

![](https://cdn-images-1.medium.com/max/1024/1*cZN5HPZLDKszA1tBFJH3Ig.png)

_MCP Architecture for the Financial AI Assistant with MCP Server aggregator_

Requests arrive at an API endpoint on the MCP Host. Inside the MCP Host, a single MCP Client communicates with a Tool Registry acting as an MCP Server aggregator. To integrate external servers, they must follow the FastMCP interface, those that don't can be wrapped with a FastMCP server definition.

The registry aggregates three FastMCP Server definitions:

  * **Alpha Vantage:** provides intraday market data, symbol lookup, and curated news sentiment for equities.
  * **SEC:** resolves tickers to CIK identifiers, fetches the latest 10-K filing metadata, and retrieves the full 10-K document text.
  * **Agent Scope:** supplies a prebuilt financial-analysis prompt used to guide reasoning and tool selection.

This approach simplifies operations and reduces the overhead of maintaining separate clients for each server, as well as running and monitoring multiple MCP servers.

This MCP architecture also improves security because all secrets are managed on the server side and the MCP Host stores no secrets. Additionally, the connection between the MCP Host and the MCP server aggregator can remain within the internal network.

Detailed implementations of the MCP Server definitions and MCP Server aggregator are available in the [_MCP Server Architecture for Financial AI Assistant_](</work/mcp-server-architecture-financial-ai-assistant/>) post, with source code provided [on GitHub](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>).

  * [MCP Server Architecture for Financial AI Assistant](</work/mcp-server-architecture-financial-ai-assistant/>)
  * [GitHub - Anastasiia-Selezen/finAssistant_mcpserver](<https://github.com/Anastasiia-Selezen/finAssistant_mcpserver>)

Detailed implementations of the MCP Host and Client, along with an explanation of the ReAct agent design, are available in the [_MCP Host & Client: A Clean Architecture for Multi-Tool LLM Systems_](</work/mcp-host-client-clean-architecture/>) post, with full source code [on GitHub](<https://github.com/Anastasiia-Selezen/finAssistant_mcphost#>).

  * [MCP Host & Client: A Clean Architecture for Multi-Tool LLM Systems](</work/mcp-host-client-clean-architecture/>)
  * [GitHub - Anastasiia-Selezen/finAssistant_mcphost](<https://github.com/Anastasiia-Selezen/finAssistant_mcphost>)

## Conclusion

The MCP architecture brings structure, clarity, and scalability to multi-tool AI systems. By separating core logic from tools, the Financial AI Assistant achieves modularity, traceability, and flexibility. The system is easily extensible: new tools or prompts can be added without changing the core orchestration layer.

This post and the implementation of the Financial AI Assistant with MCP were inspired by the [_Designing Enterprise MCP Systems_ free course](<https://github.com/decodingai-magazine/enterprise-mcp-course>) from [**Decoding AI Magazine**](<https://www.decodingai.com/>), created by Anca Ioana Muscalagiu and Paul Iusztin.

## Pros:

  * **Modularity:** Clear separation of core logic from tools simplifies maintenance and future extensions.
  * **Standardization:** MCP provides a consistent protocol for tool invocation and context sharing, reducing custom glue code.
  * **Reusability:** Existing MCP servers and prompts can be reused across projects or combined through aggregators.

## Cons:

  * **Limited maturity:** The ecosystem is still evolving, documentation and client features may vary.
  * **Security risks:** Additional servers and transports raise the possibility of attacks, requiring robust authentication and access controls.
  * **Latency:** Multi-hop communication between Host, Client, and Servers can increase response time.

## Lessons Learned

  1. **Architecture matters:** Good software architecture accelerates iteration. A modular design pays off as the system grows.
