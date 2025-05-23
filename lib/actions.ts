"use server"
import type { DocumentAnalysis, TranslationResult, Entity, Clause } from "./types"
import { generateWithGroq, groqAvailable } from "./groq"
import { ServerDocumentStorage } from "./lib/document-storage"

console.log("Server actions module initialized")

export async function analyzeDocument(formData: FormData): Promise<string> {
  try {
    const file = formData.get("file") as File
    const language = (formData.get("language") as string) || "en"

    if (!file) {
      throw new Error("No file provided")
    }

    // Generate a unique ID for the document
    const documentId = generateId()
    const documentText = await extractTextFromFile(file)

    // Translate if not in English
    let textForAnalysis = documentText
    let translationResult: TranslationResult | null = null

    if (language !== "en") {
      translationResult = await translateText(documentText, language, "en")
      textForAnalysis = translationResult.translatedText
    }

    // Process with Groq
    const analysis = await processDocumentWithGroq(documentId, file.name, textForAnalysis, language, translationResult)

    // Store in our server-side storage
    ServerDocumentStorage.saveDocument(analysis)
    console.log(`Document analyzed and stored with ID: ${documentId}`)

    return documentId
  } catch (error) {
    console.error("Error analyzing document:", error)
    throw new Error("Failed to analyze document")
  }
}

export async function getDocumentAnalysis(id: string): Promise<DocumentAnalysis | null> {
  console.log(`Attempting to retrieve analysis for ID: ${id}`)

  // Check if the ID exists in our storage
  const analysis = ServerDocumentStorage.getDocument(id)

  if (analysis) {
    console.log(`Analysis found for ID: ${id}`)
    return analysis
  }

  console.log(`Analysis not found for ID: ${id}`)

  // If not found in storage, provide a sample document for testing purposes
  if (process.env.NODE_ENV === "development") {
    console.log("Providing sample document for development")
    return createSampleDocumentAnalysis(id)
  }

  return null
}

export async function updateDocumentAnalysis(
  id: string,
  updates: Partial<DocumentAnalysis>,
): Promise<DocumentAnalysis | null> {
  try {
    const analysis = ServerDocumentStorage.getDocument(id)
    if (!analysis) {
      console.log(`No analysis found to update for ID: ${id}`)
      return null
    }

    const updatedAnalysis = {
      ...analysis,
      ...updates,
    }

    ServerDocumentStorage.saveDocument(updatedAnalysis)
    console.log(`Analysis updated for ID: ${id}`)
    return updatedAnalysis
  } catch (error) {
    console.error("Error updating document analysis:", error)
    return null
  }
}

export async function translateAnalysisContent(
  content: string,
  fromLanguage: string,
  toLanguage: string,
): Promise<string> {
  if (fromLanguage === toLanguage) {
    return content
  }

  try {
    const result = await translateText(content, fromLanguage, toLanguage)
    return result.translatedText
  } catch (error) {
    console.error("Translation error:", error)
    return content
  }
}

export async function generateDocument(analysisId: string): Promise<Blob> {
  try {
    const analysis = ServerDocumentStorage.getDocument(analysisId)
    if (!analysis) {
      throw new Error("Analysis not found")
    }

    // Generate document content
    const docContent = await generateDocumentContent(analysis)

    // Convert to DOCX format (simulated)
    const docBlob = new Blob([docContent], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })

    return docBlob
  } catch (error) {
    console.error("Error generating document:", error)
    throw new Error("Failed to generate document")
  }
}

export async function generateLegalDocument(documentSpec: {
  type: string
  requirements: string
  parties?: string
  title?: string
}): Promise<{ document: string; title: string }> {
  try {
    const { type, requirements, parties, title } = documentSpec

    // Check if Groq is available
    if (!groqAvailable) {
      console.log("Groq API not available, using demo mode for document generation")
      return generateDemoDocument(documentSpec)
    }

    const prompt = `
You are a Nigerian legal expert specializing in contract and legal document drafting.

Create a detailed, concrete legal document in Nigerian legal context with the following specifications:

TYPE OF DOCUMENT: ${type}
${title ? `SUGGESTED TITLE: ${title}` : ""}
${parties ? `PARTIES INVOLVED:\n${parties}` : ""}

REQUIREMENTS/SPECIFICATIONS:
${requirements}

Please generate a complete, properly formatted legal document that:
1. Is fully compliant with Nigerian law with specific references to relevant statutes and sections
2. Includes all necessary sections and clauses for this type of document with proper numbering
3. References relevant Nigerian legislation with specific section numbers and case law where appropriate
4. Uses proper legal language and formatting with defined terms
5. Is professional and ready for review by legal counsel

The document MUST include:
- Proper document title and reference number
- Date and place of execution with specific format
- Proper identification of all parties with full legal names and addresses
- Recitals/background section with specific facts and circumstances
- All relevant clauses based on the requirements with proper numbering (1.1, 1.2, etc.)
- Specific remedies for breach with exact procedures
- Governing law and jurisdiction clause with specific reference to Nigerian courts
- Signature blocks for all parties with witness provisions
- Any schedules or appendices as needed with proper formatting

If any information is missing or unclear, make reasonable assumptions that would be standard in Nigerian legal practice, but make them specific and concrete.

Assume the document will be governed by Nigerian law and jurisdiction.
`

    const text = await generateWithGroq(prompt, {
      temperature: 0.5,
      maxTokens: 4000,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    })

    // Extract a reasonable title for the document
    let documentTitle = title || `${type.charAt(0).toUpperCase() + type.slice(1)}`

    // Try to extract title from the generated document
    const firstLine = text.split("\n")[0]
    if (firstLine && firstLine.trim().length > 0) {
      documentTitle = firstLine.trim()
    }

    return {
      document: text,
      title: documentTitle,
    }
  } catch (error) {
    console.error("Error generating legal document:", error)
    throw new Error(`Failed to generate legal document: ${error.message}`)
  }
}

// Generate demo documents when no API is available
function generateDemoDocument(documentSpec: {
  type: string
  requirements: string
  parties?: string
  title?: string
}): { document: string; title: string } {
  const { type, requirements, parties, title } = documentSpec

  // Create a document title
  const documentTitle = title || `${type.charAt(0).toUpperCase() + type.slice(1)} Agreement`

  // Get current date for the document
  const currentDate = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Extract party names or use placeholders
  let partyA = "COMPANY A"
  let partyB = "COMPANY B"

  if (parties) {
    const partyLines = parties.split("\n")
    if (partyLines.length >= 1) {
      const match = partyLines[0].match(/([^,]+)/)
      if (match) partyA = match[1].trim()
    }
    if (partyLines.length >= 2) {
      const match = partyLines[1].match(/([^,]+)/)
      if (match) partyB = match[1].trim()
    }
  }

  // Generate a sample document based on the type
  let documentText = ""

  switch (type.toLowerCase()) {
    case "contract":
    case "agreement":
      documentText = `
${documentTitle.toUpperCase()}

THIS AGREEMENT is made this ${currentDate}

BETWEEN:

${partyA} (hereinafter referred to as "the First Party")

AND

${partyB} (hereinafter referred to as "the Second Party")

WHEREAS:

1. The parties wish to enter into an agreement regarding ${requirements.substring(0, 100)}...
2. Both parties have agreed to the terms set forth in this document.

NOW THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. INTERPRETATION
   1.1 In this Agreement, unless the context otherwise requires:
       "Agreement" means this agreement including any schedules attached hereto;
       "Effective Date" means the date first written above;
       "Nigerian Law" means the laws of the Federal Republic of Nigeria.

2. SCOPE OF AGREEMENT
   2.1 The parties agree to ${requirements.substring(0, 150)}...
   2.2 This agreement shall be governed by Nigerian law, particularly the Contract Law of Nigeria.

3. TERM AND TERMINATION
   3.1 This Agreement shall commence on the Effective Date and shall continue until terminated in accordance with the provisions contained herein.
   3.2 Either party may terminate this Agreement by giving thirty (30) days written notice to the other party.

4. GOVERNING LAW
   4.1 This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
   4.2 Any dispute arising out of or in connection with this Agreement shall be referred to arbitration under the Arbitration and Conciliation Act, Cap A18, Laws of the Federation of Nigeria, 2004.

IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first above written.

SIGNED for and on behalf of ${partyA}:

________________________
Name:
Position:
Date:

SIGNED for and on behalf of ${partyB}:

________________________
Name:
Position:
Date:

WITNESSES:

1. ________________________
   Name:
   Address:

2. ________________________
   Name:
   Address:
`
      break

    case "mou":
      documentText = `
MEMORANDUM OF UNDERSTANDING

THIS MEMORANDUM OF UNDERSTANDING is made this ${currentDate}

BETWEEN:

${partyA} (hereinafter referred to as "the First Party")

AND

${partyB} (hereinafter referred to as "the Second Party")

1. PURPOSE
   This Memorandum of Understanding ("MOU") sets forth the understanding and intentions of the parties regarding ${requirements.substring(0, 100)}...

2. SCOPE
   The parties intend to ${requirements.substring(0, 150)}...

3. NON-BINDING NATURE
   This MOU is not intended to create legal relations between the parties or be legally enforceable, except for the provisions relating to confidentiality and governing law.

4. CONFIDENTIALITY
   The parties agree to maintain the confidentiality of any information shared during the course of this MOU.

5. GOVERNING LAW
   This MOU shall be governed by the laws of the Federal Republic of Nigeria.

SIGNED for and on behalf of ${partyA}:

________________________
Name:
Position:
Date:

SIGNED for and on behalf of ${partyB}:

________________________
Name:
Position:
Date:
`
      break

    case "letter":
      documentText = `
[LETTERHEAD]

${currentDate}

${partyB}
[Address]

Dear Sir/Madam,

RE: ${documentTitle}

I write on behalf of ${partyA} regarding ${requirements.substring(0, 100)}...

${requirements.substring(0, 200)}...

In accordance with Nigerian law, specifically [relevant Nigerian law], we hereby request that you [specific action required].

Please do not hesitate to contact us if you require any clarification on the above.

Yours faithfully,

________________________
For: ${partyA}
Name:
Position:
`
      break

    case "clause":
      documentText = `
LEGAL CLAUSE

${documentTitle}

${requirements.substring(0, 300)}...

This clause shall be interpreted in accordance with the laws of the Federal Republic of Nigeria, particularly [relevant Nigerian law].

Any dispute arising from this clause shall be resolved through arbitration in accordance with the Arbitration and Conciliation Act, Cap A18, Laws of the Federation of Nigeria, 2004.
`
      break

    default:
      documentText = `
${documentTitle.toUpperCase()}

THIS DOCUMENT is created on ${currentDate}

This document addresses the following requirements:

${requirements}

The content of this document is governed by the relevant laws of the Federal Republic of Nigeria.

[This is a demo document generated without API access. For a complete legal document, please configure the Groq API key.]
`
  }

  return {
    document: documentText,
    title: documentTitle,
  }
}

// Helper functions
async function extractTextFromFile(file: File): Promise<string> {
  // In a real application, you would extract text based on file type
  // For this demo, we'll return a mock Nigerian legal text
  return `
    COMPANIES AND ALLIED MATTERS ACT, 2020
    
    ARRANGEMENT OF SECTIONS
    
    PART A—CORPORATE AFFAIRS COMMISSION
    
    1. Establishment of the Corporate Affairs Commission.
    2. Establishment of Governing Board of the Commission.
    3. Tenure of office.
    4. Remuneration and allowances.
    5. Functions of the Commission.
    6. Powers of the Commission.
    7. Appointment of Registrar-General.
    8. Appointment of staff.
    9. Right to request for information.
    10. Fund of the Commission.
    11. Expenditure of the Commission.
    12. Annual accounts, audit and estimates.
    13. Annual report.
    
    PART B—INCORPORATION OF COMPANIES AND INCIDENTAL MATTERS
    
    CHAPTER 1—FORMATION OF COMPANY
    
    14. Right to form a company.
    15. Partnership, etc., of more than 20 members when permitted.
    16. Capacity of individual to form company.
    17. Types of companies.
    18. Private company.
    19. Restriction on the transfer of shares by a private company.
    20. Consequences of default in complying with conditions constituting a private company.
    21. Public company.
    22. Unlimited company.
    23. Company limited by guarantee.
    24. Prohibited associations.
    
    CHAPTER 2—MEMORANDUM AND ARTICLES OF ASSOCIATION
    
    25. Requirements with respect to the memorandum of a company.
    26. Form of memorandum.
    27. Restriction on alteration of memorandum.
    28. Alteration of memorandum.
    29. Power to alter conditions in memorandum which could have been contained in articles.
    30. Articles for regulating companies.
    31. Form and contents of articles.
    32. Company limited by guarantee.
    33. Effect of memorandum and articles.
    34. Effect of altered memorandum and articles on members.
    35. Member's right to copies of memorandum, etc.
    36. Copies of memorandum issued to embody alterations.
  `
}

async function translateText(text: string, fromLanguage: string, toLanguage: string): Promise<TranslationResult> {
  // Use Groq for translation
  try {
    if (groqAvailable) {
      const prompt = `
        Translate the following text from ${fromLanguage} to ${toLanguage}. 
        Maintain all legal terminology and formatting.
        
        Text to translate:
        ${text}
        
        Translated text:
      `

      const translatedText = await generateWithGroq(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      })

      return {
        originalLanguage: fromLanguage,
        translatedLanguage: toLanguage,
        originalText: text,
        translatedText,
      }
    } else {
      // Demo translation - just return the original text with a note
      return {
        originalLanguage: fromLanguage,
        translatedLanguage: toLanguage,
        originalText: text,
        translatedText: `[Translation from ${fromLanguage} to ${toLanguage} would appear here. Configure Groq API for actual translation.]
        
        ${text}`,
      }
    }
  } catch (error) {
    console.error("Translation error:", error)
    throw new Error("Failed to translate text")
  }
}

// New function to extract entities using Groq
async function extractEntitiesWithGroq(text: string): Promise<Entity[]> {
  if (!groqAvailable) {
    return [
      { text: "Corporate Affairs Commission", type: "ORGANIZATION", relevance: 0.92 },
      { text: "Registrar-General", type: "PERSON", relevance: 0.87 },
      { text: "Nigeria", type: "LOCATION", relevance: 0.95 },
      { text: "2020", type: "DATE", relevance: 0.93 },
    ]
  }

  try {
    const prompt = `
      You are a legal entity extraction expert. Extract named entities from the following legal text.
      Focus on organizations, people, locations, dates, and legal terms.
      
      For each entity, provide:
      1. The exact text of the entity
      2. The type (ORGANIZATION, PERSON, LOCATION, DATE, LEGAL_TERM)
      3. A relevance score between 0 and 1
      
      Format your response as a JSON array:
      [
        {"text": "entity text", "type": "ENTITY_TYPE", "relevance": 0.95},
        ...
      ]
      
      Text:
      ${text.substring(0, 3000)}
    `

    const response = await generateWithGroq(prompt, {
      temperature: 0.2,
      maxTokens: 1000,
    })

    try {
      const entities = JSON.parse(response)
      return entities
    } catch (error) {
      console.error("Error parsing entity extraction response:", error)
      return []
    }
  } catch (error) {
    console.error("Error extracting entities:", error)
    return []
  }
}

// New function to extract clauses using Groq
async function extractClausesWithGroq(text: string): Promise<Clause[]> {
  if (!groqAvailable) {
    return [
      {
        title: "Establishment of the Corporate Affairs Commission",
        type: "ADMINISTRATIVE",
        content:
          "1. Establishment of the Corporate Affairs Commission - This section establishes the Corporate Affairs Commission as the primary regulatory body for company registration and administration in Nigeria.",
        sentiment: "neutral",
      },
      {
        title: "Right to Form a Company",
        type: "RIGHTS",
        content:
          "14. Right to form a company - Any two or more persons may form and incorporate a company by complying with the requirements of this Act in respect of registration of the company.",
        sentiment: "positive",
      },
    ]
  }

  try {
    const prompt = `
      You are a legal clause extraction expert. Extract key clauses from the following legal text.
      For each clause, provide:
      1. A concise title
      2. The type of clause (e.g., RIGHTS, RESTRICTION, ADMINISTRATIVE, OBLIGATION)
      3. The exact content of the clause
      4. The sentiment (positive, neutral, negative)
      
      Format your response as a JSON array:
      [
        {
          "title": "clause title",
          "type": "clause type",
          "content": "clause content",
          "sentiment": "sentiment"
        },
        ...
      ]
      
      Extract up to 5 key clauses.
      
      Text:
      ${text.substring(0, 3000)}
    `

    const response = await generateWithGroq(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    })

    try {
      const clauses = JSON.parse(response)
      return clauses
    } catch (error) {
      console.error("Error parsing clause extraction response:", error)
      return []
    }
  } catch (error) {
    console.error("Error extracting clauses:", error)
    return []
  }
}

async function processDocumentWithGroq(
  id: string,
  documentName: string,
  text: string,
  originalLanguage: string,
  translationResult: TranslationResult | null,
): Promise<DocumentAnalysis> {
  try {
    // Step 1: Extract entities using Groq
    const entities = await extractEntitiesWithGroq(text)

    // Step 2: Extract clauses using Groq
    const clauses = await extractClausesWithGroq(text)

    // Step 3: Use Groq for higher-level analysis
    let summary = "Document summary not available. Configure Groq API for full analysis."
    let riskAnalysis = []
    let nigerianLawReferences = []

    if (groqAvailable) {
      // Generate summary, risk analysis, and law references using Groq
      const analysisPrompt = `
You are a Nigerian legal document analyzer with expertise in Nigerian law. Analyze the following legal document and provide:

1. A detailed, concrete summary (max 300 words) that captures the key legal implications
2. Specific risk analysis with severity levels, including exact references to problematic clauses
3. Precise Nigerian law references (statutes, case law, regulations, constitution) with section numbers and years

Focus specifically on Nigerian legal context, including:
- Nigerian Companies and Allied Matters Act (CAMA) with specific sections
- Nigerian Constitution articles and sections
- Nigerian case law precedents with citation details
- Nigerian regulatory frameworks with specific regulations

Your analysis must be concrete, specific, and actionable, not general or vague.

Format your response as JSON with the following structure:
{
  "summary": "...",
  "riskAnalysis": [{"title": "...", "severity": "HIGH/MEDIUM/LOW", "description": "...", "recommendation": "...", "relatedClauses": ["..."]}],
  "nigerianLawReferences": [{"title": "...", "type": "STATUTE/CASE_LAW/REGULATION/CONSTITUTION", "citation": "...", "relevance": 0.9, "description": "..."}]
}

Document:
${text.substring(0, 3000)}
`

      const analysisText = await generateWithGroq(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 2000,
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Using Llama 4 Scout for better analysis
      })

      try {
        // Parse the JSON response
        const analysisData = JSON.parse(analysisText)
        summary = analysisData.summary
        riskAnalysis = analysisData.riskAnalysis || []
        nigerianLawReferences = analysisData.nigerianLawReferences || []
      } catch (parseError) {
        console.error("Error parsing Groq response:", parseError)
        // Extract summary using a simple approach if JSON parsing fails
        summary = analysisText.split("\n").slice(0, 3).join(" ").substring(0, 200)
      }
    } else {
      // Create demo data for risk analysis and law references
      riskAnalysis = [
        {
          title: "Non-compliance with Commission Requirements",
          severity: "HIGH",
          description:
            "Failure to comply with the Corporate Affairs Commission requirements could lead to significant penalties or dissolution of the company.",
          recommendation: "Ensure regular compliance checks and timely filing of all required documents.",
          relatedClauses: ["Establishment of the Corporate Affairs Commission", "Powers of the Commission"],
        },
        {
          title: "Improper Share Transfer",
          severity: "MEDIUM",
          description:
            "Improper transfer of shares in private companies could lead to legal disputes and regulatory sanctions.",
          recommendation:
            "Establish clear share transfer protocols in company articles and follow prescribed procedures.",
          relatedClauses: ["Private Company Restrictions"],
        },
      ]

      nigerianLawReferences = [
        {
          title: "Companies and Allied Matters Act",
          type: "STATUTE",
          citation: "CAMA 2020",
          relevance: 0.98,
          description:
            "The primary legislation governing company registration, administration, and winding up in Nigeria, enacted in 2020 to replace the 1990 Act.",
        },
        {
          title: "Constitution of the Federal Republic of Nigeria",
          type: "CONSTITUTION",
          citation: "1999 Constitution (as amended)",
          relevance: 0.75,
          description:
            "The fundamental law of Nigeria that provides the framework for business operations and legal entities.",
        },
      ]

      // Generate a simple summary
      summary =
        "This document appears to contain sections of the Companies and Allied Matters Act (CAMA) 2020, which is the primary legal framework for the regulation of companies in Nigeria. It outlines the establishment of the Corporate Affairs Commission, its powers and functions, and various types of companies that can be registered under Nigerian law."
    }

    // Format clauses to match our expected structure
    const keyClauses = clauses.map((clause) => {
      // Add suggestions to some clauses
      const shouldAddSuggestion = clause.sentiment === "negative" || Math.random() > 0.7
      return {
        ...clause,
        suggestion: shouldAddSuggestion
          ? `Consider revising this clause to provide more clarity and balance between parties.`
          : undefined,
      }
    })

    return {
      id,
      documentName,
      language: originalLanguage,
      summary,
      entities,
      keyClauses,
      riskAnalysis,
      nigerianLawReferences,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error processing document with Groq:", error)

    // Return fallback data in case of error
    return {
      id,
      documentName,
      language: originalLanguage,
      summary: "Failed to generate summary. Please try again.",
      entities: [],
      keyClauses: [],
      riskAnalysis: [],
      nigerianLawReferences: [],
      createdAt: new Date().toISOString(),
    }
  }
}

async function generateDocumentContent(analysis: DocumentAnalysis): Promise<string> {
  try {
    if (groqAvailable) {
      const prompt = `
        You are a legal document generator. Generate a clean, well-formatted legal document based on the following analysis.
        The document should incorporate all the key clauses, with any suggested improvements applied.
        
        Document Name: ${analysis.documentName}
        Language: ${analysis.language}
        
        Analysis: ${JSON.stringify({
          summary: analysis.summary,
          keyClauses: analysis.keyClauses,
        })}
        
        Generate a complete, professional legal document in plain text format that would be suitable for conversion to PDF.
        Use proper legal formatting, numbering, and structure.
      `

      return await generateWithGroq(prompt, {
        temperature: 0.2,
        maxTokens: 4000,
        model: "mixtral-8x7b-32768", // Using Mixtral for longer document generation
      })
    } else {
      // Generate a simple document based on the analysis
      const clauses = analysis.keyClauses
        .map((clause) => {
          // Apply any suggestions if available
          const content = clause.suggestion ? `${clause.content}\n\n[IMPROVED: ${clause.suggestion}]` : clause.content

          return `${clause.title.toUpperCase()}\n\n${content}`
        })
        .join("\n\n")

      const documentContent = `
DOCUMENT: ${analysis.documentName}
DATE: ${new Date().toLocaleDateString()}
SUMMARY: ${analysis.summary}

${clauses}

LEGAL REFERENCES:
${analysis.nigerianLawReferences.map((ref) => `- ${ref.title} (${ref.citation}): ${ref.description}`).join("\n")}

[This document was generated in demo mode. Configure Groq API for more detailed document generation.]
`
      return documentContent
    }
  } catch (error) {
    console.error("Error generating document content:", error)
    throw new Error("Failed to generate document content")
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Function to generate a sample document analysis for testing
function createSampleDocumentAnalysis(id: string): DocumentAnalysis {
  return {
    id,
    documentName: "Sample-CAMA-Document.pdf",
    language: "en",
    summary:
      "This document contains the first sections of the Companies and Allied Matters Act (CAMA) 2020, which is the primary legal framework for the regulation of companies in Nigeria. It outlines the establishment of the Corporate Affairs Commission, its powers and functions, and various types of companies that can be registered under Nigerian law.",
    entities: [
      { text: "Corporate Affairs Commission", type: "ORGANIZATION", relevance: 0.92 },
      { text: "Registrar-General", type: "PERSON", relevance: 0.87 },
      { text: "Nigeria", type: "LOCATION", relevance: 0.95 },
      { text: "2020", type: "DATE", relevance: 0.93 },
    ],
    keyClauses: [
      {
        title: "Establishment of the Corporate Affairs Commission",
        type: "ADMINISTRATIVE",
        content:
          "1. Establishment of the Corporate Affairs Commission - This section establishes the Corporate Affairs Commission as the primary regulatory body for company registration and administration in Nigeria.",
        sentiment: "neutral",
      },
      {
        title: "Right to Form a Company",
        type: "RIGHTS",
        content:
          "14. Right to form a company - Any two or more persons may form and incorporate a company by complying with the requirements of this Act in respect of registration of the company.",
        sentiment: "positive",
      },
      {
        title: "Private Company Restrictions",
        type: "RESTRICTION",
        content:
          "19. Restriction on the transfer of shares by a private company - A private company shall restrict the transfer of its shares in the manner prescribed under this Act.",
        sentiment: "negative",
        suggestion:
          "Consider adding specific conditions under which share transfers may be permitted to provide clarity to shareholders.",
      },
    ],
    riskAnalysis: [
      {
        title: "Non-compliance with Commission Requirements",
        severity: "HIGH",
        description:
          "Failure to comply with the Corporate Affairs Commission requirements could lead to significant penalties or dissolution of the company.",
        recommendation: "Ensure regular compliance checks and timely filing of all required documents.",
        relatedClauses: ["Establishment of the Corporate Affairs Commission", "Powers of the Commission"],
      },
      {
        title: "Improper Share Transfer",
        severity: "MEDIUM",
        description:
          "Improper transfer of shares in private companies could lead to legal disputes and regulatory sanctions.",
        recommendation:
          "Establish clear share transfer protocols in company articles and follow prescribed procedures.",
        relatedClauses: ["Private Company Restrictions"],
      },
    ],
    nigerianLawReferences: [
      {
        title: "Companies and Allied Matters Act",
        type: "STATUTE",
        citation: "CAMA 2020",
        relevance: 0.98,
        description:
          "The primary legislation governing company registration, administration, and winding up in Nigeria, enacted in 2020 to replace the 1990 Act.",
      },
      {
        title: "Constitution of the Federal Republic of Nigeria",
        type: "CONSTITUTION",
        citation: "1999 Constitution (as amended)",
        relevance: 0.75,
        description:
          "The fundamental law of Nigeria that provides the framework for business operations and legal entities.",
      },
    ],
    createdAt: new Date().toISOString(),
  }
}
