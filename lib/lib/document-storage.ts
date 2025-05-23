import type { DocumentAnalysis } from "../types"

// Server-side safe version of the storage service
export class ServerDocumentStorage {
  // In-memory storage for server-side operations
  private static documents: Record<string, DocumentAnalysis> = {}

  // Save a document analysis to storage
  static saveDocument(analysis: DocumentAnalysis): void {
    ServerDocumentStorage.documents[analysis.id] = analysis
  }

  // Get a specific document by ID
  static getDocument(id: string): DocumentAnalysis | null {
    return ServerDocumentStorage.documents[id] || null
  }

  // Delete a document by ID
  static deleteDocument(id: string): boolean {
    if (ServerDocumentStorage.documents[id]) {
      delete ServerDocumentStorage.documents[id]
      return true
    }
    return false
  }
}
