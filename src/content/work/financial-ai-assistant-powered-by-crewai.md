---
title: "Financial AI Assistant Powered by CrewAI"
date: 2025-02-03 20:00
summary: "Building an AI-powered financial assistant using CrewAI to automate data extraction, analysis, and reporting through specialized AI agents."
category: "LLM Agents"
tags: ["financial-ai", "agents", "crewai", "automation"]
type: "project"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/financial-ai-assistant-powered-by-crewai-664469b87ba5"
legacyUrl: "/financial-ai-assistant-powered-by-crewai.html"
---

![](https://cdn-images-1.medium.com/max/1024/0*VZEU-YPXjwkiCstH)

## Abstract
This article shows the implementation of a multi-agent AI assistant that can perform complex tasks autonomously. AI assistants have become more sophisticated, evolving beyond simple chatbots into powerful, multi-agent systems capable of handling complex workflows. This article explores how to build an AI assistant using CrewAI, discusses the required technologies, and highlights the advantages and challenges of such approach.

## Goal and Requirements

The objective of this project is to develop a Financial AI Assistant capable of extracting real-time stock market data, news, and SEC filings of publicly traded companies. Additionally, it can analyze the extracted data and generate comprehensive reports based on user queries, ensuring accurate and relevant financial insights.

By allowing the AI assistant to use external tools such as calling external APIs and web scraping, it can access real-time data. This keeps the information up-to-date, making responses more accurate, relevant, and useful.

This capability is particularly useful for tasks that require processing large volumes of information within a short time frame. Instead of manually searching for relevant data and identifying key insights, the AI assistant can accomplish this within minutes. Additionally, users can extract and compare data across multiple years, offering a comprehensive view of a company's historical performance.

To achieve these capabilities, the system must include:

  * Clearly defined agent roles and tasks.
  * Integration with external APIs for real-time data access.
  * Well-structured tools for data extraction and analysis.
  * Seamless communication and collaboration among AI agents.
  * A user-friendly interface for querying and viewing reports.

## The Technologies

The following technologies and tools are used to implement the AI assistant:

  * [**CrewAI**](<https://www.crewai.com/>)**:** The core framework for orchestrating AI agents.
  * [**OpenAI GPT 4o mini**](<https://platform.openai.com/docs/models#gpt-4o-mini>)**:** Provides natural language processing capabilities.
  * [**Alpha Vantage**](<https://www.alphavantage.co/>)**:** Provides realtime and historical financial market data through a set of powerful and developer-friendly data APIs.
  * [**SEC API**](<https://sec-api.io/>)**:** Gateway to search the latest SEC filings and access all corporate documents from the SEC EDGAR archive filed since 1994.
  * [**Streamlit**](<https://streamlit.io/>)**:** Facilitates the development of a user-friendly interface with no front‑end experience required.

### What is CrewAI?

[CrewAI](<https://www.crewai.com/>) is a cutting-edge framework for orchestrating autonomous AI agents, enabling efficient task management and collaboration. It consists of four key components:

  * **Crew:** Organizes the overall operation.
  * **AI Agents:** Handle specialized tasks based on their expertise.
  * **Process:** Ensures smooth coordination and workflow.
  * **Tasks**: Individual units of work assigned systematically to achieve complex objectives.

![](https://cdn-images-1.medium.com/max/1024/0*35ZImoAqu70yvWJo.png)

CrewAI is ideal for scenarios that require multiple AI agents to collaborate in executing complex workflows. Rather than relying on a single large language model to manage all tasks, CrewAI enables the creation of specialized agents, each assigned a distinct role, to work together efficiently.

**When Not to Use CrewAI**

  * When a single AI assistant, such as a basic chatbot answering simple questions, is sufficient.
  * When tasks involve straightforward query-response interactions or function calling with minimal complexity.
  * When the primary requirement is pure data retrieval without the need for multi-step reasoning or agent collaboration.

## The Solution

### Prerequisites

Before proceeding, ensure that CrewAI is installed:

> _CrewAI requires_ _Python >=3.10 and <3.13_

    pip install 'crewai[tools]'

### Create a new project

Run the CrewAI CLI command:

    crewai create crew aiassistant

This creates a new project with the following structure:

    aiassistant/
    ├── .gitignore
    ├── pyproject.toml
    ├── README.md
    ├── .env
    ├── uv.lock
    └── src/
        └── aiassistant/
            ├── __init__.py
            ├── main.py
            ├── crew.py
            ├── tools/
            │   ├── custom_tool.py
            │   └── __init__.py
            └── config/
                ├── agents.yaml
                └── tasks.yaml

CrewAI generates a template project that can be customized as needed.

Since CrewAI uses **uv** for dependency management, additional dependencies can be installed using the following commands:

    uv add sec-api
    uv add html2text
    uv add streamlit

For more details on using **uv**, refer to [the official documentation](<https://docs.astral.sh/uv/>).

### Defining Agent Roles and Tasks

The first step in building the AI assistant is to define agent roles and tasks. This can be done using natural language in YAML files, making it easy for subject matter experts to contribute.

For the Financial AI Assistant, the following agents have been defined:

    # src/aiassistant/config/agents.yaml
    manager:
      role: >
        Senior Supervisor
      goal: >
        Manage task delegation, ensure each agent completes its work,
        and check if gathered data is sufficient to answer the user's {query} regarding {ticker}.
        Trigger the specialized agents to perform their tasks.
      backstory: >
        You're a seasoned professional with years of experience coordinating teams and ensuring
        efficient workflows. Known for your strong leadership skills and ability to think strategically,
        you excel at breaking down complex goals into manageable tasks and guiding others to deliver
        exceptional results. Your role is pivotal in ensuring the system operates seamlessly, resolving
        bottlenecks, and maintaining a clear focus on the end objectives. You thrive under pressure
        and are deeply committed to achieving success through collaboration and precision.
      llm: openai/gpt-4o-mini

    stock_market_researcher:
      role: >
        Stock Market Researcher
      goal: >
        Gather real-time stock market data for {ticker}, analyze trends, compute additional metrics if needed, and
        provide insights coresponding to user's {query}.
      backstory: >
        You are an experienced stock market analyst with a deep understanding of market dynamics,
        economic indicators, and financial instruments. You thrive on identifying trends, spotting
        opportunities, and translating raw data into actionable insights. Your meticulous nature and
        analytical prowess allow you to navigate the complexities of the stock market, providing
        valuable recommendations to help stakeholders make informed decisions. Whether monitoring
        real-time fluctuations or digging into historical data, you approach every task with precision
        and a focus on delivering high-impact results.
      llm: openai/gpt-4o-mini

    news_researcher:
      role: >
        News Researcher
      goal: >
        Monitor financial news sites, press releases, blogs, and RSS feeds for breaking stories related to {ticker}
        that could shift the market. Deliver timely headlines and relevant summaries for inclusion
        in the daily digest, highlighting what's moving the needle regarding the user's {query}.
      backstory: >
        You are a dedicated financial news analyst with a talent for quickly identifying and interpreting
        key stories that influence market trends. With a sharp eye for detail and a knack for filtering
        noise, you excel at uncovering actionable insights amidst the constant stream of news. Your
        background in journalism and finance allows you to write concise and impactful summaries that
        help others stay informed and ahead of the curve. Always vigilant, you thrive in fast-paced
        environments and are committed to delivering accurate and timely information that supports
        critical decision-making.
      llm: openai/gpt-4o-mini

    data_extraction_specialist:
      role: >
        Data Extraction Specialist
      goal: >
        Parse 10-K/8-K filings and other company disclosures for {ticker} to extract critical textual or numeric data
        (revenue, guidance, risk factors, etc.).
        Surfaces key insights from lengthy documents so the digest captures vital developments relevant to the user's {query}
        without overwhelming detail.
      backstory: >
        You are a highly skilled analyst with a strong background in financial reporting and regulatory
        compliance. Known for your ability to distill complex corporate filings into clear and actionable
        insights, you excel at identifying the information that truly matters. With an eye for both detail
        and context, you ensure no critical data point is overlooked while filtering out unnecessary noise.
        Your expertise enables decision-makers to stay informed and focused on the most impactful
        developments. Whether analyzing dense legal language or crunching numbers, you approach
        every task with precision and a commitment to clarity.
      llm: openai/gpt-4o-mini

    financial_analyst:
      role: >
        Financial Analyst
      goal: >
        Synthesizes inputs from all relevant agents regarding {ticker} and formats them into a concise, reader-friendly rundown.
        Deliver an at-a-glance snapshot of the most impactful data, news, and filings relevant to the user's {query},
        so they quickly grasp market conditions and company updates.
      backstory: >
        You are a well-rounded financial expert with exceptional communication skills and a deep understanding
        of markets, company performance metrics, and economic trends. Known for your ability to take complex
        and fragmented information from multiple sources and shape it into a clear and cohesive summary,
        you ensure users can make quick, informed decisions. You thrive on distilling vast amounts of data into
        the most relevant points and presenting them in a polished, professional format. Your goal is to provide
        clarity amidst the complexity of the financial world, enabling users to stay ahead in a fast-moving market.
      llm: openai/gpt-4o-mini

Each agent's definition consists of a role, goal, and backstory to provide as much context as possible.

Variables such as {ticker} and {query} are dynamically interpolated into the agent's definition based on user input.

In a similar manner, the next set of tasks is defined:

    # src/aiassistant/config/tasks.yaml
    supervisor_task:
      description: >
        Oversee the delegation of tasks to specialized agents. Ensure each agent completes their work
        and verify that the gathered data is sufficient to answer the user's {query}.
      expected_output: >
        Delegation of a task to the right coworker. Confirming task completion and data sufficiency,
        with any necessary follow-up actions to address {query}.
      agent: manager

    stock_market_data_extraction_task:
      description: >
        Gather real-time stock market data for {ticker}.
      expected_output: >
        Stock market data for {ticker} in JSON format.
      agent: stock_market_researcher

    stock_market_data_analysis_task:
      description: >
        Analyze trends for {ticker}, compute additional metrics if needed, and provide insights related to {query}.
      expected_output: >
        A detailed report with real-time stock market data, trend analysis, computed metrics, and actionable insights
        relevant to {query}.
      agent: stock_market_researcher

    find_news_task:
      description: >
        Extract all available news, press releases, blogs, and RSS feeds related to {ticker}.
      expected_output: >
        News and articles about {ticker} in JSON format.
      agent: news_researcher

    analyse_news_task:
      description: >
        Summarize the main points of extracted articles about {ticker}, ensuring all important information
        relevant to {query} is included.
      expected_output: >
        A list of timely headlines and relevant summaries highlighting key stories influencing {ticker}
        and addressing {query}.
      agent: news_researcher

    data_extraction_task:
      description: >
        Parse 10-K/8-K filings and other company disclosures for {ticker} to extract critical textual or numeric data
        (revenue, guidance, risk factors, etc.).
        Surface key insights from lengthy documents to capture vital developments.
      expected_output: >
        A concise summary of key insights from 10-K/8-K filings and other company disclosures for {ticker}.
      agent: data_extraction_specialist

    financial_analysis_task:
      description: >
        Synthesize inputs from all relevant agents regarding {ticker} and format them into a concise, reader-friendly
        rundown that directly addresses {query}.
      expected_output: >
        A polished and professional summary report providing a clear snapshot of {ticker}'s market conditions
        and company updates relevant to {query}. Formatted as markdown without '```'.
      agent: financial_analyst

Each task definition consists of a description, an expected output, and the agent responsible for executing it.

### Create custom tools

The next step is to define custom tools. CrewAI offers a comprehensive set of built-in tools that can be used directly by importing them from crewai_tools. More details about these tools can be found in the [documentation](<https://docs.crewai.com/concepts/tools>).

However, it is also possible to create custom tools tailored to specific needs. To do this, a .py file should be created within the tools folder.

![](https://cdn-images-1.medium.com/max/510/1*O1H9R8nGX2xA5XcelFyP7A.png)

_Custom tools_

Each file is responsible for a single tool. As an example, consider stock_market_data_extraction.py. This file defines two key components:

  * StockMarketDataExtractorInput, a Pydantic class used to specify the input structure.
  * StockMarketDataExtractor, the main tool class that defines the tool itself.

Within StockMarketDataExtractor, the tool's name, description, and args_schema (which refers to StockMarketDataExtractorInput) are specified.

The _run method implements the tool's functionality. In this case, it makes a request to the [**Alpha Vantage API**](<https://www.alphavantage.co/>) to retrieve stock market data with a 5-minute interval.

Here's the implementation:

    from crewai.tools import BaseTool
    from pydantic import BaseModel, Field
    from typing import Type
    from typing import Any, Dict
    import requests
    import os

    ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

    class StockMarketDataExtractorInput(BaseModel):
        """Input schema for StockMarketDataExtractor tool."""
        symbol: str = Field(..., description="Ticker symbol of the stock for which stock market data is to be extracted.")

    class StockMarketDataExtractor(BaseTool):
        name: str = "Stock MArket Data Extractor"
        description: str = (
            """This tool calls Alpha Vantage API which returns current and
            20+ years of historical intraday OHLCV time series of the equity specified,
            covering pre-market and post-market hours where applicable
            (e.g., 4:00am to 8:00pm Eastern Time for the US market)."""
        )
        args_schema: Type[BaseModel] = StockMarketDataExtractorInput

        def _run(self, ticker: str) -> Dict[str, Any]:
            url = f'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={ticker}&interval=5min&apikey={ALPHA_VANTAGE_API_KEY}'
            r = requests.get(url)
            data = r.json()
            return data

### Defining Communication and Collaboration Among AI Agents

To integrate all components and create a crew, a few modifications to the crew.py file are needed. This includes importing the necessary tools, whether built-in or custom, and defining a FinancialAIAssistant class.

  * @CrewBase decorator marks this class as a CrewAI project.
  * @agent decorator registers methods as agent definitions.
  * @task decorator registers methods as task definitions.
  * @crew decorator registers the method as a crew definition.

Class variables agents_config and tasks_config define agent roles and tasks, respectively, based on the YAML files implemented above.

Each agent has a specific role and can use different tools to complete tasks. For example, a **Stock Market Researcher** can use StockMarketDataExtractor to pull data from Alpha Vantage.

Tasks are connected, and some depend on the output of others. For example, stock_market_data_analysis_task relies on output from stock_market_data_extraction_task.

The final task, financial_analysis_task, requires data from multiple sources, including stock analysis, news analysis, and data extraction. This ensures that all necessary information is available before generating the final report.

Setting async_execution=True allows tasks to run independently without blocking others. This is useful when multiple tasks can be processed in parallel, speeding up execution.

The output_file='report.md' setting saves the final result as a Markdown file.

The @crew method also defines how agents interact. Using Process.hierarchical simulates a traditional organizational hierarchy, allowing for clear task management. In this structure, a **manager agent** coordinates the workflow, delegates tasks, and validates outcomes to ensure efficient execution. This manager agent can either be automatically created by CrewAI or explicitly set by the user, for example, using manager_agent=self.manager().

Setting verbose=True enables detailed logs, making it easy to track execution.

    from crewai import Agent, Crew, Process, Task
    from crewai.project import CrewBase, agent, crew, task
    from aiassistant.tools.news_extractor import NewsExtractor
    from aiassistant.tools.stock_market_data_extraction import StockMarketDataExtractor
    from aiassistant.tools.sec_search import SEC10QTool

    @CrewBase
    class FinancialAIAssistant():
     """Financial AI Assistant crew"""

     agents_config = 'config/agents.yaml'
     tasks_config = 'config/tasks.yaml'

     @agent
     def manager(self) -> Agent:
      return Agent(
       config=self.agents_config['manager'],
       verbose=True,
      )

     @agent
     def stock_market_researcher(self) -> Agent:
      return Agent(
       config=self.agents_config['stock_market_researcher'],
       verbose=True,
       tools=[StockMarketDataExtractor()],
      )

     @agent
     def news_researcher(self) -> Agent:
      return Agent(
       config=self.agents_config['news_researcher'],
       verbose=True,
       tools=[NewsExtractor()],
      )

     @agent
     def data_extraction_specialist(self) -> Agent:
      return Agent(
       config=self.agents_config['data_extraction_specialist'],
       tools=[SEC10QTool()],
       verbose=True
      )

     @agent
     def financial_analyst(self) -> Agent:
      return Agent(
       config=self.agents_config['financial_analyst'],
       verbose=True,
      )

     @task
     def supervisor_task(self) -> Task:
      return Task(
       config=self.tasks_config['supervisor_task'],
      )

     @task
     def stock_market_data_extraction_task(self) -> Task:
      return Task(
       config=self.tasks_config['stock_market_data_extraction_task'],
       async_execution=True
      )

     @task
     def stock_market_data_analysis_task(self) -> Task:
      return Task(
       config=self.tasks_config['stock_market_data_analysis_task'],
       context=[self.stock_market_data_extraction_task()],
      )

     @task
     def find_news_task(self) -> Task:
      return Task(
       config=self.tasks_config['find_news_task'],
       async_execution=True
      )

     @task
     def analyse_news_task(self) -> Task:
      return Task(
       config=self.tasks_config['analyse_news_task'],
       context=[self.find_news_task()],
      )

     @task
     def data_extraction_task(self) -> Task:
      return Task(
       config=self.tasks_config['data_extraction_task'],
       async_execution=True
      )

     @task
     def financial_analysis_task(self) -> Task:
      return Task(
       config=self.tasks_config['financial_analysis_task'],
       context=[self.stock_market_data_analysis_task(), self.analyse_news_task(), self.data_extraction_task()],
       output_file='report.md'
      )

     @crew
     def crew(self) -> Crew:
      """Creates the Aiassistant crew"""

      return Crew(
       agents=[
        self.stock_market_researcher(),
        self.news_researcher(),
        self.data_extraction_specialist(),
        self.financial_analyst(),
       ],
       tasks=self.tasks,
       manager_agent=self.manager(),
       process=Process.hierarchical,
       verbose=True,

      )

### Summary of Execution Flow

![](https://cdn-images-1.medium.com/max/1024/1*_0JK9fVv2xRW7xqSC1HFuw.png)

_Summary of Execution Flow_

  1. **Manager Agent** oversees execution.
  2. **Data Extraction Specialist** retrieves SEC filings.
  3. **Stock Market Researcher** fetches stock data and analyzes it.
  4. **News Researcher** extracts financial news and summarizes key insights.
  5. **Financial Analyst** processes insights and generates final report.

A main.py file is automatically generated during the project creation process. This file is used to test the crew locally. Before running it, update the input parameters according to the specific use case.

In this example, the crew is instructed to analyze Nvidia by passing a **query** and a **ticker** symbol. The kickoff method starts the execution.

    #!/usr/bin/env python
    from aiassistant.crew import FinancialAIAssistant

    def run():
        """
        Run the crew.
        """
        inputs = {
            "query": "how is Nvidia doing right now?",
            "ticker": "NVDA"}
        FinancialAIAssistant().crew().kickoff(inputs=inputs)

Execute the file using the following command:

    crewai run

If verbose=True is set, logs can be monitored during crew execution. The logs provide real-time updates on task initiation, execution flow, and completion. Example of execution logs:

    # Agent: Stock Market Researcher
    ## Thought: I need to gather real-time stock market data for NVDA.
    I will use the Stock Market Data Extractor tool to retrieve this data.
    ## Using tool: Stock Market Data Extractor
    ## Tool Input:
    "{\"ticker\": \"NVDA\"}"
    ## Tool Output:
    {'Meta Data': {'1. Information': 'Intraday (5min) open, high, low, close prices and volume',
    '2. Symbol': 'NVDA', '3. Last Refreshed': '2025-01-29 19:55:00',
    '4. Interval': '5min', '5. Output Size': 'Compact',
    '6. Time Zone': 'US/Eastern'},
    'Time Series (5min)': {'2025-01-29 19:55:00': {'1. open': '123.1000', '2. high': '123.3200', '3. low': '123.0700', '4. close': '123.2667', '5. volume': '266330'},
    ....

After execution is completed, a **Markdown file** is generated containing the final report compiled by the agents:

    ### Detailed Report on NVDA Stock Data - January 29, 2025

    #### Meta Data:
    - **Information**: Intraday (5min) open, high, low, close prices, and volume
    - **Symbol**: NVDA
    - **Last Refreshed**: 2025-01-29 19:55:00
    - **Interval**: 5min
    - **Output Size**: Compact
    - **Time Zone**: US/Eastern

    ---

    #### Time Series Overview:
    The following table summarizes the key OHLCV data for NVDA throughout the trading day:

    | Time                 | Open     | High     | Low      | Close    | Volume   |
    |----------------------|----------|----------|----------|----------|----------|
    | 2025-01-29 19:55:00  | 123.1000 | 123.3200 | 123.0700 | 123.2667 | 266330   |
    | 2025-01-29 19:50:00  | 122.9000 | 123.1400 | 122.8800 | 123.0900 | 253776   |
    | 2025-01-29 19:45:00  | 122.7695 | 122.9300 | 122.7100 | 122.8991 | 131525   |
    | 2025-01-29 19:40:00  | 122.8700 | 122.9700 | 122.7200 | 122.7700 | 132281   |
    | ...                   | ...      | ...      | ...      | ...      | ...      |

    (The full time series can be further elaborated based on the specific details provided.)

    ---

    #### Analysis:

    1. **Price Movement**:
       - The trading day began with NVDA opening at $123.8000, experiencing significant volatility, reaching a high of $134.0171, before closing at $123.2667. This movement indicates substantial market reactions throughout the trading day.

    2. **Trading Volume Insights**:
       - Notably high trading volume was observed at the end of the trading session, culminating in a volume of 69,616,418 during the last interval at 16:00. This spike in volume suggests a heightened investor interest, possibly linked to announcements or market news.

    3. **Average Closing Price Over Last Hour**:
       - The average closing price for the last hour of trading (from 18:00 to 19:55) is calculated to be approximately **$122.6417**. This indicates a slight correction in the stock price after the volatile movements earlier.

    4. **Market Behavior Insights**:
       - The high fluctuations noticed throughout the day illustrate typical trading behavior based on market speculation, news reactions, or profit-taking measures by investors.
       - The final hour's relatively stable price yet high volume reflects traders adjusting their positions in light of the day's developments.

    ---

    #### Actionable Insights:
    - Given the significant volatility observed in NVDA's trading patterns on January 29, 2025, it is advisable for investors to approach trading with caution. Watching for potential news updates and understanding the market sentiment will be crucial in making future trading decisions.
    - Strategies may include setting tighter stop-loss orders or diversifying positions to mitigate risks associated with such volatile trading environments.

    ---

    #### Recent News and Insights on Market Conditions Affecting NVDA

    1. **Meta's AI Investments, Llama Expansion, Ad Tech Growth Earn Analyst Conviction**
       - **Source:** Benzinga
       - **Published:** January 30, 2025
       - **Summary:** Meta's stock rises after Q4 earnings beat expectations, with analysts highlighting AI investments and ad tech as growth drivers.
       - **Overall Sentiment:** Somewhat-Bullish

    2. **DeepSeek AI Is Creating a Massive Overreaction for Nvidia and Other AI Stocks**
       - **Source:** Motley Fool
       - **Published:** January 30, 2025
       - **Summary:** The launch of DeepSeek AI is creating volatility in AI stock markets, influencing investors' perceptions and trading behaviors.
       - **Overall Sentiment:** Neutral

    3. **Nvidia Stock Gets Hit as DeepSeek AI Drama Reportedly Pushing More Export Regulations**
       - **Source:** Motley Fool
       - **Published:** January 30, 2025
       - **Summary:** NVIDIA faces headwinds with increasing regulatory scrutiny potentially impacting AI stock prices.
       - **Overall Sentiment:** Somewhat-Bearish

    4. **AMD Gears Up to Report Q4 Earnings: Buy, Sell or Hold the Stock?**
       - **Source:** Zacks Commentary
       - **Published:** January 30, 2025
       - **Summary:** AMD's anticipated Q4 performance raises questions about competitive pressures for Nvidia amid a challenging tech sector.
       - **Overall Sentiment:** Somewhat-Bullish

    ---

    **Conclusion:**
    This comprehensive report reflects NVDA's trading activity, market conditions, and relevant news articles as of January 29, 2025. Investors are advised to stay informed on upcoming regulations, market sentiments, and potential competition to navigate the volatile landscape surrounding NVDA stock effectively.

### A user-friendly interface for querying and viewing reports

A simple and fast UI can be built using **Streamlit** to provide an interactive way for users to run financial analysis. To achieve this, an app.py file should be added to src/aiassistant/. This file defines a form where users can input their **query** and **ticker**, then trigger the crew to start the analysis. Once execution is complete, the final report will be displayed within the UI in an expandable container.

    import os
    import traceback
    import streamlit as st
    from dotenv import load_dotenv
    from aiassistant.crew import FinancialAIAssistant

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")

    st.set_page_config(
        page_title="Financial AI Assistant",
        page_icon="💹",
        layout="wide"
    )

    st.title("Financial AI Assistant 💹")
    st.write("""
    Get AI-powered insights about stocks by entering a ticker symbol and your question.
    Our AI will analyze market data, news, and SEC filings to provide comprehensive answers.
    """)

    with st.form("stock_analysis_form"):
        col1, col2 = st.columns([1, 2])

        with col1:
            ticker = st.text_input(
                "Ticker Symbol",
                help="Enter the stock ticker symbol (e.g., AAPL)",
                placeholder="AAPL"
            )

        with col2:
            query = st.text_input(
                "Your Question",
                help="Ask any question about the company or stock",
                placeholder="What are the key risks and opportunities for this company?"
            )

        submit_button = st.form_submit_button("Analyze")

    if submit_button:
        if not ticker or not query:
            st.error("Please enter both a ticker symbol and a question.")
        else:
            try:
                with st.spinner("Analyzing... This may take a few moments."):
                    assistant = FinancialAIAssistant()
                    result = assistant.crew().kickoff(inputs={"query": query, "ticker": ticker.upper()})

                    st.success("Analysis completed!")

                    # Display results in an expandable container
                    with st.expander("Analysis Results", expanded=True):
                       st.write(result)

            except Exception as e:
                st.error("An error occurred during analysis.")

    st.sidebar.markdown("""
    ### About
    This AI-powered tool helps you analyze stocks by:
    - Processing real-time market data
    - Analyzing recent news
    - Reviewing SEC filings
    - Providing comprehensive insights

    Enter a ticker symbol and your question to get started!
    """)

Execute the following command in the terminal:

    streamlit run src/aiassistant/app.py

This will launch a **web-based UI** where users can interact with the Financial AI assistant.

The user will be asked to enter a **query** and a **ticker**, then click the **"Analyze"** button to start the analysis.

![](https://cdn-images-1.medium.com/max/1024/1*XSL-8Vp7743a-qdnMzFd1A.png)

_UI for Financial AI Assistant power by Streamlit_

Once the crew execution is complete, the user will see the message **"Analysis completed!"** along with the expandable container **"Analysis Results"**.

![](https://cdn-images-1.medium.com/max/1024/1*jX_H2VVjlVJ4knCiwxbENA.png)

By clicking on **"Analysis Results"**, the final report will be displayed in the UI.

![](https://cdn-images-1.medium.com/max/1024/1*WCael9i4YsIlqRMI74ilbQ.png)

_Final report from Financial AI Assistant based on user's query_

## Testing and Ensuring Accuracy

Like any software system, an AI assistant should undergo rigorous testing to ensure it meets minimum performance standards. Each agent can be evaluated individually, as well as in coordination with the entire crew.

To assess an agent's performance, it is essential to identify its failure modes and measure their frequency. A key aspect of evaluation is verifying that agents use only the tools available in their inventory and do not generate arbitrary ones. Additionally, it should also provide the right input for each tool.

For example, consider the log entry from above:

    # Agent: Stock Market Researcher
    ## Using tool: Stock Market Data Extractor
    ## Tool Input:
    "{\"ticker\": \"NVDA\"}"

This aligns precisely with the agent and task definitions, confirming that the correct tool is being used with the expected input.

To systematically measure accuracy, a dataset can be created where each entry consists of a tuple: (task, tool(input)). By generating multiple tool calls for a given task, various performance metrics can be computed, such as:

  * Percentage of generated calls that are valid
  * Frequency of invalid tool usage
  * Frequency of valid tool usage with incorrect parameter values

These insights can help pinpoint areas for improvement, such as tweaking the agent's prompts or replacing tools that might be too complex.

Efficiency is just as important as accuracy. By reviewing logs, it's possible to see how many steps an agent takes to complete a task. The more steps required, the longer it takes and the higher the cost of API calls. Useful efficiency metrics include:

  * The average number of steps needed to finish a task
  * The average cost of completing a task

This can be comared to a baseline, which can be another agent or a human operator.

While these evaluations offer a structured way to improve both accuracy and efficiency, ultimately enhancing the AI assistant's overall performance, there are many other aspects to consider when testing AI agents. For example, evaluating final outputs and detecting issues such as hallucinations or harmful speech are also essential. The two approaches outlined here serve as a starting point, but a more comprehensive evaluation should include additional testing methods to ensure reliability, safety, and usability.

## Conclusion

This article provides a step-by-step guide to implementing and evaluating a Financial AI Assistant using CrewAI and Streamlit. The assistant generates summary reports based on user queries by leveraging tools that provide real-time access to information about publicly listed companies. This system serves as a prototype for a more advanced assistant application, demonstrating the capabilities of modern generative models, effective prompt engineering, function calling, and practical integration of information extraction from multiple sources to deliver evidence-based answers.

## Pros:

  * **Efficient Task Automation & Specialization: **Multi-agent system improves workflow efficiency by dividing tasks.
  * **Modular & Scalable: **Easily integrates APIs, tools, and additional agents.
  * **Parallel Processing**: Agents can work asynchronously, reducing execution time.
  * **Quick Prototyping:** Streamlit enables fast UI development without front-end expertise.

## Cons:

  * **Increased Complexity:** Debugging and maintaining multi-agent systems is challenging.
  * **Higher Latency & Costs: **Multiple API calls add delays and expenses, not ideal for real-time, high-frequency stock analysis.
  * **Error Propagation Risk**: Mistakes in one agent affect the entire system.

## Lessons Learned

  1. **Prompt Engineering Matters:** Well-structured prompts improve agent accuracy and efficiency.
  2. **Right Tools Boost Performance:** Equipping agents with suitable tools enhances workflow execution.
  3. **Optimizing Steps Reduces Costs:** Minimizing redundant processes and API calls lowers expenses.
  4. **Structured Logging Improves Debugging:** Detailed logs make troubleshooting faster and more effective.
  5. **Fine-Tuning Improves Output:** Training models on domain-specific data might enhance accuracy over general-purpose models.
