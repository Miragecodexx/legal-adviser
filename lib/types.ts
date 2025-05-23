export interface DocumentAnalysis {
  id: string
  documentName: string
  language: string
  summary: string
  entities: Entity[]
  keyClauses: Clause[]
  riskAnalysis: Risk[]
  nigerianLawReferences: LegalReference[]
  createdAt: string
}

export interface Entity {
  text: string
  type: string
  relevance?: number
  mentions?: number
}

export interface Clause {
  title: string
  type: string
  content: string
  sentiment?: "positive" | "neutral" | "negative"
  suggestion?: string
  location?: {
    page: number
    paragraph: number
  }
}

export interface Risk {
  title: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  description: string
  recommendation?: string
  relatedClauses?: string[]
}

export interface LegalReference {
  title: string
  type: "STATUTE" | "CASE_LAW" | "REGULATION" | "CONSTITUTION"
  citation: string
  relevance: number
  description: string
}

export interface TranslationResult {
  originalLanguage: string
  translatedLanguage: string
  originalText: string
  translatedText: string
}
