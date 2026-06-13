---
title: "Classification of 10-K and 8-K Reports Using Few-Shot Learning"
date: 2024-11-07 20:00
summary: "Document classification with few-shot learning and prompt engineering."
category: "Document AI"
tags: ["few-shot-learning", "10-k", "8-k", "classification"]
type: "article"
status: "current"
source: "Medium"
externalUrl: "https://medium.com/@anastasiia_selezen/classification-of-10-k-and-8-k-reports-using-few-shot-learning-11e99af63784"
legacyUrl: "/classification-of-10-k-and-8-k-reports-using-few-shot-learning.html"
---

![](https://cdn-images-1.medium.com/max/1000/0*LeI9POLkULnJ3S5t)

## Abstract
This blog post explores how to automate the classification of different types of financial reports using Large Language Models, incorporating few-shot in-context learning technique. The focus is on building a solution that can distinguish between 10-K and 8-K filings and efficiently extract valuable information. While information extraction has been described in detail in [earlier blog post](</work/extracting-information-10k-prompt-engineering/>), the main focus here is on classification and integrating all components together.

[Extracting Information from 10-K Reports Using Prompt Engineering](</work/extracting-information-10k-prompt-engineering/>)

## Goals and Requirements
The primary objective of this project is to automate the classification of financial reports -- specifically 10-K and 8-K filings -- and integrate this process with information extraction. The requirements for achieving this goal include:

  * Extracting text from PDF files.
  * Classifying documents into their respective types -- 10-K and 8-K reports.
  * Handling out-of-distribution documents that are neither 10-K nor 8-K reports.
  * Extracting the corresponding information based on the document type.

**Ensuring Accuracy:** Achieving high precision in document classification and data extraction, even with variations in document formats.

**Efficiency:** Extending the number of types of documents processed automatically.

**Scalability:** Providing an easily extendable solution to handle even more types of documents.

## The Technologies
To implement this solution, the following technologies and tools are used:

  * **PyPDF2**: A Python library for reading and manipulating PDF files.
  * **JSON Library**: A Python library for handling JSON data structures.
  * **Enum library:** A Python library for defining a set of named values in a readable and organized format, used to ensure structured output from the generative model.
  * **Google AI Python SDK**: An easy way to use the Gemini API.
  * **Gemini Model (gemini-1.5-pro-latest)**: A generative AI model is used to classify the documents.
  * **Gemini Flash 8B (Experimental) Model**: An advanced 8-billion-parameter language model used for prompt engineering to extract and summarize information.

## Why Use a Large Language Model (LLM)?

The main advantage of an LLM is its extensive out-of-the-box knowledge, enabling the comprehension and interpretation of highly technical and legal language, such as in financial reports. When a sufficient dataset is unavailable, an LLM can be a practical solution. Additionally, LLMs are easily extensible, allowing new classes to be added effortlessly, which is particularly useful when scalability is required.

> However, it is important to consider the costs associated with using APIs or hosting an LLM, compared to creating a dataset and training a simpler model or implementing a rule-based approach if feasible.

## The Solution
### Importing libraries

    import google.generativeai as genai
    from typing import Tuple, Optional
    import PyPDF2
    import json
    import enum

Before proceeding, ensure that the documents are in a machine-readable format. For scanned files, additional processing, such as Optical Character Recognition (OCR), may be required.

### 1. Loading and Reading the PDF

Begin by reading the PDF file using PyPDF2:

    def load_file(file_path: str) -> Tuple[str, str]:
        try:
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text_first_page = pdf_reader.pages[0].extract_text() if pdf_reader.pages else ""
                full_text = "".join([page.extract_text() for page in pdf_reader.pages])

            return (text_first_page, full_text)
        except FileNotFoundError:
            print(f"Error: File not found at {file_path}")
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
        return ""

This function opens the PDF file in binary read mode and extracts text from each page, concatenating it into a single string -- full_text. It also retrieves text from the first page (text_first_page), which will be used for classification purposes.

In case of an error, the function returns empty strings for both outputs.

### 2. Creating the Prompt

To craft the prompt, a technique from in-context learning called **few-shot learning** is used. This method is similar to supervised learning where the model is provided with examples of the classes to distinguish. However, unlike supervised learning, this technique doesn't change the model's weights; it simply instructs the model for a specific task.

The advantage of this approach is that a large dataset is not required, which would be necessary if training even a simpler model from scratch. Instead, only a few examples are needed, and it is easily extendable to new types of documents (classes).

> In scenarios where documents can be easily classified by examining keywords, or when a dataset is already available or simple to compile, alternative approaches such as using rule-based techniques or training a simpler machine learning model (e.g., SVM) might be preferable to reduce the costs associated with using an external API.

Three documents serve as examples for three classes: "10-K," "8-K," and "UNKNOWN." To optimize token usage within the context window, only the first pages of each document are used, based on the assumption that sufficient information is present to establish boundaries between the classes. In the function below, k_10_first_page, _ = load_file(file_10k), the "_" symbol represents a throwaway variable, indicating that the full text of the document is unnecessary for classification.

By introducing the "UNKNOWN" class, it ensures that if a user unintentionally or intentionally uploads a different document than expected, the system won't attempt to extract data from it, preventing any disruption in the workflow.

The files used as examples are: [10-K](<https://www.sec.gov/Archives/edgar/data/1018724/000101872424000008/amzn-20231231.htm>), [8-K](<https://www.sec.gov/Archives/edgar/data/1018724/000101872424000158/amzn-20241031.htm>), [random document](<https://www.sec.gov/Archives/edgar/data/320193/000130817924000010/laapl2024_def14a.htm>).

    def create_prompt_classification(document_first_page: str) -> str:
        file_10k = "amzn-20231231.pdf"
        file_8k = "amzn-20241031.pdf"
        file_random_document = "proxy_statements.pdf"

        k_10_first_page, _ = load_file(file_10k)
        k_8_first_page, _ = load_file(file_8k)
        random_document_first_page, _ = load_file(file_random_document)

        return f"""Please classify the following SEC filing as either a "10-K" or an "8-K" report based on their content.

                  Definitions:
                  - "10-K": An annual report that provides comprehensive information about a company's financial performance, including audited financial statements, management's discussion, and analysis of financial condition.
                  - "8-K": A current report filed to announce major events that shareholders should know about, such as significant acquisitions, bankruptcy, leadership changes, or other important events.

                  Instructions:
                  - Analyze the content of the document.
                  - Look for indicators such as section headings, keywords, and the nature of the information presented.
                  - Classification classes: "10-K" or "8-K".
                  - In case you identify that document is neither 10-K nor 8-K classify it as "UNKNOWN".

                  Example 1:
                  Document 1:
                  {k_10_first_page}
                  Classification: 10-K

                  Example 2:
                  Document 2:
                  {k_8_first_page}
                  Classification: 8-K

                  Example 3:
                  Document 3:
                  {random_document_first_page}
                  Classification: UNKNOWN

                  Now classify this document:
                  Document:
                  {document_first_page}
                  Classification:
               """

This prompt instructs the AI model on exactly how to distinguish between different classes, what to do if a document does not fall into one of the predefined classes, and the expected format of the response.

### 3. Loading AI Model

Make sure to install google-generativeai library:

    pip install -U -q google-generativeai

    def load_model(model_name: str):
        try:
            genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
            return genai.GenerativeModel(model_name=model_name)
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")
        return None

Create your API key in Google AI Studio [here](<https://aistudio.google.com/app/apikey>). Set it as an environment variable.

    import os
    os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY"

### 4. Classify Documents

Compile the document_classification function, which utilizes the previously defined functions to classify the document:

    class ReportType(enum.Enum):
        K_10 = "10-K"
        K_8 = "8-K"
        UNKNOWN = "UNKNOWN"

    def document_classification(document: str, model_name: str) -> Optional[str]:
        model = load_model(model_name)
        if not model:
            return None

        prompt = create_prompt_classification(document)
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="text/x.enum",
                    response_schema=ReportType
                )
            )
            return response.text
        except Exception as e:
            print(f"Error generating content for document classification: {e}")
        return None

To ensure that the model consistently returns the expected output, the generation_config is passed with response_mime_type="text/x.enum", and a schema is defined using the enum class ReportType to limit the outputs to the predefined classes. This approach provides control over the model's output and helps maintain consistency.

> Please note that "text/x.enum" is a special MIME type provided by Google AI API, enabling the return of enum response types. Refer to [the documentation](<https://ai.google.dev/gemini-api/docs/structured-output?lang=python>) for more details. Solutions for other models may vary.

In order to optimize costs, it is advisable to use a smaller model for classification. Since only the first page of the document is used (assuming it contains sufficient information for classification), a large context window is unnecessary. Therefore, the model "gemini-1.5-pro-latest" is suitable for this case.

Here is how the execution of the code implemented so far looks:

[10-K report:](<https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm>)

    model_name = "gemini-1.5-pro-latest"
    document_first_page, document_full_text = load_file("aapl-20230930.pdf")
    document_type = document_classification(document_first_page, model_name)
    print(document_type)

    '10-K'

[8-K report:](<https://www.sec.gov/Archives/edgar/data/320193/000032019324000067/aapl-20240502.htm>)

    document_first_page, document_full_text = load_file("aapl-20240502.pdf")
    document_type = document_classification(document_first_page, model_name)
    print(document_type)

    '8-K'

[Other type of report(10-Q):](<https://www.sec.gov/Archives/edgar/data/320193/000032019324000006/aapl-20231230.htm>)

    document_first_page, document_full_text = load_file("10q/aapl-20231230.pdf")
    document_type = document_classification(document_first_page, model_name)
    print(document_type)

    'UNKNOWN'

### 5. Prepare for Information Extraction

With classification in place, the next step is to combine it with previous work on information extraction:

[Extracting Information from 10-K Reports Using Prompt Engineering](</work/extracting-information-10k-prompt-engineering/>)

Based on the classification results, the appropriate prompt for information extraction should be executed. Detailed instructions on how to create such prompts are explained in the post linked above. Below is a prompt for 8-K reports, and the function get_extraction_prompt will create a prompt according to the document type.

    def create_prompt_8k_extract_info(text: str) -> str:
        return """You are reading an 8-K report. Extract the following information:
        1. **Company Name**:
        Extract the full name of the company that filed the report.

        2. **Date of Report**:
        Extract the date listed as the 'Date of Report'.

        3. **Ticker Symbol**:
        Extract the stock ticker symbol associated with the company.

        4. **Event Descriptions**:
        Provide a brief description of the significant events reported in the document, highlighting key actions or updates.

        Please return JSON using the following schema:
        {
          "Company Name": str,
          "Date of Report": str,
          "Ticker Symbol": str,
          "Event Descriptions": str
        }
    """ + text

    def get_extraction_prompt(document_type: str, document_text: str) -> Optional[str]:
        if document_type == ReportType.K_10.value:
            return create_prompt_10k_extract_info(document_text)
        elif document_type == ReportType.K_8.value:
            return create_prompt_8k_extract_info(document_text)
        elif document_type == ReportType.UNKNOWN.value:
            return None
        return None

To ensure that the appropriate prompt is used based on the document type, the get_extraction_prompt function checks the classification result and returns the corresponding prompt for information extraction.

### 6. Extract Information

This function is described in detail in the post linked above but is now extended to handle the UNKNOWN class:

    def information_extraction(prompt: str, model_name: str) -> Optional[str]:
        if not prompt:
            return f"Error: Invalid prompt, document type in {ReportType.UNKNOWN.value}"

        model = load_model(model_name)
        if not model:
            return None

        try:
            response = model.generate_content(
                prompt,
                generation_config={'response_mime_type': 'application/json'}
            )
            return json.dumps(json.loads(response.text), indent=4)
        except Exception as e:
            print(f"Error extracting information: {e}")
        return None

Here is how the results of the code execution look:

    # Set models to use
    classification_model = "gemini-1.5-pro-latest"
    extraction_model = "models/gemini-1.5-flash-8b-exp-0924"

[10-K report:](<https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm>)

    file_name = "aapl-20230930.pdf"
    document_classif, document = load_file(file_name)
    document_type = document_classification(document_classif, classification_model)
    print(document_type)
    extraction_prompt = get_extraction_prompt(document_type, document)
    result = information_extraction(extraction_prompt, extraction_model)
    print(result)

    10-K
    {
        "Company Name": "Apple Inc.",
        "Filing Date": "November 2, 2023",
        "Total Revenue": "383,285",
        "Net Income": "96,995",
        "Research and Development (R&D) Spending": "29,915",
        "Risk Factors": "Apple's operations and performance depend significantly on global and regional economic conditions. Adverse macroeconomic conditions (e.g., slow growth, recession, inflation, tighter credit) can negatively impact consumer spending and demand for Apple's products and services.  Political events, international disputes, war, terrorism, natural disasters, and public health issues can disrupt global commerce and negatively affect Apple and its supply chain. Restrictions on international trade (e.g., tariffs) can limit the company's ability to operate and distribute its products.  Apple faces intense competition, with competitors often focusing on aggressive pricing and imitating products.  Apple relies on outsourcing for manufacturing and logistics, which can create supply chain risks.  Manufacturing disruptions due to natural or man-made disasters, or issues with suppliers, can also materially impact the company.  Apple's products are subject to design and manufacturing defects, which could negatively affect reputation, lead to recalls, and result in product liability claims.  The availability of third-party software for Apple's products is a significant factor in customer demand.  Changes in tax rates and the adoption of new tax legislation can create uncertainty and potential increased tax liabilities.  The price of Apple's stock is subject to volatility, which can be affected by various factors unrelated to operational performance.",
        "Executive Officers": [
            "Timothy D. Cook",
            "Luca Maestri",
            "Deirdre O\u2019Brien",
            "Jeff Williams"
        ],
        "Management Discussion and Analysis": "Apple's total net sales decreased 3% in 2023 compared to 2022. The primary driver of this decrease was the weakness in foreign currencies relative to the U.S. dollar, particularly affecting Mac and iPhone sales.  However, Service revenues increased.  Key product and service announcements in 2023 included new iPads, Apple TV 4K, HomePods, MacBook models, Apple Vision Pro, and updates to Apple's operating systems.  Apple increased its quarterly dividend and initiated a new share repurchase program in 2023. Macroeconomic conditions (inflation, interest rates, currency fluctuations) impacted Apple's operating performance and financial condition.  Specific segment performance varied, with decreases in sales in the Americas, Europe, Greater China, and Japan, offset by growth in Rest of Asia Pacific.  Product categories also saw varying results, with declines in Mac and some wearables categories partially offset by Service growth."
    }

[8-K report:](<https://www.sec.gov/Archives/edgar/data/320193/000032019324000067/aapl-20240502.htm>)

    file_name = "aapl-20240201.pdf"
    document_classif, document = load_file(file_name)
    document_type = document_classification(document_classif, classification_model)
    print(document_type)
    extraction_prompt = get_extraction_prompt(document_type, document)
    result = information_extraction(extraction_prompt, extraction_model)
    print(result)

    8-K
    {
        "Company Name": "Apple Inc.",
        "Date of Report": "February 1, 2024",
        "Ticker Symbol": "AAPL",
        "Event Descriptions": "On February 1, 2024, Apple Inc. issued a press release regarding Apple's financial results for its first fiscal quarter ended December 30, 2023. A copy of the press release is attached as Exhibit 99.1."
    }

[Other type of report(10-Q):](<https://www.sec.gov/Archives/edgar/data/320193/000032019324000006/aapl-20231230.htm>)

    file_name = "aapl-20231230.pdf"
    document_classif, document = load_file(file_name)
    document_type = document_classification(document_classif, classification_model)
    print(document_type)
    extraction_prompt = get_extraction_prompt(document_type, document)
    result = information_extraction(extraction_prompt, extraction_model)
    print(result)

    UNKNOWN
    Error: Invalid prompt, document type in UNKNOWN

### 7. Testing and Evaluating Accuracy

This section covers the process of evaluating the accuracy of classification. Methods for evaluating information extraction have already been described in the previously mentioned [blog post](</work/extracting-information-10k-prompt-engineering/>).

To evaluate model performance, a testing dataset is required. For illustrative purposes, a small test dataset has been created, consisting of 33 examples: 15 for 10-K reports, 15 for 8-K reports, and 3 examples of other types of reports. As the intended goal is to upload only the corresponding reports, the number of "UNKNOWN" examples has been kept lower to reflect real-life distribution.

    import pandas as pd

    test_data = pd.read_csv("test_data.csv", sep=";")
    test_data.Type.value_counts()

    Type
    10-K       15
    8-K        15
    UNKNOWN     3
    Name: count, dtype: int64

![](https://cdn-images-1.medium.com/max/255/1*o-_G6rFKSgf_mq6iU7NLlg.png)

_Snippet of testing dataset_

Along with the true labels, model predictions are also necessary. To obtain these, document classification should be run on all documents in the test dataset, with the predictions saved in a separate file.

    y_pred = []
    for file_name in val_data["Name"]:
        document_classificatiion, _ = load_file(file_name)
        y_pred.append(document_classification(document_classificatiion, classification_model))

    test_data["Prediction"] = y_pred
    test_data.to_csv("predictions.csv", index=False)

![](https://cdn-images-1.medium.com/max/354/1*sVLdB-ZHokcg71isAKxRnQ.png)

_Snippet of testing dataset with model predictions_

With all the necessary data collected, evaluation metrics such as Precision, Recall, and F1 Score can be computed using the scikit-learn library.

> It is important to convert the values of labels and predictions into numerical representations to accurately calculate these metrics.

    from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
    from sklearn.preprocessing import LabelEncoder

    y_true = test_data["Type"].values
    y_pred = test_data["Prediction"].values

    # Encode values to numbers
    label_encoder = LabelEncoder()
    y_true_labels = label_encoder.fit_transform(y_true)
    y_pred_labels = label_encoder.transform(y_pred)

    precision = precision_score(y_true, y_pred, average='weighted')
    recall = recall_score(y_true, y_pred, average='weighted')
    f1 = f1_score(y_true, y_pred, average='weighted')

    print("Precision:", precision)
    print("Recall:", recall)
    print("F1-Score:", f1)

    Precision: 1.0
    Recall: 1.0
    F1-Score: 1.0

The results indicate 100% performance across all metrics, which is a rare occurrence. However, given the use of a highly powerful model, such outcomes are possible.

Additionally, a confusion matrix can be constructed to display the number of correct and incorrect predictions made by the model, categorized by each class.

    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay

    conf_matrix = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=conf_matrix, display_labels=["10-K", "8-K", "UNKNOWN"])
    disp.plot(cmap='Greens', colorbar=False)

    plt.title('Confusion Matrix', fontsize=14)
    plt.xlabel('Predicted Labels', fontsize=12)
    plt.ylabel('True Labels', fontsize=12)
    plt.xticks(fontsize=10)
    plt.yticks(fontsize=10)
    plt.grid(False)
    plt.show()

![](https://cdn-images-1.medium.com/max/591/1*Q6jYOpk5XyKn2Nf2U5IIDA.png)

  * Rows represent the **true labels** (actual class).
  * Columns represent the **predicted labels** (model's predictions).

All examples were correctly classified into their respective classes.

## Conclusion

The article presents a detailed process for automating the classification of SEC filings (10-K and 8-K reports) using Large Language Models (LLMs) and few-shot learning. It highlights the use of cutting-edge generative models, efficient prompt engineering techniques, and practical integration of information extraction.

### Pros
  * **Efficiency**: High classification performance was achieved without the need for extensive labeled datasets.
  * **Scalability**: The solution can be easily adapted to classify other document types or additional categories.
  * **Reduced Development Time**: Eliminates the need for model training.

### Cons
  * **Cost**: API usage can be expensive for large-scale processing.
  * **Limited to Machine-Readable PDFs**: The approach assumes documents are machine-readable, potentially adding complexity if OCR is required for scanned documents.
  * **Data Privacy**: Sending sensitive financial data to cloud-based models may raise security and compliance concerns.

### Lessons Learned
  1. **Prompt Engineering is important**: The performance of generative models heavily depends on the clarity and precision of prompts. Well-crafted prompts are essential for achieving consistent and reliable outcomes.
  2. **Importance of Error Handling**: Establishing mechanisms, such as the UNKNOWN class, enhances system robustness and workflow efficiency.
  3. **Using Enum for structuring the output is essential** to ensure consistent and predictable model results, facilitating effective integration with other systems.
  4. **Balancing Costs and Performance**: While LLMs simplify implementation, simpler models or rule-based systems may be preferable for cost-sensitive projects.
