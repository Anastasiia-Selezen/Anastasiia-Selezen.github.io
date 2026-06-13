---
title: "Extracting Information from 10-K Reports Using Prompt Engineering"
date: 2024-10-28 20:00
summary: "Extracting information from financial reports with prompt engineering."
category: "Document AI"
tags: ["prompt-engineering", "10-k", "financial-ai", "document-ai"]
type: "article"
status: "current"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/extracting-information-from-10-k-reports-using-prompt-engineering-927f9138ef10"
legacyUrl: "/extracting-information-from-10-k-reports-using-prompt-engineering.html"
---

![](https://cdn-images-1.medium.com/max/1024/0*kX5qM5gt6Byrsopo)

## Abstract

As the volume of information grows tremendously every day, there is a need to process this information more effectively. In this post, a simple method to extract financial and managerial information from 10-K reports using LLM and prompt engineering is presented.

## Goal and requirements

The primary goal of this project is to automate the extraction of specific information from 10-K reports, which are comprehensive annual filings by public companies. The requirements include:

**Extracting Specific Data Fields:**

  * Company Name
  * Filing Date
  * Total Revenue
  * Net Income
  * Research and Development (R&D) Spending
  * Risk Factors
  * Executive Officers (as a list)
  * Management Discussion and Analysis

The extracted data should be structured in JSON format for easy integration with other systems or for further analysis.

**Ensuring Accuracy:** Achieving high precision in data extraction despite variations in document formats.

**Efficiency:** Reducing the time and effort compared to manual data extraction.

## The Technologies

To accomplish the objectives, a combination of the following technologies is utilized:

  * **PyPDF2**: A Python library for reading and manipulating PDF files.
  * **JSON Library**: A Python library for handling JSON data structures.
  * **Google AI Python SDK**: An easy way to use the Gemini API.
  * **Gemini Flash 8B (Experimental) Model**: An advanced 8-billion-parameter language model used for prompt engineering to extract and summarize information.

### Why Use a Large Language Model (LLM)?

Since 10-K reports vary in format and terminology, a large language model's understanding of context and language is important. LLMs have the ability to interpret the different ways companies present similar information, considering variations in wording and structure.

### Why Gemini 1.5 Flash-8B?

Free of Charge Rate Limits:

  * 1,000,000 tokens/minute
  * 1,500 requests/day
  * 15 requests/minute

Given that 10-K reports tend to be long -- around 100 pages -- it makes sense to consider an appropriate context window. Not all models can accept such lengthy text; also, using Retrieval-Augmented Generation (RAG) with models that have smaller context windows may be considered.

## The Solution

The solution involves several steps:

A prerequisite for the first step is ensuring documents are in a machine-readable format. For scanned files, additional processing, such as OCR, may be required.

## 1. Loading and Reading the PDF

Start by reading the PDF file using PyPDF2:

    import PyPDF2

    def load_file(file_path):
        pdfFile = open(file_path, 'rb')
        pdfReader = PyPDF2.PdfReader(pdfFile)

        text = ""
        for page in pdfReader.pages:
            text += page.extract_text()
        return text

This function opens the PDF file in binary read mode and extracts text from each page, concatenating it into a single string.

## 2. Creating the Prompt

Craft a detailed prompt to guide the model in extracting the information:

    def create_prompt(text):
        return """You are reading a 10-K report. Extract the following information:

                1. **Company Name**:
                Extract the name of the company that filed the report.

                2. **Filing Date**:
                Extract the date the report was filed.

                3. **Total Revenue**:
                Extract the total revenue for the most recent fiscal year in millions, extract the exact number.

                4. **Net Income**:
                Extract the net income or net loss for the most recent fiscal year in millions, extract the exact number.

                5. **Research and Development (R&D) Spending**:
                Extract the total amount spent on research and development in millions, extract the exact number.

                6. **Risk Factors**:
                Provide a brief summary of the main risk factors mentioned in the report.

                7. **Executive Officers**:
                Extract the names and titles of the company's key executive officers.

                8. **Management Discussion and Analysis**:
                Provide a brief summary of the key points from the management's discussion of financial condition and future outlook.

                Please return JSON using the following schema:
                {
                  "Company Name": str,
                  "Filing Date": str,
                  "Total Revenue": str,
                  "Net Income": str,
                  "Research and Development (R&D) Spending": str,
                  "Risk Factors": str,
                  "Executive Officers": list of str,
                  "Management Discussion and Analysis": str
                }

        """+text

This prompt instructs the AI model on exactly what information to extract and the format to return it in.

## 3. Configuring and Loading the AI Model

Configure the AI model:

    pip install -U -q google-generativeai

    import google.generativeai as genai

    def load_model(model_name):
        genai.configure(api_key=GOOGLE_API_KEY)
        return genai.GenerativeModel(model_name=model_name)

In this case 'models/gemini-1.5-flash-8b-exp-0924' is used. You can create your API key in Google AI Studio [here](<https://aistudio.google.com/app/apikey>).

## 4. Extracting Information

Bring it all together in the information_extraction function:

    import json

    def information_extraction(file, model_name):
        text = load_file(file)
        prompt = create_prompt(text)
        model = load_model(model_name)
        response = model.generate_content(
            prompt,
            generation_config={'response_mime_type': 'application/json'}
        )
        return json.dumps(json.loads(response.text), indent=4)

This function reads a PDF, constructs a prompt, invokes the AI model, and returns the extracted information as a formatted JSON string.

To ensure the output is in a structured format, it's important to enforce constraints on the model's response. There are several options to achieve this. If using Gemini models, the generation configuration can be set accordingly, as shown in the example above. Alternatively, a more generic approach is to use the [Instructor framework](<https://python.useinstructor.com/>), which is built on top of Pydantic, to ensure structured output.

Result output for this [Document](<https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm>):

    {
        "Company Name": "Apple Inc.",
        "Filing Date": "November 2, 2023",
        "Total Revenue": "383,285",
        "Net Income": "96,995",
        "Research and Development (R&D) Spending": "29,915",
        "Risk Factors": "Apple's operations and performance depend significantly on global and regional economic conditions, and adverse economic conditions can materially adversely affect the company's business, results of operations, and financial condition.  Competition in global markets for its products and services is highly competitive, characterized by aggressive price competition and resulting downward pressure on gross margins, frequent introduction of new products and services, short product life cycles, evolving industry standards, continual improvement in product price and performance characteristics, rapid adoption of technological advancements by competitors, and price sensitivity on the part of consumers and businesses.  The company faces substantial risks related to its global supply chain, including reliance on single or limited sources for components, potential manufacturing or logistics disruptions, and the impact of geopolitical events, trade disputes, natural disasters, and public health issues. The company is exposed to risks associated with design and manufacturing defects, intellectual property infringement, and dependence on third-party software developers.  Furthermore, the company faces significant legal and regulatory compliance risks, including antitrust investigations, privacy and data security regulations, and the impact of environmental, social, and governance considerations.",
        "Executive Officers": [
            "Timothy D. Cook",
            "Luca Maestri",
            "Deirdre O'Brien",
            "Jeff Williams"
        ],
        "Management Discussion and Analysis": "Apple's total net sales decreased 3% to $383.3 billion in 2023 compared to 2022, primarily due to lower sales of Mac and iPhone products, partially offset by higher sales of Services.  The weakening of foreign currencies relative to the U.S. dollar was a major factor in the decrease. The company announced various new products, services, and software updates during fiscal year 2023, including the iPhone 15, Apple Watch Series 9, and Apple Vision Pro.  The company raised its quarterly dividend and announced a new share repurchase program. Macroeconomic conditions, including inflation and currency fluctuations, have impacted and may continue to impact the company's operating results.  Segment performance varied, with some showing decreases due to currency headwinds, while others saw modest increases.  Products gross margin decreased in 2023, while Services gross margin increased. Operating expenses, including R&D and SG&A, also showed growth, with R&D expense increases primarily due to headcount-related costs. The company's liquidity and capital resources are considered sufficient for the next 12 months. The company has material cash requirements, including outstanding debt, lease payments, manufacturing obligations, and other purchase obligations."
    }

## 5. Testing and Ensuring Accuracy

As with any software system, AI models must undergo rigorous testing to ensure they meet minimum performance requirements. In this case, since the domain is financial, the accuracy of the output is critical. This use case involves both text extraction and text summarization.

Text extraction can be evaluated using established metrics such as ROUGE, which is relatively straightforward. However, summarization presents additional challenges. A commonly used method for evaluating summarizations is the "LLM judge" approach.

[DeepEval](<https://docs.confident-ai.com/>), an open-source framework, provides a robust solution for evaluating summarization quality, using models from OpenAI . It focuses on two main criteria: factual alignment with the original text and inclusion of key information. For evaluation, both the original text and the summary generated by the LLM are required.

    from deepeval.metrics import SummarizationMetric
    from deepeval.test_case import LLMTestCase

    input = """
    Risk Factors
    The Company's business, reputation, results of operations, financial condition and stock price can be affected by a number of factors, whether currently known or unknown, including those described below. When any one or more of these risks materialize from time to time, the Company's business, reputation, results of operations, financial condition and stock price can be materially and adversely affected.
    ...
    """

    actual_output="""
    Apple's operations and performance depend significantly on global and regional economic conditions,
    ...
    """

    test_case = LLMTestCase(input=input, actual_output=actual_output)
    metric = SummarizationMetric(threshold=0.5)

    metric.measure(test_case)
    print(metric.score_breakdown)

    {'Alignment': 0.625, 'Coverage': 0.8}

In this example, the scores include measures of alignment and coverage. A detailed analysis of alignment verdicts can pinpoint where differences occur between the summary and the original text, while coverage verdicts ensure that the most important information is preserved.

    metric.alignment_verdicts

    [SummarizationAlignmentVerdict(verdict='yes', reason=None),
     SummarizationAlignmentVerdict(verdict='yes', reason=None),
     SummarizationAlignmentVerdict(verdict='yes', reason=None),
     SummarizationAlignmentVerdict(verdict='yes', reason=None),
     SummarizationAlignmentVerdict(verdict='idk', reason='The original text does not mention frequent introduction of new products and services, short product life cycles, evolving industry standards, continual improvement in product price and performance characteristics, rapid adoption of technological advancements, or price sensitivity.'),
     SummarizationAlignmentVerdict(verdict='yes', reason=None),
     SummarizationAlignmentVerdict(verdict='idk', reason='The original text does not mention design and manufacturing defects, intellectual property infringement, or dependence on third-party software developers.'),
     SummarizationAlignmentVerdict(verdict='idk', reason='The original text does not specifically mention antitrust investigations, privacy and data security regulations, or the impact of environmental, social, and governance considerations.')]

Aligment verdicts are tested against claims in the summary you can check it with:

    metric.claims

    ["Apple's operations and performance depend significantly on global and regional economic conditions.",
     "Adverse economic conditions can materially adversely affect Apple's business, results of operations, and financial condition.",
     "Competition in global markets for Apple's products and services is highly competitive.",
     "Competition is characterized by aggressive price competition and resulting downward pressure on gross margins.",
     "Competition involves frequent introduction of new products and services, short product life cycles, evolving industry standards, continual improvement in product price and performance characteristics, rapid adoption of technological advancements by competitors, and price sensitivity on the part of consumers and businesses.",
     "Apple faces substantial risks related to its global supply chain, including reliance on single or limited sources for components, potential manufacturing or logistics disruptions, and the impact of geopolitical events, trade disputes, natural disasters, and public health issues.",
     "Apple is exposed to risks associated with design and manufacturing defects, intellectual property infringement, and dependence on third-party software developers.",
     "Apple faces significant legal and regulatory compliance risks, including antitrust investigations, privacy and data security regulations, and the impact of environmental, social, and governance considerations."]

Coverage verdicts are tested agains questions:

    metric.coverage_verdicts

    [SummarizationCoverageVerdict(summary_verdict='yes', original_verdict='yes', question="Can adverse economic conditions materially adversely affect the Company's business?"),
     SummarizationCoverageVerdict(summary_verdict='no', original_verdict='yes', question='Does the Company rely on international operations for a majority of its total net sales?'),
     SummarizationCoverageVerdict(summary_verdict='yes', original_verdict='yes', question="Can political events and trade disputes disrupt the Company's operations?"),
     SummarizationCoverageVerdict(summary_verdict='yes', original_verdict='yes', question="Are the Company's products and services offered in highly competitive global markets?"),
     SummarizationCoverageVerdict(summary_verdict='yes', original_verdict='yes', question='Is the Company subject to complex and changing laws and regulations worldwide?')]

For task of exact text extraction, a testing dataset with predefined ground truth labels is required. These labels should represent the correct, expected output for each piece of extracted text, serving as a benchmark to evaluate the accuracy of the extraction.

Stability across varying but semantically similar prompts is also essential for understanding how prompt adjustments affect outcomes.

Finally, for high-stakes data, human verification of extracted content, at least during the initial phase, helps catch errors and refine the model's performance.

## Conclusion

By utilizing advanced AI models, it is possible to create powerful tools that transform unstructured data into actionable insights. This could be part of a larger system that helps to manage information easily and effectively.

## Pros:
  * **Automation**: Reduces manual effort in data extraction.
  * **Scalability**: Can process multiple reports efficiently.
  * **Accuracy**: Leverages advanced AI for precise information retrieval.
  * **Flexibility**: Easily adaptable to extract different types of information.

## Cons:
  * **Dependency on AI Model**: Requires access to Google's Generative AI, which may involve costs or significant computational resources in case of self-hosting.
  * **Potential Errors**: AI models might occasionally misinterpret data, especially with poorly formatted PDFs, which may require manual verification for critical data.
  * **API Limits**: Usage might be limited by API quotas or rate limits.

## Lessons Learned

  * **Prompt Engineering is important.** Creating a precise prompt is critical for guiding an LLM to extract relevant information. Specific details, like formatting requirements and exact data points, lead to better results.
  * **The quality of the data Matters.** Clean and well-extracted text from PDFs improves results.
  * **Choosing the model that suits the purpose of the system.** Taking in the account not only technical aspects like context window size, accuracy, ability to reason on the complex texts, but also consider data privacy and costs of usage (API costs vs self-hosting costs).
  * **Testing and ensuring reliability of the system is important.**
  * **The use of JSON for structuring the output** is essential for integrating the extracted data with other systems and implementing further analysis.
