"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Trash2, FileText, UploadIcon } from "lucide-react"
import { format } from "date-fns"
import { DocumentStorage } from "@/lib/document-storage"
import type { DocumentAnalysis } from "@/lib/types"

export function DocumentList() {
  const [documents, setDocuments] = useState<DocumentAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Set isClient to true when component mounts on client
    setIsClient(true)

    // Load documents from storage
    const loadDocuments = () => {
      try {
        const docs = DocumentStorage.getDocuments()
        setDocuments(docs)
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (typeof window !== "undefined") {
      loadDocuments()

      // Set up storage event listener to refresh when documents change
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === DocumentStorage.STORAGE_KEY) {
          loadDocuments()
        }
      }

      window.addEventListener("storage", handleStorageChange)
      return () => window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const handleViewDocument = (documentId: string) => {
    router.push(`/analysis/${documentId}`)
  }

  const handleDeleteDocument = (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      DocumentStorage.deleteDocument(documentId)
      setDocuments(documents.filter((doc) => doc.id !== documentId))
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  const handleUploadNew = () => {
    router.push("/")
  }

  // Helper to truncate long filenames
  const truncateFileName = (name: string, limit = 25) => {
    if (name.length <= limit) return name
    const extension = name.split(".").pop()
    const nameWithoutExt = name.substring(0, name.lastIndexOf("."))
    return `${nameWithoutExt.substring(0, limit - extension!.length - 3)}...${extension}`
  }

  if (!isClient) {
    return <DocumentListSkeleton />
  }

  if (isLoading) {
    return <DocumentListSkeleton />
  }

  if (documents.length === 0) {
    return (
      <Card className="w-full p-8 text-center">
        <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="text-sm text-muted-foreground">
              Upload your first legal document to get started with analysis.
            </p>
          </div>
          <Button onClick={handleUploadNew}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <CardHeader className="bg-muted/40 p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="font-medium truncate" title={doc.documentName}>
                {truncateFileName(doc.documentName)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Language:</span>
                <Badge variant="outline">{doc.language.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm">{format(new Date(doc.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </div>
            <div className="mt-4 pt-2 flex justify-between gap-2">
              <Button size="sm" variant="default" onClick={() => handleViewDocument(doc.id)} className="flex-1">
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc.id)} className="flex-1">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="h-32 bg-muted" />
          <CardContent className="h-24" />
        </Card>
      ))}
    </div>
  )
}
