import type { DocumentAnalysis } from "./types"
import { config } from "./config"
import { handleError } from "./error-handler"

// Simple document storage service using localStorage
export class DocumentStorage {
  static STORAGE_KEY = config.storage.documentKey

  // Save a document analysis to storage
  static saveDocument(analysis: DocumentAnalysis): void {
    try {
      if (typeof window === "undefined") {
        return
      }

      // Get existing documents
      const documents = this.getDocuments()

      // Add or update the document
      const existingIndex = documents.findIndex((doc) => doc.id === analysis.id)
      if (existingIndex >= 0) {
        documents[existingIndex] = analysis
      } else {
        documents.push(analysis)
      }

      // Save back to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents))

      // Dispatch storage event to notify other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: this.STORAGE_KEY,
          newValue: JSON.stringify(documents),
        }),
      )
    } catch (error) {
      throw handleError(error, {
        operation: "saveDocument",
        documentId: analysis.id,
      })
    }
  }

  // Get all documents from storage
  static getDocuments(): DocumentAnalysis[] {
    try {
      if (typeof window === "undefined") {
        return []
      }

      const storedData = localStorage.getItem(this.STORAGE_KEY)
      return storedData ? JSON.parse(storedData) : []
    } catch (error) {
      throw handleError(error, { operation: "getDocuments" })
    }
  }

  // Get a specific document by ID
  static getDocument(id: string): DocumentAnalysis | null {
    try {
      if (typeof window === "undefined") {
        return null
      }

      const documents = this.getDocuments()
      return documents.find((doc) => doc.id === id) || null
    } catch (error) {
      throw handleError(error, { operation: "getDocument", documentId: id })
    }
  }

  // Delete a document by ID
  static deleteDocument(id: string): boolean {
    try {
      if (typeof window === "undefined") {
        return false
      }

      const documents = this.getDocuments()
      const filteredDocuments = documents.filter((doc) => doc.id !== id)

      if (documents.length === filteredDocuments.length) {
        return false // Document not found
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredDocuments))

      // Dispatch storage event to notify other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: this.STORAGE_KEY,
          newValue: JSON.stringify(filteredDocuments),
        }),
      )

      return true
    } catch (error) {
      throw handleError(error, { operation: "deleteDocument", documentId: id })
    }
  }

  // Clear all documents
  static clearDocuments(): void {
    try {
      if (typeof window === "undefined") {
        return
      }

      localStorage.removeItem(this.STORAGE_KEY)

      // Dispatch storage event to notify other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: this.STORAGE_KEY,
          newValue: null,
        }),
      )
    } catch (error) {
      throw handleError(error, { operation: "clearDocuments" })
    }
  }
}

// Server-side storage service using global cache
export class ServerDocumentStorage {
  private static cache: Map<string, DocumentAnalysis> = new Map()

  // Save a document analysis to storage
  static saveDocument(analysis: DocumentAnalysis): void {
    try {
      this.cache.set(analysis.id, analysis)
    } catch (error) {
      throw handleError(error, {
        operation: "serverSaveDocument",
        documentId: analysis.id,
      })
    }
  }

  // Get a specific document by ID
  static getDocument(id: string): DocumentAnalysis | null {
    try {
      return this.cache.get(id) || null
    } catch (error) {
      throw handleError(error, {
        operation: "serverGetDocument",
        documentId: id,
      })
    }
  }

  // Delete a document by ID
  static deleteDocument(id: string): boolean {
    try {
      return this.cache.delete(id)
    } catch (error) {
      throw handleError(error, {
        operation: "serverDeleteDocument",
        documentId: id,
      })
    }
  }

  // Get all documents
  static getAllDocuments(): DocumentAnalysis[] {
    try {
      return Array.from(this.cache.values())
    } catch (error) {
      throw handleError(error, { operation: "serverGetAllDocuments" })
    }
  }
}
