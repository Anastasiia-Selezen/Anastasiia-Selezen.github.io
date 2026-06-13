---
title: "Multimodal Document RAG with ColPali: Expanding Beyond Textual Data"
date: 2024-12-29 20:00
summary: "Querying complex documents with multimodal RAG and a vision language model."
category: "RAG"
tags: ["rag", "multimodal", "colpali", "document-ai"]
type: "article"
status: "featured"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/multimodal-document-rag-with-colpali-expanding-beyond-textual-data-e44ef9a18df6"
legacyUrl: "/multimodal-document-rag-with-colpali-expanding-beyond-textual-data.html"
---

![](https://cdn-images-1.medium.com/max/1024/0*RBRsvJ-a2GDQo4R9)

## Abstract

This post explores advancements in Retrieval-Augmented Generation (RAG) systems to better handle complex and scanned documents, building on the foundation of extracting information from 10-K SEC reports. By using tools like ColPali, designed specifically for processing scanned PDFs and images, it becomes possible to efficiently manage data formats such as tables and charts. This approach overcomes the limitations of text-only systems by enabling more robust contextual retrieval and analysis. Using Shareholder Slide Decks as an example, the post illustrates how multimodal RAG can effectively tackle complex queries by leveraging insights from both charts and images content.

## Goals and Requirements

The goal of this project is to demonstrate how multimodal Retrieval-Augmented Generation (RAG) systems can process and retrieve information from complex or scanned documents. By integrating Vision Language Models (VLMs), this approach addresses the limitations of text-only inputs, enriching the context with up-to-date and comprehensive data.

In the previous post, a text-only RAG system was explored.

[Financial Assistant for Querying 10-K Reports Powered by a Retrieval-Augmented Generation (RAG)…](</work/financial-assistant-rag-10k-reports/>)

This post focuses on expanding capabilities to multimodal document processing with the following goals:

  * **Support for Multimodal Documents**: Incorporate scanned financial reports, tables, and figures into the RAG workflow.
  * **Improved Accessibility**: Allow users to query complex documents as if they were fully structured, regardless of their format.

This enhancement significantly expands the potential of a digital financial analyst. The approach leverages quarterly shareholder slide decks and has the potential to extend further, incorporating audio from earnings calls and video presentations from related events. Such integration would provide a comprehensive view of a company's historical performance while keeping users consistently informed.

### Instructions for Implementation:

  1. **Create a Knowledge Base**
a. Initialize the ColQwen2 model with Byaldi.
b. Index documents.
c. Test querying of indexed documents.
  2. **Implement a Retrieval and Generation Pipeline**
a. Initialize a Vision Language Model.
b. Wrap retrieval and generation steps into a LangGraph.
c. Process user input and answer questions through the pipeline.

## The Technologies

To achieve the project's objectives, the following technologies were utilized:

  * [**ColPali**](<https://github.com/illuin-tech/colpali>): Preprocesses multimodal documents, including scanned PDFs, images, and charts.
  * [**Byaldi**](<https://github.com/AnswerDotAI/byaldi>): A wrapper around the ColPali repository, designed to simplify the use of late-interaction multimodal models like ColPali by providing an easy API.
  * **Vision Language Models (VLMs)**: Offers advanced capabilities for understanding and processing both visual and textual data.
  * [**Together AI**](<https://www.together.ai/>): An end-to-end platform for managing the full generative AI lifecycle, used in this project for API access to open-source Vision Language Models.
  * [**LangGraph**](<https://www.langchain.com/langgraph>): A library for building stateful, multi-actor workflows with LLMs, enabling the development of agent-based and multi-agent systems.

### Why use [ColPali](<https://github.com/illuin-tech/colpali>)?

In a basic Retrieval-Augmented Generation (RAG) pipeline, data is typically required in text format. Processing scanned documents, charts, schemas, or tables often involves a complex extraction workflow. This may include Optical Character Recognition (OCR) for scanned text, layout detection for table processing, structural metadata extraction (e.g., page numbers), and the chunking and embedding of extracted text. These approaches can be both time-intensive and prone to errors, because text can't easily represent rich content like tables, charts and images.

**ColPali** offers an innovative alternative by enabling direct indexing and embedding of document pages, supporting retrieval based on visual semantic similarity. This capability allows AI systems to effectively process and reason over document images, delivering a more flexible and robust solution for **multimodal Retrieval-Augmented Generation** (RAG).

The image below, from the original paper [ColPali: Efficient Document Retrieval with Vision Language Models](<https://arxiv.org/pdf/2407.01449>), illustrates a comparison between the standard approach to retrieval and ColPali.

![](https://cdn-images-1.medium.com/max/1024/1*VS16Nb-hXB8RPfYAQ2-law.png)

_ColPali vs Standard Retrieval (from [ColPali: Efficient Document Retrieval with Vision Language Models](<https://arxiv.org/pdf/2407.01449>))_

### How does ColPali work?

The concept behind ColPali is reflected in its name: "Col" represents [ColBERT](<https://huggingface.co/colbert-ir/colbertv2.0>), and "Pali" refers to [PaliGemma-3B](<https://huggingface.co/docs/transformers/main/model_doc/paligemma>) (google/paligemma-3b-mix-448). This article uses ColQwen2, a related model to ColPali, built on [Qwen/Qwen2-VL-2B-Instruct](<https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct>). While PaliGemma-3B offers a slightly larger model size capable of capturing richer contextual information, Qwen2 is designed to be more efficient, lightweight, but still effective for visual-text retrieval.

One of Qwen2's key advantages is its ability to process images of arbitrary resolutions, dynamically mapping them into a variable number of visual tokens. This provides a more flexible and human-like approach to visual processing. In comparison, PaliGemma-3B operates at fixed resolutions: 224x224, 448x448, and 896x896.

The first step is to create a knowledge base. Each page of the document is converted to an image format. A Vision Language Model converts document page images into rich semantic representations. It divides each image into patches, capturing nuanced details from different regions of the document and encoding both text and visuals as vectors. These patch vectors can then be efficiently stored in a vector database for fast retrieval.

![](https://cdn-images-1.medium.com/max/1024/1*Cu3w9W00Au8umqSiDsB6zg.png)

_Knowledge base creation_

Second step is to use ColPali for retrieval part. When a user submits a query, it is first embedded by the language model. Next, a ColBERT-style "late interaction" step processes the query token by token, applying a Maximum Similarity (MaxSim) operation to calculate similarity scores. This enables precise matching of each query token against stored image patch tokens, producing a vector list that shows how each query token aligns with every document token. The process concludes by ranking and retrieving the most relevant document pages for the query.

![](https://cdn-images-1.medium.com/max/1024/1*FPhlFxW0Ko6_G_o1CSdr0w.png)

_Retrieval and Generation Pipeline_

The advantage of this approach is that the RAG system operates independently of the document format, making it adaptable to a wide range of data sources.

A potential drawback is that ColPali may face challenges with a significant increase in the number of vectors, which can affect performance and efficiency. However, optimization methods are available to address this issue.

An additional benefit is that ColPali can generate a **semantic heatmap**, which visually highlights the sections of a document most closely aligned with the query, offering users an intuitive insight into the retrieval process.

### What is [Byaldi](<https://github.com/AnswerDotAI/byaldi>)?

Byaldi is [RAGatouille](<https://github.com/AnswerDotAI/RAGatouille>)'s project that serves as a simple wrapper around the ColPali repository, designed to simplify the use of late-interaction multimodal models like ColPali and ColQwen2 through a simple API. It leverages the colpali-engine package to facilitate indexing and storing embeddings.

> Please, note that this is a pre-release library.

## The Solution

[Tesla's Q3 2024 Shareholder Slide Deck](<https://digitalassets.tesla.com/tesla-contents/image/upload/IR/TSLA-Q3-2024-Update.pdf>) is used as an example dataset to showcase the multimodal RAG capabilities.

### Prerequisites

Before starting, ensure the required Python libraries and system dependencies are installed:

    # Wrapper for ColPali
    pip install byaldi

    # Convert PDF to Images
    pip install pdf2image

    # Dependencies for pdf2image
    sudo apt-get install -y poppler-utils # For MacOS use brew install poppler

    # API Access for Open-Source Vision Language Models
    pip install together

    # Compile RAG into a Graph Structure
    pip install langgraph

### Importing libraries

    import os
    from pathlib import Path
    from together import Together
    from byaldi import RAGMultiModalModel
    from typing_extensions import TypedDict
    from langgraph.graph import START, StateGraph, END
    from langgraph.checkpoint.memory import MemorySaver

### 1. Create a Knowledge Base
### a. Initialize the ColQwen2 model

The initial step involves setting up the **ColQwen2** model using the **Byaldi** wrapper. The `RAGMultiModalModel` class provides a convenient interface for loading pre-trained models (such as `vidore/colqwen2-v0.1`) and performing retrieval tasks. This approach is particularly useful for rapid prototyping. For more advanced use cases or custom configurations, the `colpali_engine` package can be used directly. Find more about its usage [here](<https://huggingface.co/vidore/colpali>).

    RAG = RAGMultiModalModel.from_pretrained("vidore/colqwen2-v0.1", device="mps")

The `device="mps"` parameter specifies the hardware accelerator for model computations. In this example, it uses Metal Performance Shaders (MPS), optimized for Apple Silicon.

### b. Index Documents

The next step is the indexing of the dataset. PDF pages are processed sequentially, converting each page into images using tools such as pdf2image (internally managed by Byaldi). Both visual and textual features are extracted from each page and transformed into embeddings. These embeddings are then stored in a vector database, enabling the creation of a searchable index for the document pages.

     # Define the index name
    index_name = "tesla_index"

    # Index the document
    RAG.index(
        input_path=Path("data/TSLA-Q3-2024-Update.pdf"),
        index_name=index_name,
        store_collection_with_index=True,
        overwrite=True
    )

The `input_path` parameter defines the path to the dataset that will be indexed. The `index_name` parameter is a unique name for the index. The `store_collection_with_index=True` parameter ensures that the embeddings, metadata, and the entire image are stored together; be aware that this increases storage usage. The `overwrite=True` parameter allows re-indexing the same document if necessary.

Output:

    Added page 1 of document 0 to index.
    Added page 2 of document 0 to index.
    Added page 3 of document 0 to index.
    ...
    Added page 31 of document 0 to index.
    Added page 32 of document 0 to index.
    Index exported to .byaldi/tesla_index

Each line indicates that a page from the document has been successfully processed and indexed. The index is exported to `.byaldi/tesla_index` for storage and retrieval.

### c. Test Querying of Indexed Documents

After the document is indexed, queries can be executed to retrieve the most relevant pages based on their similarity to the query text.

Query 1:

> How many Supercharger stations and connectors were added in Q3 2024? How does this compare to Q2 2024 and Q3 2023?

    text_query = "How many Supercharger stations and connectors were added in Q3 2024? How does this compare to Q2 2024 and Q3 2023?"
    results = RAG.search(text_query, k=1)
    print(results)

The `text_query` parameter contains the query text sent to the system. The `k=1` parameter specifies that only the top 1 most relevant result should be returned.

Output 1:

The system returns a list of the most relevant page(s):

    [{'doc_id': 0, 'page_num': 6, 'score': 35.25, 'metadata': {}, 'base64': 'iVBORw0KGgoAAAANSU.....'}]

`doc_id` identifies the document in the index. `page_num` specifies the page number containing the answer. `score` shows the similarity score, with higher values indicating better matches. `base64` is an encoded representation of the page image for visual inspection, enabled due to the earlier setup with `store_collection_with_index=True`.

Query 2:

> What is Tesla's market share in key regions like the U.S./Canada based on the trailing twelve months (TTM) chart?

    text_query = "What is Tesla's market share in key regions like the U.S./Canada based on the trailing twelve months (TTM) chart?"
    results = RAG.search(text_query, k=3)
    print(results)

`k=3` here requests the top 3 most relevant results.

Output 2:

The query retrieves three pages, ranked by their similarity scores, with page 7 being the most relevant for this query:

    [{'doc_id': 0, 'page_num': 7, 'score': 27.125, 'metadata': {}, 'base64': 'iVBORw0K...'},
    {'doc_id': 0, 'page_num': 12, 'score': 21.5, 'metadata': {}, 'base64': 'iVBORw0K...'},
    {'doc_id': 0, 'page_num': 24, 'score': 19.75, 'metadata': {}, 'base64': 'iVBORw0K...'}]

### 2. Implement a Retrieval and Generation Pipeline
This step combines retrieval and generation functionalities into a unified pipeline, leveraging the Together AI API for Vision Language Model access and LangGraph for structured execution.

Before proceeding, the Together AI API key must be configured. Register and configure it [here](<https://api.together.xyz/signin?redirectUrl=/settings/api-keys>). It can be set as an environment variable for secure access:

    api_key = os.environ.get("TOGETHER_API_KEY")

### a. Initialize a Vision Language Model

The `meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo` model is used for multimodal chat interactions in this article.

**Why Use Llama 3.2 Vision Instruct Turbo?**

The Llama 3.2 Vision instruction-tuned models are specifically optimized for tasks such as visual recognition, image reasoning, captioning, and assistant-like interactions involving images. These capabilities make the model well-suited for multimodal tasks requiring the integration of textual and visual data.

For text-only tasks, the model officially supports eight languages: English, German, French, Italian, Portuguese, Hindi, Spanish, and Thai. However, it has been trained on a broader collection of languages beyond these eight. It is important to note that for **image+text applications**, English is the only supported language.

The performance of the Llama 3.2 Vision model is demonstrated through benchmarks across various tasks, with results particularly relevant to the use case in this article:

  * Charts and Diagram Understanding:
\- ChartQA (test, CoT): 85.5%
\- AI2 Diagram (test): 92.3%
\- DocVQA (test): 90.1%
  * General Visual Question Answering:
\- VQAv2 (test): 78.1%.

For detailed performance metrics and additional information, refer to [the model card](<https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD_VISION.md>).

    # Initialize the Together client
    client = Together(api_key = api_key)

    response = client.chat.completions.create(
      model="meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      messages=[
        {
          "role": "user",
          "content": [
            {"type": "text", "text": query},
            {
              "type": "image_url",
              "image_url": {
                "url": f"data:image/jpeg;base64,{RAG.search(query, k=1)[0].base64}",
              },
            },
          ],
        }
      ],
      max_tokens=300,
    )

The `model` parameter specifies the name (model ID) of the desired model to be used. The `messages` parameter defines the input to the model, enabling the combination of text and images in a single query. The `max_tokens` parameter sets the maximum token limit for the model's response.

### b. Wrapping Retrieval and Generation Steps into LangGraph

LangGraph is used to define and connect the retrieval and generation steps in a structured pipeline. For a comprehensive explanation of each component, refer to the this article.

[Financial Assistant for Querying 10-K Reports Powered by a Retrieval-Augmented Generation (RAG)…](</work/financial-assistant-rag-10k-reports/>)

Below is the final code implementation.

    client = Together(api_key = api_key)

    class State(TypedDict):
        question: str
        context: str
        answer: str

    # Step 1: Retrieval Function
    def retrieve(state: State):
        retrieved_image = RAG.search(state["question"], k=1)
        return {"context": retrieved_image[0]}

    # Step 2: Generation Function
    def generate(state: State):
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": state["question"],
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{state['context'].base64}"},
                        },
                    ],
                }
            ],
        )
        return {"answer": response.choices[0].message.content}

    # Define graph
    graph_builder = StateGraph(State)
    graph_builder.add_node(retrieve)
    graph_builder.add_node(generate)
    graph_builder.add_edge(START, "retrieve")
    graph_builder.add_edge("retrieve", "generate")
    graph_builder.add_edge("generate", END)

    # Add memory
    memory = MemorySaver()
    graph = graph_builder.compile(checkpointer=memory)

    # Generate and display the graph
    from IPython.display import Image
    Image(graph.get_graph().draw_mermaid_png())

The graph visualization shows the flow from `START` to `retrieve`, then to `generate`, and finally to `END`.

![](https://cdn-images-1.medium.com/max/110/1*tua3yC1807GmkWZYzp_sDA.png)

### c. Processing User Input and Answering Questions Through the Pipeline

In a real-world system, user input is received and processed to ensure it does not contain harmful or malicious instructions before being sent to the pipeline. For this demonstration, questions from the retrieval testing phase are reused and manually set up. To enhance interpretability, the retrieved page used as context will also be displayed.

The following function combines graph invocation with printing the answer and context:

    def ask_question(question, config):
        response = graph.invoke({"question": question}, config)
        print("Answer:")
        print(response["answer"])
        print("==============================================================================")
        print("Context:")
        print(response["context"])
        print("==============================================================================")
        return response

**First question:**

> "How many Supercharger stations and connectors were added in Q3 2024? How does this compare to Q2 2024 and Q3 2023?"

    question = "How many Supercharger stations and connectors were added in Q3 2024? How does this compare to Q2 2024 and Q3 2023?"
    config = {"configurable": {"thread_id": "1"}}
    ask_question(question, config)

To use the persistence layer added to the graph, which enables the system to maintain memory of the conversation, a thread ID must be included with the message.

Output for the first question:

    Answer:
    To determine the number of Supercharger stations and connectors added in Q3 2024, we will first calculate the increase from Q2 2024 to Q3 2024 and then compare it to Q3 2023.

    **Supercharger Stations Added in Q3 2024**

    *   Total stations in Q3 2024: 6,706
    *   Total stations in Q2 2024: 6,473
    *   Increase in stations from Q2 2024 to Q3 2024: 6,706 - 6,473 = 233

    **Supercharger Connectors Added in Q3 2024**

    *   Total connectors in Q3 2024: 62,421
    *   Total connectors in Q2 2024: 59,596
    *   Increase in connectors from Q2 2024 to Q3 2024: 62,421 - 59,596 = 2,825

    **Comparison to Q3 2023**

    *   Total stations in Q3 2023: 5,595
    *   Total connectors in Q3 2023: 51,105

    In Q3 2024, Tesla added 233 Supercharger stations and 2,825 Supercharger connectors. Compared to Q3 2023, this represents an increase of 1,111 stations and 11,316 connectors.
    ==============================================================================
    Context:
    {'doc_id': 0, 'page_num': 6, 'score': 34.375, 'metadata': {}, 'base64': 'iVBORw0KGg...'}]
    ==============================================================================

Below is the page used as context, which includes a table summarizing operations. The table contains details on supercharger stations and connectors. As demonstrated, all values were extracted accurately, and the model performed reasoning to deliver a comprehensive and correct answer.

![](https://cdn-images-1.medium.com/max/1024/1*8uxRLGWCwJLsTC1KIqDvjw.png)

_Retrieved document page used as context for the user's query 1_

**Second question:**

> "What is Tesla's market share in key regions like the U.S./Canada based on the trailing twelve months (TTM) chart?"

    question = "What is Tesla's market share in key regions like the U.S./Canada based on the trailing twelve months (TTM) chart?"
    config = {"configurable": {"thread_id": "2"}}
    ask_question(question, config)

Output for the second question:

    Answer:
    The graph in this image shows Tesla's market share in regions like the U.S./Canada based on the trailing twelve months (TTM).
    The graph indicates that the Tesla brand has a market share of approximately 4% in the U.S./Canada region.
    ==============================================================================
    Context:
    {'doc_id': 0, 'page_num': 7, 'score': 24.875, 'metadata': {}, 'base64': 'iVBORw0KGg...'}]
    ==============================================================================

For this document page, the question corresponds to the chart in the bottom-right corner. The model utilizes the chart's axes to derive the answer and extracts approximately 4%, which is correct.

![](https://cdn-images-1.medium.com/max/1024/1*OLHgLTgd81cFBBJc_nh6sw.png)

_Retrieved document page used as context for the user's query 2_

These two questions demonstrate that the model can successfully interpret tables and charts, but as with any software system, AI systems require rigorous testing to ensure they meet minimum performance standards. The evaluation process should cover both [**retrieval** and **generation**](<https://docs.confident-ai.com/docs/guides-rag-evaluation>) steps. For a detailed explanation of how to test a RAG system, please refer to this article.

[Financial Assistant for Querying 10-K Reports Powered by a Retrieval-Augmented Generation (RAG)…](</work/financial-assistant-rag-10k-reports/>)

## Conclusion

This article provides an overview of implementing a multimodal Retrieval-Augmented Generation (RAG) system for analyzing complex or scanned PDF files without the need for intricate text extraction and processing pipelines, using Shareholder Slide Decks as an example. The system serves as a prototype for a larger assistant application, demonstrating the capabilities of advanced vision models, and can be extended to additional modalities such as audio and video.

## Pros:

  * **Enhanced Document Scope**: Supports scanned PDFs, tables, and figures, making it highly adaptable for real-world use cases.
  * **Evidence-Based Responses and Up-to-Date Knowledge**: Provides accurate and contextually relevant outputs.
  * **Domain Flexibility**: Integrates domain-specific knowledge without requiring retraining of the LLM.
  * **Flexibility**: ColQwen2 natively accepts dynamic image resolutions, effectively mapping them to the required formats.
  * **Ease and Effectiveness**: A simpler and more efficient alternative to creating custom text extraction pipelines with OCR.

## Cons:

  * **Cost**: API usage can become expensive for large-scale processing.
  * **High Resource Requirements**: Storing embeddings for multimodal data can put significant strain on system resources.
  * **Accuracy Variability**: The quality of Vision Language Model (VLM) outputs is dependent on input quality and the relevance of embeddings.
  * **Language Limitations**: At the moment, only English is supported for text and image inputs in Llama 3.2 90B Vision Instruct Turbo.

## Lessons Learned

  1. **Multimodal Processing**: By integrating visual and textual data, ColPali overcomes the limitations of text-only approaches. This enables accurate retrieval and comprehensive analysis of data-rich documents, significantly broadening the scope of applications for RAG systems.
  2. **VLM Limitations**: Vision Language Models depend on high-quality input. Low-resolution images, poor scans, or inconsistent layouts can significantly reduce their accuracy.
  3. **Cost Considerations**: Multimodal RAG systems require substantial computational resources. High API and embedding storage costs must be carefully managed to ensure efficient large-scale deployment.
  4. **Future Potential**: This prototype highlights opportunities to expand multimodal RAG systems into additional modalities. Incorporating audio from earnings calls, video presentations, and even real-time data feeds could provide a holistic view of complex scenarios.
