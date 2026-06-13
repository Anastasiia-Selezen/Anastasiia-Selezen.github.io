---
title: "Financial Assistant for Querying 10-K Reports Powered by a Retrieval-Augmented Generation (RAG) System"
date: 2024-12-01 23:00
summary: "Querying 10-K financial documents with a retrieval-augmented generation system."
category: "RAG"
tags: ["rag", "financial-ai", "10-k", "document-ai"]
type: "project"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/financial-assistant-for-querying-10-k-reports-powered-by-a-retrieval-augmented-generation-rag-39b4e016caa6"
legacyUrl: "/financial-assistant-for-querying-10-k-reports-powered-by-a-retrieval-augmented-generation-rag-system.html"
---

![](https://cdn-images-1.medium.com/max/1000/0*a0Rv3aaiDdccT8UL)

## Abstract

This article explores the implementation of an advanced Retrieval-Augmented Generation (RAG) system to extract and analyze data from multiple digital PDFs simultaneously. Unlike simple prompt engineering with one document at a time, RAG enables quering and retrieving aggregated insights from a structured knowledge base built from multiple documents. Using 10-K reports as an example, this article demonstrates how RAG can answer complex, longitudinal queries.

## Goals and Requirements

The goal of this project is to demonstrate how advanced Retrieval-Augmented Generation (RAG) systems can process and retrieve information from documents to enrich Large Language Model (LLM) inputs with up-to-date data, thereby enhancing the accuracy, relevance, and overall quality of the generated responses.

This is particularly useful for tasks such as analyzing financial performance over time using 10-K reports. For instance, instead of querying a single document users can extract and compare data across multiple years, providing a comprehensive view of a company's historical performance.

The requirements for achieving this goal include:

  1. **Create a Knowledge Base**
     - Extract text from PDF files.
     - Divide each PDF into semantic chunks of text.
     - Initialize the Vector Store.
     - Index the chunks into a vector store for efficient retrieval.
  2. **Implement a Retrieval and Generation Pipeline**
     - Create Prompt Template.
     - Build a sequential pipeline to augment the prompt with retrieved data and interact with the LLM to generate responses.
     - Ask a Question: Process user's input.

## The Technologies

To implement this solution, the following technologies and tools are used:

  * **LangChain**: A framework for building applications powered by Large Language Models (LLMs) with capabilities like chaining, memory, and integrations for advanced workflows.
  * **LangGraph:** A library for building stateful, multi-actor applications with LLMs, used to create agent and multi-agent workflows.
  * **Weaviate**: A high-performance vector database used for indexing and retrieving semantic chunks of text.
  * **OpenAI**: The LLM provider for generating responses based on enriched prompts.

## Why use RAG?

**Overcoming Knowledge Cut-Off**: Most pre-trained language models have a fixed knowledge cut-off date and cannot access real-time or updated information. RAG bridges this gap by retrieving up-to-date data from external sources, ensuring responses remain current and relevant.

**Knowledge Integration**: It enables the seamless integration of domain-specific knowledge without the need to retrain the language model, saving time and computational resources.

**Evidence-Based Responses**: By retrieving specific chunks of information from indexed sources, RAG provides a clear trail of evidence supporting its answers, enhancing trust and transparency.

## Why Use Vectore Store?

Vector stores are specialized databases designed for indexing and retrieving information based on vector representations. LangChain offers integrations with [over 50 vector stores](<https://python.langchain.com/docs/integrations/vectorstores/>), so selecting the right one depends on your use case and project requirements.

  * For quick proofs of concept (PoC) with small datasets, lightweight solutions like Chroma or in-memory vector stores may suffice.
  * For production-grade applications, robust and scalable options such as Pinecone, Milvus, or Weaviate should be considered.

## Why Choose Weaviate?

[Weaviate](<https://weaviate.io/>) is an open-source vector database that offers a range of features suited for complex use cases like financial document analysis:

  * **Hybrid Search**: Combines vector similarity and keyword-based queries for more nuanced searches.
  * **Metadata Support**: Handles complex metadata effectively, enabling advanced filtering and querying.
  * **Multi-Tenancy**: Supports multiple isolated environments within the same deployment.
  * **Search with Scoring**: Returns results with relevance scores for better insights.
  * **Hosting Flexibility**: Can be deployed on-premises for complete data control or in the cloud for convenience.
  * **Scalability**: Designed to handle growing data needs in production environments.

**Drawbacks to Consider**

  * **Resource Intensive**: Optimal performance may require significant computational resources.
  * **Learning Curve:** Advanced features might take time to master.

Given these pros and cons, Weaviate is a strong candidate for use cases involving financial document analysis, offering a scalable and feature-rich platform for managing complex data.

## The Solution

### Prerequisites
Before starting, ensure the necessary Python libraries are installed:

    # Install LangChain for building the application
    pip install langchain

    # Install Weaviate and LangChain integration for vector storage
    pip install weaviate
    pip install langchain-weaviate

    # Install experimental features for semantic text chunking
    pip install langchain_experimental

Additionally, ensure you have a Weaviate instance up and running. Detailed instructions for setting up Weaviate can be found [here](<https://weaviate.io/developers/weaviate/quickstart>).

Before proceeding, ensure that the documents are in a machine-readable format. For scanned files, additional processing, such as Optical Character Recognition (OCR) or vision LLM, may be required.

### Importing libraries

    import os
    import weaviate
    from langchain.chains import RetrievalQA
    from langchain.chat_models import ChatOpenAI
    from langchain_core.documents import Document
    from typing_extensions import List, TypedDict
    from langchain.document_loaders import PyPDFLoader
    from langgraph.graph import START, StateGraph, END
    from langgraph.checkpoint.memory import MemorySaver
    from langchain_core.prompts import ChatPromptTemplate
    from langchain.embeddings.openai import OpenAIEmbeddings
    from langchain_weaviate.vectorstores import WeaviateVectorStore
    from langchain_experimental.text_splitter import SemanticChunker

## 1. Data processing: Create a Knowledge Base

![](https://cdn-images-1.medium.com/max/1024/1*zQ7SYLHYhirMCT4W8pX_Mw.png)

### a. Loading and Reading the PDF

If documents are stored locally, it is possible to load them directly. Alternatively, connect to a storage to fetch data for further processing.

    pdf_folder_path = "documents/10k"
    documents = []
    for file in os.listdir(pdf_folder_path):
        if file.endswith('.pdf'):
            pdf_path = os.path.join(pdf_folder_path, file)
            loader = PyPDFLoader(pdf_path)
            documents.extend(loader.load())

### b. Splitting the PDF into Semantic Chunks of Text

Breaking the data into smaller semantic chunks is crucial for efficient processing and retrieval. This step helps extract detailed features and embeds them to represent their semantics.

A basic method involves defining fixed chunk sizes and overlapping adjacent chunks. While simple, this approach may lead to incomplete retrieval contexts or oversized chunks containing irrelevant information.

    embed_model = OpenAIEmbeddings()
    semantic_chunker = SemanticChunker(embed_model, breakpoint_threshold_type="percentile")
    docs = semantic_chunker.create_documents([d.page_content for d in documents])

An advanced method relies on embedding models to calculate semantic similarity between sentences, determining chunk boundaries based on a defined threshold, such as a percentile in this case.

### c. Initializing the Vector Store

Next step is to initialize a vector store client. Depending on the deployment, an on-premises setup or cloud-hosted instance can be used.

**On-Premises Connection**:

    weaviate_client = weaviate.connect_to_local()

**Cloud Connection**:

    from weaviate.classes.init import Auth

    # Best practice: store your credentials in environment variables
    wcd_url = os.environ["WCD_URL"]
    wcd_api_key = os.environ["WCD_API_KEY"]

    weaviate_client = weaviate.connect_to_weaviate_cloud(
        cluster_url=wcd_url,                         # Replace with your Weaviate Cloud URL
        auth_credentials=Auth.api_key(wcd_api_key),  # Replace with your Weaviate Cloud key
    )

**Closing the Connection**

Closing the database connection after completing tasks is essential to free up resources:

    weaviate_client.close()

### d. Index Chunks into Vector Store

After establishing a connection to the Weaviate instance with the weaviate_client object, the processed semantic chunks are indexed into the vector store. This is achieved using the WeaviateVectorStore.from_documents functionality provided by LangChain.

    db = WeaviateVectorStore.from_documents(docs, embed_model, client=weaviate_client)

With the knowledge base now established, the next step involves implementing the retrieval and generation processes.

## 2. Retrieval and Generation Pipeline

The system will process users inputs by first querying the knowledge base to retrieve the most relevant chunks of previously indexed text. These chunks will then be combined with the user's input to form a prompt, which is sent to the LLM. The LLM generates a response based on this enriched context, and the final answer is delivered to the user.

![](https://cdn-images-1.medium.com/max/1024/1*66AN6vr-SYUQ4YbLLc-DSg.png)

Let's break this process down step by step.

### a. **Creating Prompt Template and Initializing LLM**

For the baseline implementation, the gpt-4o-mini model is used. A temperature of 0 ensures deterministic outputs, important for consistency in financial applications.

The prompt is inspired by the RAG-style prompt template from LangChain [Prompt Hub](<https://smith.langchain.com/hub/rlm/rag-prompt>), adjusted for financial analysis tasks.

    llm_name = "gpt-4o-mini"
    llm=ChatOpenAI(model_name=llm_name, temperature=0)

    prompt = ChatPromptTemplate([
        ("system", """You are a CFA certified financial analyst. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know.
                        Question: {question}
                        Context: {context}
                        Answer:""")
    ])

### b. Setting Up Retrieval and Generation Pipeline

LangGraph is used to integrate retrieval and generation steps into a single pipeline. This process requires defining three key components: state, nodes, control flow.

**State**

The state manages the data input, transfer between steps, and output of the application. Typically, this is implemented as a TypedDict or a Pydantic BaseModel. In this setup, the state tracks:

  * Input question
  * Retrieved context
  * Generated answer

    class State(TypedDict):
        question: str
        context: List[Document]
        answer: str

**Nodes**

The pipeline consists of two primary steps: retrieval and generation.

  * **Retrieval Step**:
Leverages Weaviate's **Maximal Marginal Relevance (MMR)**, a method designed to balance relevance and diversity in search results. MMR reduces redundancy by penalizing items too similar to those already selected. Additional parameters, like k, specify the number of documents to retrieve.

    def retrieve(state: State):
        retrieved_docs = db.max_marginal_relevance_search(state["question"], k=10)
        return {"context": retrieved_docs}

  * **Generation Step**:
Combines the input question and retrieved context into a prompt template, then invokes the LLM to generate a response.

    def generate(state: State):
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        messages = prompt.invoke({"question": state["question"], "context": docs_content})
        response = llm.invoke(messages)
        return {"answer": response.content}

**Control flow**

The control flow defines the order of steps, connecting retrieval and generation into a single graph object.

    graph_builder = StateGraph(State)
    graph_builder.add_node(retrieve)
    graph_builder.add_node(generate)
    graph_builder.add_edge(START, "retrieve")
    graph_builder.add_edge("retrieve", "generate")
    graph_builder.add_edge("generate", END)

**Additional: Adding Persistence and Visualizing the Graph**

LangGraph includes a built-in persistence layer, which is useful for applications requiring multiple conversational turns. This feature saves a history of messages associated with a specific thread, enabling users to refer back to previous questions. For production applications, LangGraph recommends using a Postgres database as the checkpointer for robust and scalable persistence. More details on persistence options can be found in the [LangGraph documentation](<https://langchain-ai.github.io/langgraph/concepts/persistence/>).

For experimentation purposes, an in-memory checkpointer is used in this setup:

    # Add memory
    memory = MemorySaver()
    graph = graph_builder.compile(checkpointer=memory)

Also, LangGraph provides nice built-in tools for visualizing the control flow. This feature helps in debugging, optimization, and understanding the sequence of steps in the pipeline.

    from IPython.display import Image
    Image(graph.get_graph().draw_mermaid_png())

![](https://cdn-images-1.medium.com/max/110/1*ZpnMr7z7nnWoAhmi77vrjg.png)

It shows that the graph consists of two steps executed sequentially: retrieval and generation.

### c. Asking a Question

In a real-life system, user's input is recieved and processed before being sent to the pipeline to ensure it does not contain any harmful or malicious instructions. For this demonstration, a question is manually set up. The question follows the information extraction pattern discussed in [earlier posts](</work/extracting-information-10k-prompt-engineering/>) but has been adjusted to extract total net sales over six fiscal years.

    question = """Extract the following information:

                - **Company Name**:
                Extract the name of the company that filed the report.

                - **Total net sales**:
                Extract the total net sales for every fiscal year starting from 2017 up to 2022 in millions, extract the exact number.
        """

To use the persistence layer added earlier, a thread ID must be passed along with the message:

    config = {"configurable": {"thread_id": "1"}}
    response = graph.invoke({"question": question}, config)
    print("Answer:")
    print(response["answer"])
    print("==============================================================================")
    print("Context:")
    print(response["context"])

**Output**

The response contains both the extracted information and the source documents for transparency.

    Answer:
    - **Company Name**: Apple Inc.
    - **Total net sales**:
      - 2022: $394,328 million
      - 2021: $365,817 million
      - 2020: $274,515 million
      - 2019: $260,174 million
      - 2018: $265,595 million
      - 2017: $229,234 million
    ==============================================================================
    Context:
    [Document(metadata={}, page_content='Note 11 - Segment Information and Geographic Data\nThe following table shows information by reportable segment for 2022, 2021 and 2020 (in millions):\n2022 2021 2020\nAmericas:\nNet sales $ 169,658 $ 153,306 $ 124,556 \nOperating income $ 62,683 $ 53,382 $ 37,722 \nEurope:\nNet sales $ 95,118 $ 89,307 $ 68,640 \nOperating income $ 35,233 $ 32,505 $ 22,170 \nGreater China:\nNet sales $ 74,200 $ 68,366 $ 40,308 \nOperating income $ 31,153 $ 28,504 $ 15,261 \nJapan:\nNet sales $ 25,977 $ 28,482 $ 21,418 \nOperating income $ 12,257 $ 12,798 $ 9,279 \nRest of Asia Pacific:\nNet sales $ 29,375 $ 26,356 $ 19,593 \nOperating income $ 11,569 $ 9,817 $ 6,808 \nA reconciliation of the Company's segment operating income to the Consolidated Statements of Operations for 2022, 2021 and 2020 is\nas follows (in millions):\n2022 2021 2020\nSegment operating income $ 152,895 $ 137,006 $ 91,240 \nResearch and development expense (26,251) (21,914) (18,752)\nOther corporate expenses, net (7,207) (6,143) (6,200)\nTotal operating income $ 119,437 $ 108,949 $ 66,288 \nThe U.S. and China were the only countries that accounted for more than 10% of the Company's net sales in 2022, 2021 and 2020.'),
      Document(metadata={}, page_content='Business Seasonality and Product Introductions\nThe Company has historically experienced higher net sales in its first quarter compared to other quarters in its fiscal year due in part to\nseasonal holiday demand. Additionally, new product and service introductions can significantly impact net sales, cost of sales and\noperating expenses. The timing of product introductions can also impact the Company's net sales to its indirect distribution channels as\nthese channels are filled with new inventory following a product launch, and channel inventory of an older product often declines as the\nlaunch of a newer product approaches. Net sales can also be affected when consumers and distributors anticipate a product\nintroduction. Employees\nAs of September 26, 2020, the Company had approximately 147,000 full-time equivalent employees. Available Information\nThe Company's Annual Reports on Form 10-K, Quarterly Reports on Form 10-Q, Current Reports on Form 8-K, and amendments to\nreports filed pursuant to Sections 13(a) and 15(d) of the Securities Exchange Act of 1934, as amended (the "Exchange Act"), are filed\nwith the Securities and Exchange Commission (the "SEC"). Such reports and other information filed by the Company with the SEC are\navailable free of charge at investor.apple.com/investor-relations/sec-filings/default.aspx when such reports are available on the SEC's\nwebsite. The Company periodically provides other information for investors on its corporate website, www.apple.com, and its investor\nrelations website, investor.apple.com. This includes press releases and other information about financial performance, information on\ncorporate governance and details related to the Company's annual meeting of shareholders. The information contained on the websites\nreferenced in this Form 10-K is not incorporated by reference into this filing. Further, the Company's references to website URLs are\nintended to be inactive textual references only. Apple Inc.'),
      Document(metadata={}, page_content='Item 8. Financial Statements and Supplementary Data\nIndex to Consolidated Financial Statements Page\nConsolidated Statements of Operations for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 29\nConsolidated Statements of Comprehensive Income for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 30\nConsolidated Balance Sheets as of September 28, 2019 and September 29, 2018 31\nConsolidated Statements of Shareholders' Equity for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 32\nConsolidated Statements of Cash Flows for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 33\nNotes to Consolidated Financial Statements 34\nSelected Quarterly Financial Information (Unaudited) 55\nReports of Independent Registered Public Accounting Firm 56\nAll financial statement schedules have been omitted, since the required information is not applicable or is not present in amounts\nsufficient to require submission of the schedule, or because the information required is included in the consolidated financial statements\nand accompanying notes. Apple Inc.'),
      Document(metadata={}, page_content='Note 12 - Selected Quarterly Financial Information (Unaudited)\nThe following tables show a summary of the Company's quarterly financial information for each of the four quarters of 2019 and 2018 (in\nmillions, except per share amounts):\n Fourth Quarter  Third Quarter Second Quarter  First Quarter\n2019:     \nTotal net sales $ 64,040 $ 53,809 $ 58,015 $ 84,310\nGross margin $ 24,313 $ 20,227 $ 21,821 $ 32,031\nNet income $ 13,686 $ 10,044 $ 11,561 $ 19,965\n     \nEarnings per share (1):     \nBasic $ 3.05 $ 2.20 $ 2.47 $ 4.22\nDiluted $ 3.03 $ 2.18 $ 2.46 $ 4.18\n Fourth Quarter  Third Quarter Second Quarter  First Quarter\n2018:     \nTotal net sales $ 62,900 $ 53,265 $ 61,137 $ 88,293\nGross margin $ 24,084 $ 20,421 $ 23,422 $ 33,912\nNet income $ 14,125 $ 11,519 $ 13,822 $ 20,065\n     \nEarnings per share (1):     \nBasic $ 2.94 $ 2.36 $ 2.75 $ 3.92\nDiluted $ 2.91 $ 2.34 $ 2.73 $ 3.89\n \n(1) Basic and diluted earnings per share are computed independently for each of the quarters presented. Therefore, the sum of quarterly basic and\ndiluted per share information may not equal annual basic and diluted earnings per share. Apple Inc.'),
      Document(metadata={}, page_content='Certain prior period amounts in\nthe consolidated financial statements and accompanying notes have been reclassified to conform to the current period's presentation. The Company's fiscal year is the 52- or 53-week period that ends on the last Saturday of September. An additional week is included in\nthe first fiscal quarter every five or six years to realign the Company's fiscal quarters with calendar quarters, which will occur in the first\nquarter of the Company's fiscal year ending September 30, 2023. The Company's fiscal years 2022, 2021 and 2020 spanned 52 weeks\neach. Unless otherwise stated, references to particular years, quarters, months and periods refer to the Company's fiscal years ended in\nSeptember and the associated quarters, months and periods of those fiscal years. Revenue Recognition\nNet sales consist of revenue from the sale of iPhone, Mac, iPad, Services and other products. The Company recognizes revenue at the\namount to which it expects to be entitled when control of the products or services is transferred to its customers. Control is generally\ntransferred when the Company has a present right to payment and title and the significant risks and rewards of ownership of products or\nservices are transferred to its customers. For most of the Company's Products net sales, control transfers when products are shipped. For the Company's Services net sales, control transfers over time as services are delivered. Payment for Products and Services net\nsales is collected within a short period following transfer of control or commencement of delivery of services, as applicable. The Company records reductions to Products net sales related to future product returns, price protection and other customer incentive\nprograms based on the Company's expectations and historical experience. For arrangements with multiple performance obligations, which represent promises within an arrangement that are distinct, the Company\nallocates revenue to all distinct performance obligations based on their relative stand-alone selling prices ("SSPs"). When available, the\nCompany uses observable prices to determine SSPs. When observable prices are not available, SSPs are established that reflect the\nCompany's best estimates of what the selling prices of the performance obligations would be if they were sold regularly on a stand-alone\nbasis. The Company's process for estimating SSPs without observable prices considers multiple factors that may vary depending upon\nthe unique facts and circumstances related to each performance obligation including, where applicable, prices charged by the Company\nfor similar offerings, market trends in the pricing for similar offerings, product-specific business objectives and the estimated cost to\nprovide the performance obligation. The Company has identified up to three performance obligations regularly included in arrangements involving the sale of iPhone, Mac,\niPad and certain other products. The first performance obligation, which represents the substantial portion of the allocated sales price, is\nthe hardware and bundled software delivered at the time of sale. The second performance obligation is the right to receive certain\nproduct-related bundled services, which include iCloud, Siri and Maps. The third performance obligation is the right to receive, on a\nwhen-and-if-available basis, future unspecified software upgrades relating to the software bundled with each device. The Company\nallocates revenue and any related discounts to these performance obligations based on their relative SSPs. Because the Company\nlacks observable prices for the undelivered performance obligations, the allocation of revenue is based on the Company's estimated\nSSPs. Revenue allocated to the delivered hardware and bundled software is recognized when control has transferred to the customer,\nwhich generally occurs when the product is shipped. Revenue allocated to the product-related bundled services and unspecified\nsoftware upgrade rights is deferred and recognized on a straight-line basis over the estimated period they are expected to be provided. Cost of sales related to delivered hardware and bundled software, including estimated warranty costs, are recognized at the time of sale. Costs incurred to provide product-related bundled services and unspecified software upgrade rights are recognized as cost of sales as\nincurred. For certain long-term service arrangements, the Company has performance obligations for services it has not yet delivered. For these\narrangements, the Company does not have a right to bill for the undelivered services. The Company has determined that any unbilled\nconsideration relates entirely to the value of the undelivered services. Accordingly, the Company has not recognized revenue, and does\nnot disclose amounts, related to these undelivered services. ® ®\nApple Inc.'),
      Document(metadata={}, page_content='On April 5, 2018, several U.S. federal actions were consolidated through a\nMultidistrict Litigation process into a single action in the U.S. District Court for the Northern District of California. In addition to civil\nlitigation, the Company is also responding to governmental investigations and requests for information relating to the performance\nmanagement feature. The Company believes that its iPhones were not defective, that the performance management feature introduced\nwith iOS updates 10.2.1 and 11.2 was intended to, and did, improve customers' user experience, and that the Company did not make\nany misleading statements or fail to disclose any material information. The Company has accrued its best estimate for the ultimate\nresolution of these matters. French Competition Authority\nIn June 2019, the French Competition Authority ("FCA") issued a report alleging that aspects of the Company's sales and distribution\npractices in France violate French competition law. The Company vigorously disagrees with the allegations, and a hearing of arguments\nwas held before the FCA on October 15, 2019. The Company is awaiting the decision of the FCA, which may include a fine. Note 11 - Segment Information and Geographic Data\nThe Company reports segment information based on the "management" approach. The management approach designates the internal\nreporting used by management for making decisions and assessing performance as the source of the Company's reportable segments. The Company manages its business primarily on a geographic basis. The Company's reportable segments consist of the Americas,\nEurope, Greater China, Japan and Rest of Asia Pacific. Americas includes both North and South America. Europe includes European\ncountries, as well as India, the Middle East and Africa. Greater China includes China, Hong Kong and Taiwan. Rest of Asia Pacific\nincludes Australia and those Asian countries not included in the Company's other reportable segments. Although the reportable\nsegments provide similar hardware and software products and similar services, each one is managed separately to better align with the\nlocation of the Company's customers and distribution partners and the unique market dynamics of each geographic region. The\naccounting policies of the various segments are the same as those described in Note 1, "Summary of Significant Accounting Policies."\nThe Company evaluates the performance of its reportable segments based on net sales and operating income. Net sales for geographic\nsegments are generally based on the location of customers and sales through the Company's retail stores located in those geographic\nlocations. Operating income for each segment includes net sales to third parties, related cost of sales and operating expenses directly\nattributable to the segment. Advertising expenses are generally included in the geographic segment in which the expenditures are\nincurred. Operating income for each segment excludes other income and expense and certain expenses managed outside the\nreportable segments. Costs excluded from segment operating income include various corporate expenses such as research and\ndevelopment, corporate marketing expenses, certain share-based compensation expenses, income taxes, various nonrecurring charges\nand other separately managed general and administrative costs. The Company does not include intercompany transfers between\nsegments for management reporting purposes.'),
      Document(metadata={}, page_content='Item 7. Management's Discussion and Analysis of Financial Condition and Results of Operations\nThe following discussion should be read in conjunction with the consolidated financial statements and accompanying notes included in\nPart II, Item 8 of this Form 10-K. This Item generally discusses 2023 and 2022 items and year-to-year comparisons between 2023 and\n2022. Discussions of 2021 items and year-to-year comparisons between 2022 and 2021 are not included, and can be found in\n"Management's Discussion and Analysis of Financial Condition and Results of Operations" in Part II, Item 7 of the Company's Annual\nReport on Form 10-K for the fiscal year ended September 24, 2022. Fiscal Period\nThe Company's fiscal year is the 52- or 53-week period that ends on the last Saturday of September. An additional week is included in\nthe first fiscal quarter every five or six years to realign the Company's fiscal quarters with calendar quarters, which occurred in the first\nquarter of 2023. The Company's fiscal year 2023 spanned 53 weeks, whereas fiscal years 2022 and 2021 spanned 52 weeks each. Fiscal Year Highlights\nThe Company's total net sales were $383.3 billion and net income was $97.0 billion during 2023. The Company's total net sales decreased 3% or $11.0 billion during 2023 compared to 2022. The weakness in foreign currencies\nrelative to the U.S. dollar accounted for more than the entire year-over-year decrease in total net sales, which consisted primarily of\nlower net sales of Mac and iPhone, partially offset by higher net sales of Services. The Company announces new product, service and software offerings at various times during the year. Significant announcements\nduring fiscal year 2023 included the following:\nFirst Quarter 2023:\n• iPad and iPad Pro;\n• Next-generation Apple TV 4K; and\n• MLS Season Pass, a Major League Soccer subscription streaming service. Second Quarter 2023:\n• MacBook Pro 14", MacBook Pro 16" and Mac mini; and\n• Second-generation HomePod. Third Quarter 2023:\n• MacBook Air 15", Mac Studio and Mac Pro;\n• Apple Vision Pro™, the Company's first spatial computer featuring its new visionOS™, expected to be available in early\ncalendar year 2024; and\n• iOS 17, macOS Sonoma, iPadOS 17, tvOS 17 and watchOS 10, updates to the Company's operating systems. Fourth Quarter 2023:\n• iPhone 15, iPhone 15 Plus, iPhone 15 Pro and iPhone 15 Pro Max; and\n• Apple Watch Series 9 and Apple Watch Ultra 2. In May 2023, the Company announced a new share repurchase program of up to $90 billion and raised its quarterly dividend from $0.23\nto $0.24 per share beginning in May 2023. During 2023, the Company repurchased $76.6 billion of its common stock and paid dividends\nand dividend equivalents of $15.0 billion. Macroeconomic Conditions\nMacroeconomic conditions, including inflation, changes in interest rates, and currency fluctuations, have directly and indirectly impacted,\nand could in the future materially impact, the Company's results of operations and financial condition. Apple Inc.'),
      Document(metadata={}, page_content='Selected Financial Data\nThe information set forth below for the five years ended September 26, 2020, is not necessarily indicative of results of future operations,\nand should be read in conjunction with Part II, Item 7, "Management's Discussion and Analysis of Financial Condition and Results of\nOperations" and the consolidated financial statements and accompanying notes included in Part II, Item 8 of this Form 10-K to fully\nunderstand factors that may affect the comparability of the information presented below (in millions, except number of shares, which are\nreflected in thousands, and per share amounts). 2020 2019 2018 2017 2016\nTotal net sales $ 274,515 $ 260,174 $ 265,595 $ 229,234 $ 215,639 \nNet income $ 57,411 $ 55,256 $ 59,531 $ 48,351 $ 45,687 \nEarnings per share:\nBasic $ 3.31 $ 2.99 $ 3.00 $ 2.32 $ 2.09 \nDiluted $ 3.28 $ 2.97 $ 2.98 $ 2.30 $ 2.08 \nCash dividends declared per share $ 0.795 $ 0.75 $ 0.68 $ 0.60 $ 0.545 \nShares used in computing earnings per share:\nBasic 17,352,119 18,471,336 19,821,510 20,868,968 21,883,281 \nDiluted 17,528,214 18,595,651 20,000,435 21,006,767 22,001,126 \nTotal cash, cash equivalents and marketable securities$ 191,830 $ 205,898 $ 237,100 $ 268,895 $ 237,585 \nTotal assets $ 323,888 $ 338,516 $ 365,725 $ 375,319 $ 321,686 \nNon-current portion of term debt $ 98,667 $ 91,807 $ 93,735 $ 97,207 $ 75,427 \nOther non-current liabilities $ 54,490 $ 50,503 $ 48,914 $ 44,212 $ 39,986 \nApple Inc. | 2020 Form 10-K | 19'),
      Document(metadata={}, page_content='Segment Operating Performance\nThe following table shows net sales by reportable segment for 2023, 2022 and 2021 (dollars in millions):\n2023 Change 2022 Change 2021\nNet sales by reportable segment:\nAmericas $ 162,560 (4)% $ 169,658 11 % $ 153,306 \nEurope 94,294 (1)% 95,118 7 % 89,307 \nGreater China 72,559 (2)% 74,200 9 % 68,366 \nJapan 24,257 (7)% 25,977 (9)% 28,482 \nRest of Asia Pacific 29,615 1 % 29,375 11 % 26,356 \nTotal net sales $ 383,285 (3)% $ 394,328 8 % $ 365,817 \nAmericas\nAmericas net sales decreased 4% or $7.1 billion during 2023 compared to 2022 due to lower net sales of iPhone and Mac, partially\noffset by higher net sales of Services. Europe\nEurope net sales decreased 1% or $824 million during 2023 compared to 2022. The weakness in foreign currencies relative to the U.S. dollar accounted for more than the entire year-over-year decrease in Europe net sales, which consisted primarily of lower net sales of\nMac and Wearables, Home and Accessories, partially offset by higher net sales of iPhone and Services. Greater China\nGreater China net sales decreased 2% or $1.6 billion during 2023 compared to 2022. The weakness in the renminbi relative to the U.S. dollar accounted for more than the entire year-over-year decrease in Greater China net sales, which consisted primarily of lower net\nsales of Mac and iPhone. Japan\nJapan net sales decreased 7% or $1.7 billion during 2023 compared to 2022. The weakness in the yen relative to the U.S. dollar\naccounted for more than the entire year-over-year decrease in Japan net sales, which consisted primarily of lower net sales of iPhone,\nWearables, Home and Accessories and Mac. Rest of Asia Pacific\nRest of Asia Pacific net sales increased 1% or $240 million during 2023 compared to 2022. The weakness in foreign currencies relative\nto the U.S. dollar had a significantly unfavorable year-over-year impact on Rest of Asia Pacific net sales. The net sales increase\nconsisted of higher net sales of iPhone and Services, partially offset by lower net sales of Mac and iPad.'),
      Document(metadata={}, page_content='The Company has asked the court to set aside the\nverdict, where the case remains pending. Note 11 - Segment Information and Geographic Data\nThe Company reports segment information based on the "management" approach. The management approach designates the internal\nreporting used by management for making decisions and assessing performance as the source of the Company's reportable segments. The Company manages its business primarily on a geographic basis. The Company's reportable segments consist of the Americas,\nEurope, Greater China, Japan and Rest of Asia Pacific. Americas includes both North and South America. Europe includes European\ncountries, as well as India, the Middle East and Africa. Greater China includes China mainland, Hong Kong and Taiwan. Rest of Asia\nPacific includes Australia and those Asian countries not included in the Company's other reportable segments. Although the reportable\nsegments provide similar hardware and software products and similar services, each one is managed separately to better align with the\nlocation of the Company's customers and distribution partners and the unique market dynamics of each geographic region. The\naccounting policies of the various segments are the same as those described in Note 1, "Summary of Significant Accounting Policies."\nThe Company evaluates the performance of its reportable segments based on net sales and operating income. Net sales for geographic\nsegments are generally based on the location of customers and sales through the Company's retail stores located in those geographic\nlocations. Operating income for each segment includes net sales to third parties, related cost of sales and operating expenses directly\nattributable to the segment. Advertising expenses are generally included in the geographic segment in which the expenditures are\nincurred. Operating income for each segment excludes other income and expense and certain expenses managed outside the\nreportable segments. Costs excluded from segment operating income include various corporate expenses such as research and\ndevelopment, corporate marketing expenses, certain share-based compensation expenses, income taxes, various nonrecurring charges\nand other separately managed general and administrative costs. The Company does not include intercompany transfers between\nsegments for management reporting purposes. The following table shows information by reportable segment for 2020, 2019 and 2018 (in millions):\n2020 2019 2018\nAmericas:\nNet sales $ 124,556 $ 116,914 $ 112,093 \nOperating income $ 37,722 $ 35,099 $ 34,864 \nEurope:\nNet sales $ 68,640 $ 60,288 $ 62,420 \nOperating income $ 22,170 $ 19,195 $ 19,955 \nGreater China:\nNet sales $ 40,308 $ 43,678 $ 51,942 \nOperating income $ 15,261 $ 16,232 $ 19,742 \nJapan:\nNet sales $ 21,418 $ 21,506 $ 21,733 \nOperating income $ 9,279 $ 9,369 $ 9,500 \nRest of Asia Pacific:\nNet sales $ 19,593 $ 17,788 $ 17,407 \nOperating income $ 6,808 $ 6,055 $ 6,181 \nApple Inc. | 2020 Form 10-K | 55')],

While it is straightforward to manually inspect individual examples and verify if the system performs well, objective assessment requires testing against a larger testing dataset. Automating the testing process ensures scalability and provides consistent evaluation metrics.

Next, let's explore how RAG systems can be tested to evaluate their performance.

## Testing and Ensuring Accuracy

As with any software system, AI models must undergo rigorous testing to ensure they meet minimum performance requirements. In this case, since the domain is financial, the accuracy of the output is critical. The evaluation process should cover both [**retrieval** and **generation**](<https://docs.confident-ai.com/docs/guides-rag-evaluation>) steps.

### Retrieval Evaluation

Evaluating the retrieval step involves assessing the accuracy and relevance of the documents retrieved by the system. Key considerations include:

  * Does the embedding model effectively capture domain-specific nuances?
  * Is the reranker model correctly ordering the retrieved nodes by relevance?
  * Is the right amount of information being retrieved for the task?

### Metrics

The **DeepEval** framework provides three LLM-based metrics to assess retrieval performance:

  1. **Contextual Recall**:
Measures whether the embedding model in the retriever accurately captures and retrieves relevant information based on the input's context.
  2. **Contextual Precision**:
Assesses the reranker's ability to prioritize relevant nodes over irrelevant ones within the retrieval context.
  3. **Contextual Relevancy**:
Evaluates whether the chunk size and top-**k** retrieval parameters minimize irrelevant information while providing sufficient context for the task.

### Generation Evaluation

This step assesses the appropriateness and quality of the system's generated response when provided with context. Key considerations include:

  * Can a smaller, faster, or more cost-effective LLM give comparable results?
  * Would adjusting the temperature improve response quality?
  * How does modifying the prompt template affect output quality?

### Metrics

The **DeepEval** framework provides two key metrics for assessing generative outputs:

  1. **Answer Relevancy**:
Evaluates whether the prompt template effectively instructs the LLM to output relevant and helpful responses based on the provided retrieval context.
  2. **Faithfulness**:
Assesses whether the LLM generates responses that doesn't contain hallucinations and contradictions, ensuring alignment with factual information from the retrieval context.

Let's look at implementation. The first step is to define the metrics:

    from deepeval.metrics import (
        ContextualPrecisionMetric,
        ContextualRecallMetric,
        ContextualRelevancyMetric,
        AnswerRelevancyMetric,
        FaithfulnessMetric
    )

    contextual_precision = ContextualPrecisionMetric()
    contextual_recall = ContextualRecallMetric()
    contextual_relevancy = ContextualRelevancyMetric()
    answer_relevancy = AnswerRelevancyMetric()
    faithfulness = FaithfulnessMetric()

Second step is defining Test Cases. For each example in the testing dataset, a test case must be created. Below is an example of a single test case:

    from deepeval.test_case import LLMTestCase

    test_case = LLMTestCase(
        input=question,
        actual_output=result["result"],
        expected_output="""
                           Company Name: Apple Inc.

                           Total net sales:
                           2017: $229,234 million
                           2018: $265,595 million
                           2019: $260,174 million
                           2020: $274,515 million
                           2021: $365,817 million
                           2022: $394,328 million""",
        retrieval_context=[doc.page_content for doc in result["source_documents"]]
    )

The last step is to run the evaluation. DeepEval provides a built-in evaluation function that allows testing multiple test cases against various metrics simultaneously. To learn more about using DeepEval's evaluation functions, refer to the [documentation](<https://docs.confident-ai.com/docs/evaluation-test-cases#evaluate-test-cases-in-bulk>).

    from deepeval import evaluate

    evaluate(
        test_cases=[test_case],
        metrics=[contextual_precision, contextual_recall, contextual_relevancy, answer_relevancy, faithfulness]
    )

Running the function above generates the following output:

    Evaluating 1 test case(s) in parallel: |██████████|100% (1/1) [Time Taken: 00:23, 23.10s/test case]

    ======================================================================

    Metrics Summary

      - ✅ Contextual Precision (score: 0.611111111111111, threshold: 0.5, strict: False, evaluation model: gpt-4o, reason: The score is 0.61 because relevant nodes in retrieval contexts, like the first node which 'provides the total net sales figures for the fiscal years 2017 to 2020,' and the fourth node which 'provides net sales figures for 2020, 2021, and 2022,' are ranked higher than many irrelevant nodes. However, the score is not higher because there are irrelevant nodes, such as the second node discussing 'business seasonality, product introductions, and human capital,' and the third node focused on 'litigation and legal matters,' which are ranked above some relevant nodes., error: None)
      - ✅ Contextual Recall (score: 1.0, threshold: 0.5, strict: False, evaluation model: gpt-4o, reason: The score is 1.00 because every sentence in the expected output is perfectly attributed to relevant nodes in the retrieval context. Amazing job!, error: None)
      - ❌ Contextual Relevancy (score: 0.2553191489361702, threshold: 0.5, strict: False, evaluation model: gpt-4o, reason: The score is 0.26 because most statements in the context do not provide the required 'Company Name' or 'Total net sales' data. Relevant statements like 'Total net sales $ 274,515 $ 260,174 $ 265,595 $ 229,234 $ 215,639' and 'Apple Inc.' are overshadowed by irrelevant information about unrelated financial metrics and legal matters., error: None)
      - ✅ Answer Relevancy (score: 1.0, threshold: 0.5, strict: False, evaluation model: gpt-4o, reason: The score is 1.00 because the output perfectly addresses all aspects of the input without any irrelevant statements. Great job!, error: None)
      - ✅ Faithfulness (score: 1.0, threshold: 0.5, strict: False, evaluation model: gpt-4o, reason: The score is 1.00 because there are no contradictions. Great job ensuring the actual output perfectly aligns with the retrieval context!, error: None)

    For test case:

      - input: Extract the following information:

                - **Company Name**:
                Extract the name of the company that filed the report.

                - **Total net sales**:
                Extract the total net sales for every fiscal year starting from 2017 up to 2022 in millions, extract the exact number.

      - actual output: - **Company Name**: Apple Inc.

    - **Total net sales**:
      - 2022: $394,328 million
      - 2021: $365,817 million
      - 2020: $274,515 million
      - 2019: $260,174 million
      - 2018: $265,595 million
      - 2017: $229,234 million
      - expected output:
                            Company Name: Apple Inc.

                            Total net sales:
                            2017: $229,234 million
                            2018: $265,595 million
                            2019: $260,174 million
                            2020: $274,515 million
                            2021: $365,817 million
                            2022: $394,328 million

      - retrieval context: ['Selected Financial Data\nThe information set forth below for the five years ended September 26, 2020, is not necessarily indicative of results of future operations,\nand should be read in conjunction with Part II, Item 7, "Management's Discussion and Analysis of Financial Condition and Results of\nOperations" and the consolidated financial statements and accompanying notes included in Part II, Item 8 of this Form 10-K to fully\nunderstand factors that may affect the comparability of the information presented below (in millions, except number of shares, which are\nreflected in thousands, and per share amounts). 2020 2019 2018 2017 2016\nTotal net sales $ 274,515 $ 260,174 $ 265,595 $ 229,234 $ 215,639 \nNet income $ 57,411 $ 55,256 $ 59,531 $ 48,351 $ 45,687 \nEarnings per share:\nBasic $ 3.31 $ 2.99 $ 3.00 $ 2.32 $ 2.09 \nDiluted $ 3.28 $ 2.97 $ 2.98 $ 2.30 $ 2.08 \nCash dividends declared per share $ 0.795 $ 0.75 $ 0.68 $ 0.60 $ 0.545 \nShares used in computing earnings per share:\nBasic 17,352,119 18,471,336 19,821,510 20,868,968 21,883,281 \nDiluted 17,528,214 18,595,651 20,000,435 21,006,767 22,001,126 \nTotal cash, cash equivalents and marketable securities$ 191,830 $ 205,898 $ 237,100 $ 268,895 $ 237,585 \nTotal assets $ 323,888 $ 338,516 $ 365,725 $ 375,319 $ 321,686 \nNon-current portion of term debt $ 98,667 $ 91,807 $ 93,735 $ 97,207 $ 75,427 \nOther non-current liabilities $ 54,490 $ 50,503 $ 48,914 $ 44,212 $ 39,986 \nApple Inc. | 2020 Form 10-K | 19', 'Business Seasonality and Product Introductions\nThe Company has historically experienced higher net sales in its first quarter compared to other quarters in its fiscal year due in part to\nseasonal holiday demand. Additionally, new product and service introductions can significantly impact net sales, cost of sales and\noperating expenses. The timing of product introductions can also impact the Company's net sales to its indirect distribution channels as\nthese channels are filled with new inventory following a product launch, and channel inventory of an older product often declines as the\nlaunch of a newer product approaches. Net sales can also be affected when consumers and distributors anticipate a product\nintroduction. Human Capital\nThe Company believes it has a talented, motivated and dedicated team, and works to create an inclusive, safe and supportive\nenvironment for all of its team members. As of September 30, 2023, the Company had approximately 161,000 full-time equivalent\nemployees. Workplace Practices and Policies\nThe Company is an equal opportunity employer committed to inclusion and diversity and to providing a workplace free of harassment or\ndiscrimination.', 'On April 5, 2018, several U.S. federal actions were consolidated through a\nMultidistrict Litigation process into a single action in the U.S. District Court for the Northern District of California. In addition to civil\nlitigation, the Company is also responding to governmental investigations and requests for information relating to the performance\nmanagement feature. The Company believes that its iPhones were not defective, that the performance management feature introduced\nwith iOS updates 10.2.1 and 11.2 was intended to, and did, improve customers' user experience, and that the Company did not make\nany misleading statements or fail to disclose any material information. The Company has accrued its best estimate for the ultimate\nresolution of these matters. French Competition Authority\nIn June 2019, the French Competition Authority ("FCA") issued a report alleging that aspects of the Company's sales and distribution\npractices in France violate French competition law. The Company vigorously disagrees with the allegations, and a hearing of arguments\nwas held before the FCA on October 15, 2019. The Company is awaiting the decision of the FCA, which may include a fine. Note 11 - Segment Information and Geographic Data\nThe Company reports segment information based on the "management" approach. The management approach designates the internal\nreporting used by management for making decisions and assessing performance as the source of the Company's reportable segments. The Company manages its business primarily on a geographic basis. The Company's reportable segments consist of the Americas,\nEurope, Greater China, Japan and Rest of Asia Pacific. Americas includes both North and South America. Europe includes European\ncountries, as well as India, the Middle East and Africa. Greater China includes China, Hong Kong and Taiwan. Rest of Asia Pacific\nincludes Australia and those Asian countries not included in the Company's other reportable segments. Although the reportable\nsegments provide similar hardware and software products and similar services, each one is managed separately to better align with the\nlocation of the Company's customers and distribution partners and the unique market dynamics of each geographic region. The\naccounting policies of the various segments are the same as those described in Note 1, "Summary of Significant Accounting Policies."\nThe Company evaluates the performance of its reportable segments based on net sales and operating income. Net sales for geographic\nsegments are generally based on the location of customers and sales through the Company's retail stores located in those geographic\nlocations. Operating income for each segment includes net sales to third parties, related cost of sales and operating expenses directly\nattributable to the segment. Advertising expenses are generally included in the geographic segment in which the expenditures are\nincurred. Operating income for each segment excludes other income and expense and certain expenses managed outside the\nreportable segments. Costs excluded from segment operating income include various corporate expenses such as research and\ndevelopment, corporate marketing expenses, certain share-based compensation expenses, income taxes, various nonrecurring charges\nand other separately managed general and administrative costs. The Company does not include intercompany transfers between\nsegments for management reporting purposes.', 'Note 11 - Segment Information and Geographic Data\nThe following table shows information by reportable segment for 2022, 2021 and 2020 (in millions):\n2022 2021 2020\nAmericas:\nNet sales $ 169,658 $ 153,306 $ 124,556 \nOperating income $ 62,683 $ 53,382 $ 37,722 \nEurope:\nNet sales $ 95,118 $ 89,307 $ 68,640 \nOperating income $ 35,233 $ 32,505 $ 22,170 \nGreater China:\nNet sales $ 74,200 $ 68,366 $ 40,308 \nOperating income $ 31,153 $ 28,504 $ 15,261 \nJapan:\nNet sales $ 25,977 $ 28,482 $ 21,418 \nOperating income $ 12,257 $ 12,798 $ 9,279 \nRest of Asia Pacific:\nNet sales $ 29,375 $ 26,356 $ 19,593 \nOperating income $ 11,569 $ 9,817 $ 6,808 \nA reconciliation of the Company's segment operating income to the Consolidated Statements of Operations for 2022, 2021 and 2020 is\nas follows (in millions):\n2022 2021 2020\nSegment operating income $ 152,895 $ 137,006 $ 91,240 \nResearch and development expense (26,251) (21,914) (18,752)\nOther corporate expenses, net (7,207) (6,143) (6,200)\nTotal operating income $ 119,437 $ 108,949 $ 66,288 \nThe U.S. and China were the only countries that accounted for more than 10% of the Company's net sales in 2022, 2021 and 2020.', 'Certain prior period amounts in\nthe consolidated financial statements and accompanying notes have been reclassified to conform to the current period's presentation. The Company's fiscal year is the 52- or 53-week period that ends on the last Saturday of September. An additional week is included in\nthe first fiscal quarter every five or six years to realign the Company's fiscal quarters with calendar quarters, which will occur in the first\nquarter of the Company's fiscal year ending September 30, 2023. The Company's fiscal years 2022, 2021 and 2020 spanned 52 weeks\neach. Unless otherwise stated, references to particular years, quarters, months and periods refer to the Company's fiscal years ended in\nSeptember and the associated quarters, months and periods of those fiscal years. Revenue Recognition\nNet sales consist of revenue from the sale of iPhone, Mac, iPad, Services and other products. The Company recognizes revenue at the\namount to which it expects to be entitled when control of the products or services is transferred to its customers. Control is generally\ntransferred when the Company has a present right to payment and title and the significant risks and rewards of ownership of products or\nservices are transferred to its customers. For most of the Company's Products net sales, control transfers when products are shipped. For the Company's Services net sales, control transfers over time as services are delivered. Payment for Products and Services net\nsales is collected within a short period following transfer of control or commencement of delivery of services, as applicable. The Company records reductions to Products net sales related to future product returns, price protection and other customer incentive\nprograms based on the Company's expectations and historical experience. For arrangements with multiple performance obligations, which represent promises within an arrangement that are distinct, the Company\nallocates revenue to all distinct performance obligations based on their relative stand-alone selling prices ("SSPs"). When available, the\nCompany uses observable prices to determine SSPs. When observable prices are not available, SSPs are established that reflect the\nCompany's best estimates of what the selling prices of the performance obligations would be if they were sold regularly on a stand-alone\nbasis. The Company's process for estimating SSPs without observable prices considers multiple factors that may vary depending upon\nthe unique facts and circumstances related to each performance obligation including, where applicable, prices charged by the Company\nfor similar offerings, market trends in the pricing for similar offerings, product-specific business objectives and the estimated cost to\nprovide the performance obligation. The Company has identified up to three performance obligations regularly included in arrangements involving the sale of iPhone, Mac,\niPad and certain other products. The first performance obligation, which represents the substantial portion of the allocated sales price, is\nthe hardware and bundled software delivered at the time of sale. The second performance obligation is the right to receive certain\nproduct-related bundled services, which include iCloud, Siri and Maps. The third performance obligation is the right to receive, on a\nwhen-and-if-available basis, future unspecified software upgrades relating to the software bundled with each device. The Company\nallocates revenue and any related discounts to these performance obligations based on their relative SSPs. Because the Company\nlacks observable prices for the undelivered performance obligations, the allocation of revenue is based on the Company's estimated\nSSPs. Revenue allocated to the delivered hardware and bundled software is recognized when control has transferred to the customer,\nwhich generally occurs when the product is shipped. Revenue allocated to the product-related bundled services and unspecified\nsoftware upgrade rights is deferred and recognized on a straight-line basis over the estimated period they are expected to be provided. Cost of sales related to delivered hardware and bundled software, including estimated warranty costs, are recognized at the time of sale. Costs incurred to provide product-related bundled services and unspecified software upgrade rights are recognized as cost of sales as\nincurred. For certain long-term service arrangements, the Company has performance obligations for services it has not yet delivered. For these\narrangements, the Company does not have a right to bill for the undelivered services. The Company has determined that any unbilled\nconsideration relates entirely to the value of the undelivered services. Accordingly, the Company has not recognized revenue, and does\nnot disclose amounts, related to these undelivered services. ® ®\nApple Inc.', 'Item 8. Financial Statements and Supplementary Data\nIndex to Consolidated Financial Statements Page\nConsolidated Statements of Operations for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 29\nConsolidated Statements of Comprehensive Income for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 30\nConsolidated Balance Sheets as of September 28, 2019 and September 29, 2018 31\nConsolidated Statements of Shareholders' Equity for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 32\nConsolidated Statements of Cash Flows for the years ended September 28, 2019, September 29, 2018 and\nSeptember 30, 2017 33\nNotes to Consolidated Financial Statements 34\nSelected Quarterly Financial Information (Unaudited) 55\nReports of Independent Registered Public Accounting Firm 56\nAll financial statement schedules have been omitted, since the required information is not applicable or is not present in amounts\nsufficient to require submission of the schedule, or because the information required is included in the consolidated financial statements\nand accompanying notes. Apple Inc.', 'Item 7. Management's Discussion and Analysis of Financial Condition and Results of Operations\nThe following discussion should be read in conjunction with the consolidated financial statements and accompanying notes included in\nPart II, Item 8 of this Form 10-K. This Item generally discusses 2023 and 2022 items and year-to-year comparisons between 2023 and\n2022. Discussions of 2021 items and year-to-year comparisons between 2022 and 2021 are not included, and can be found in\n"Management's Discussion and Analysis of Financial Condition and Results of Operations" in Part II, Item 7 of the Company's Annual\nReport on Form 10-K for the fiscal year ended September 24, 2022. Fiscal Period\nThe Company's fiscal year is the 52- or 53-week period that ends on the last Saturday of September. An additional week is included in\nthe first fiscal quarter every five or six years to realign the Company's fiscal quarters with calendar quarters, which occurred in the first\nquarter of 2023. The Company's fiscal year 2023 spanned 53 weeks, whereas fiscal years 2022 and 2021 spanned 52 weeks each. Fiscal Year Highlights\nThe Company's total net sales were $383.3 billion and net income was $97.0 billion during 2023. The Company's total net sales decreased 3% or $11.0 billion during 2023 compared to 2022. The weakness in foreign currencies\nrelative to the U.S. dollar accounted for more than the entire year-over-year decrease in total net sales, which consisted primarily of\nlower net sales of Mac and iPhone, partially offset by higher net sales of Services. The Company announces new product, service and software offerings at various times during the year. Significant announcements\nduring fiscal year 2023 included the following:\nFirst Quarter 2023:\n• iPad and iPad Pro;\n• Next-generation Apple TV 4K; and\n• MLS Season Pass, a Major League Soccer subscription streaming service. Second Quarter 2023:\n• MacBook Pro 14", MacBook Pro 16" and Mac mini; and\n• Second-generation HomePod. Third Quarter 2023:\n• MacBook Air 15", Mac Studio and Mac Pro;\n• Apple Vision Pro™, the Company's first spatial computer featuring its new visionOS™, expected to be available in early\ncalendar year 2024; and\n• iOS 17, macOS Sonoma, iPadOS 17, tvOS 17 and watchOS 10, updates to the Company's operating systems. Fourth Quarter 2023:\n• iPhone 15, iPhone 15 Plus, iPhone 15 Pro and iPhone 15 Pro Max; and\n• Apple Watch Series 9 and Apple Watch Ultra 2. In May 2023, the Company announced a new share repurchase program of up to $90 billion and raised its quarterly dividend from $0.23\nto $0.24 per share beginning in May 2023. During 2023, the Company repurchased $76.6 billion of its common stock and paid dividends\nand dividend equivalents of $15.0 billion. Macroeconomic Conditions\nMacroeconomic conditions, including inflation, changes in interest rates, and currency fluctuations, have directly and indirectly impacted,\nand could in the future materially impact, the Company's results of operations and financial condition. Apple Inc.', 'Note 12 - Selected Quarterly Financial Information (Unaudited)\nThe following tables show a summary of the Company's quarterly financial information for each of the four quarters of 2019 and 2018 (in\nmillions, except per share amounts):\n Fourth Quarter  Third Quarter Second Quarter  First Quarter\n2019:     \nTotal net sales $ 64,040 $ 53,809 $ 58,015 $ 84,310\nGross margin $ 24,313 $ 20,227 $ 21,821 $ 32,031\nNet income $ 13,686 $ 10,044 $ 11,561 $ 19,965\n     \nEarnings per share (1):     \nBasic $ 3.05 $ 2.20 $ 2.47 $ 4.22\nDiluted $ 3.03 $ 2.18 $ 2.46 $ 4.18\n Fourth Quarter  Third Quarter Second Quarter  First Quarter\n2018:     \nTotal net sales $ 62,900 $ 53,265 $ 61,137 $ 88,293\nGross margin $ 24,084 $ 20,421 $ 23,422 $ 33,912\nNet income $ 14,125 $ 11,519 $ 13,822 $ 20,065\n     \nEarnings per share (1):     \nBasic $ 2.94 $ 2.36 $ 2.75 $ 3.92\nDiluted $ 2.91 $ 2.34 $ 2.73 $ 3.89\n \n(1) Basic and diluted earnings per share are computed independently for each of the quarters presented. Therefore, the sum of quarterly basic and\ndiluted per share information may not equal annual basic and diluted earnings per share. Apple Inc.', 'Segment Operating Performance\nThe following table shows net sales by reportable segment for 2023, 2022 and 2021 (dollars in millions):\n2023 Change 2022 Change 2021\nNet sales by reportable segment:\nAmericas $ 162,560 (4)% $ 169,658 11 % $ 153,306 \nEurope 94,294 (1)% 95,118 7 % 89,307 \nGreater China 72,559 (2)% 74,200 9 % 68,366 \nJapan 24,257 (7)% 25,977 (9)% 28,482 \nRest of Asia Pacific 29,615 1 % 29,375 11 % 26,356 \nTotal net sales $ 383,285 (3)% $ 394,328 8 % $ 365,817 \nAmericas\nAmericas net sales decreased 4% or $7.1 billion during 2023 compared to 2022 due to lower net sales of iPhone and Mac, partially\noffset by higher net sales of Services. Europe\nEurope net sales decreased 1% or $824 million during 2023 compared to 2022. The weakness in foreign currencies relative to the U.S. dollar accounted for more than the entire year-over-year decrease in Europe net sales, which consisted primarily of lower net sales of\nMac and Wearables, Home and Accessories, partially offset by higher net sales of iPhone and Services. Greater China\nGreater China net sales decreased 2% or $1.6 billion during 2023 compared to 2022. The weakness in the renminbi relative to the U.S. dollar accounted for more than the entire year-over-year decrease in Greater China net sales, which consisted primarily of lower net\nsales of Mac and iPhone. Japan\nJapan net sales decreased 7% or $1.7 billion during 2023 compared to 2022. The weakness in the yen relative to the U.S. dollar\naccounted for more than the entire year-over-year decrease in Japan net sales, which consisted primarily of lower net sales of iPhone,\nWearables, Home and Accessories and Mac. Rest of Asia Pacific\nRest of Asia Pacific net sales increased 1% or $240 million during 2023 compared to 2022. The weakness in foreign currencies relative\nto the U.S. dollar had a significantly unfavorable year-over-year impact on Rest of Asia Pacific net sales. The net sales increase\nconsisted of higher net sales of iPhone and Services, partially offset by lower net sales of Mac and iPad.', 'The Company has asked the court to set aside the\nverdict, where the case remains pending. Note 11 - Segment Information and Geographic Data\nThe Company reports segment information based on the "management" approach. The management approach designates the internal\nreporting used by management for making decisions and assessing performance as the source of the Company's reportable segments. The Company manages its business primarily on a geographic basis. The Company's reportable segments consist of the Americas,\nEurope, Greater China, Japan and Rest of Asia Pacific. Americas includes both North and South America. Europe includes European\ncountries, as well as India, the Middle East and Africa. Greater China includes China mainland, Hong Kong and Taiwan. Rest of Asia\nPacific includes Australia and those Asian countries not included in the Company's other reportable segments. Although the reportable\nsegments provide similar hardware and software products and similar services, each one is managed separately to better align with the\nlocation of the Company's customers and distribution partners and the unique market dynamics of each geographic region. The\naccounting policies of the various segments are the same as those described in Note 1, "Summary of Significant Accounting Policies."\nThe Company evaluates the performance of its reportable segments based on net sales and operating income. Net sales for geographic\nsegments are generally based on the location of customers and sales through the Company's retail stores located in those geographic\nlocations. Operating income for each segment includes net sales to third parties, related cost of sales and operating expenses directly\nattributable to the segment. Advertising expenses are generally included in the geographic segment in which the expenditures are\nincurred. Operating income for each segment excludes other income and expense and certain expenses managed outside the\nreportable segments. Costs excluded from segment operating income include various corporate expenses such as research and\ndevelopment, corporate marketing expenses, certain share-based compensation expenses, income taxes, various nonrecurring charges\nand other separately managed general and administrative costs. The Company does not include intercompany transfers between\nsegments for management reporting purposes. The following table shows information by reportable segment for 2020, 2019 and 2018 (in millions):\n2020 2019 2018\nAmericas:\nNet sales $ 124,556 $ 116,914 $ 112,093 \nOperating income $ 37,722 $ 35,099 $ 34,864 \nEurope:\nNet sales $ 68,640 $ 60,288 $ 62,420 \nOperating income $ 22,170 $ 19,195 $ 19,955 \nGreater China:\nNet sales $ 40,308 $ 43,678 $ 51,942 \nOperating income $ 15,261 $ 16,232 $ 19,742 \nJapan:\nNet sales $ 21,418 $ 21,506 $ 21,733 \nOperating income $ 9,279 $ 9,369 $ 9,500 \nRest of Asia Pacific:\nNet sales $ 19,593 $ 17,788 $ 17,407 \nOperating income $ 6,808 $ 6,055 $ 6,181 \nApple Inc. | 2020 Form 10-K | 55']

    ======================================================================

    Overall Metric Pass Rates

    Contextual Precision: 100.00% pass rate
    Contextual Recall: 100.00% pass rate
    Contextual Relevancy: 0.00% pass rate
    Answer Relevancy: 100.00% pass rate
    Faithfulness: 100.00% pass rate

    ======================================================================

The **Metrics Summary** section provides details about which metrics were evaluated, their scores, thresholds, and reasons for the scores. This information is helpful for identifying potential areas of improvement in the system.

In this example, 4 out of 5 metrics met the set thresholds. But, **Contextual Relevancy** failed with a score of 0.26. The explanation highlights the reason:

    The score is 0.26 because most statements in the context do not provide
    the required 'Company Name' or 'Total net sales' data.
    Relevant statements like 'Total net sales $ 274,515 $ 260,174
    $ 265,595 $ 229,234 $ 215,639' and 'Apple Inc.' are overshadowed
    by irrelevant information about unrelated financial metrics and legal matters.

The reason above suggest two primary areas for improvement:

  * **Optimizing Chunk Division**:
The text chunks may not be divided optimally. Revising the chunking strategy to better align with semantic boundaries can help improve the retrieval of relevant context while minimizing irrelevant data.
  * **Adjusting the k Parameter**:
The `k` parameter, which controls the number of retrieved chunks, needs fine-tuning. It's important to retrieve enough relevant data to answer the question while avoiding unnecessary retrieval. Too much data increases token consumption, leading to longer processing times and higher latency as well as higher costs.

## Conclusion

This article provides a detailed walkthrough of implementing and evaluating a Retrieval-Augmented Generation (RAG) system for financial document analysis using 10-K reports. The system can serve as a prototype for a larger assistant application, showcasing the power of cutting-edge generative models, efficient prompt engineering, and the practical integration of information extraction across multiple documents to generate evidence-based answers.

## Pros:

  * **Evidence-Based Responses**: Retrieval of specific document chunks ensures traceability and transparency in the generated answers.
  * **Domain Flexibility**: The system integrates domain-specific knowledge without without retraining the LLM.
  * **Scalability**: Leveraging robust vector databases like Weaviate ensures the system can handle large and complex datasets effectively.

## Cons:

  * **Cost**: API usage can become expensive for large-scale processing.
  * **Machine-Readable PDF Limitation**: The approach assumes documents are machine-readable, adding complexity when Optical Character Recognition (OCR) is required for scanned files.
  * **Data Privacy**: Sending sensitive financial data to cloud-based models may pose security and compliance risks.
  * **Learning Curve**: Advanced tools like Weaviate and LangGraph may be challenging for beginners to adopt and use effectively.

## Lessons Learned

  1. **Fine-tuning Parameters Matters:** Effective division of documents into meaningful semantic chunks improves retrieval accuracy and reduces irrelevant context. Parameters like k (number of retrieved chunks) significantly impact the balance between relevance and processing overhead.
  2. **Evaluation is Crucial:** Rigorous testing using metrics such as contextual precision, recall, and relevancy provides actionable insights for refining the system. These metrics are essential for identifying weaknesses and areas for improvement.
  3. **Tool Selection:** Choosing robust tools like Weaviate ensures scalability and performance for large datasets but requires familiarity with advanced features. Simpler tools may be sufficient for experimentation but may lack the functionality needed for production systems.
  4. **Domain-Specific Adaptation:** Adapting prompts to the specific domain, such as finance, is essential for maximizing performance. Domain-tailored prompts improve the system's ability to deliver precise, relevant, and actionable outputs.
