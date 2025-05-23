"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { FileText, UploadIcon, AlertCircle, Folder } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguageStore } from "@/lib/stores/language-store"
import { getUserFriendlyErrorMessage } from "@/lib/error-handler"

export function Upload() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { language } = useLanguageStore()
  const [isDragging, setIsDragging] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<{ [key: string]: boolean }>({})
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    setError(null)

    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: File[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        // Check file type
        const validTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ]
        if (!validTypes.includes(file.type)) {
          setError("Please upload only PDF, DOCX, or TXT files")
          continue
        }

        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError("One or more files exceed the 10MB limit")
          continue
        }

        newFiles.push(file)
      }

      setFiles((prevFiles) => [...prevFiles, ...newFiles])
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const newFiles: File[] = []

      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i]
        // Check file type
        const validTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ]
        if (!validTypes.includes(file.type)) {
          setError("Please upload only PDF, DOCX, or TXT files")
          continue
        }

        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError("One or more files exceed the 10MB limit")
          continue
        }

        newFiles.push(file)
      }

      setFiles((prevFiles) => [...prevFiles, ...newFiles])
    }
  }, [])

  const handleUpload = async () => {
    if (!files.length) return

    try {
      setUploading(true)
      setProgress(0)
      setDebugInfo(null)
      setError(null)

      const processedFiles = []

      // Process files one by one
      for (const file of files) {
        setProcessingFiles((prev) => ({ ...prev, [file.name]: true }))
        setProgress(25) // Start progress

        // Create form data
        const formData = new FormData()
        formData.append("file", file)
        formData.append("language", language)

        setProgress(50) // Mid progress

        // Send to API
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || "Failed to analyze document"
          if (errorData.details) {
            console.error("Analysis details:", errorData.details)
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        if (!data.documentId) {
          throw new Error("Invalid response from server: missing document ID")
        }

        const documentId = data.documentId

        console.log("Document analyzed with ID:", documentId)
        setDebugInfo(`Document ID: ${documentId}`)
        setProgress(75) // Almost done

        processedFiles.push(documentId)
        setProcessingFiles((prev) => ({ ...prev, [file.name]: false }))
      }

      setUploading(false)
      setProgress(100)

      // Redirect based on number of files processed
      if (processedFiles.length === 1) {
        console.log(`Redirecting to analysis page for document ID: ${processedFiles[0]}`)
        router.push(`/analysis/${processedFiles[0]}`)
      } else if (processedFiles.length > 1) {
        router.push(`/documents`)
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(getUserFriendlyErrorMessage(err))
      setUploading(false)
      setProgress(0)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed ${
          isDragging ? "border-primary bg-primary/5" : "border-gray-300"
        } rounded-lg p-12 bg-gray-50 transition-colors duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <Folder className="h-12 w-12 text-gray-400" />
          <div className="space-y-1">
            <p className="text-sm text-gray-500">
              {files.length > 0
                ? `${files.length} file(s) selected`
                : "Drag and drop your documents, or click to browse"}
            </p>
            <p className="text-xs text-gray-400">PDF, DOCX, or TXT up to 10MB</p>
          </div>
          <Input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            multiple
            disabled={uploading}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={uploading}
          >
            Select Files
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-medium">Selected Files:</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center">
                  {processingFiles[file.name] && (
                    <span className="text-xs text-muted-foreground mr-2">Processing...</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {uploading && <Progress value={progress} className="h-2" />}

          <Button className="w-full" onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? "Processing..." : `Analyze ${files.length > 1 ? "Documents" : "Document"}`}
            {!uploading && <UploadIcon className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
