"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DocumentAnalysis } from "@/lib/types"
import { DocumentStorage } from "@/lib/document-storage"
import { getUserFriendlyErrorMessage } from "@/lib/error-handler"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Download, FileText, ImportIcon as Translate } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useLanguageStore } from "@/lib/stores/language-store"

interface AnalysisResultsProps {
  analysis: DocumentAnalysis
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [displayLanguage, setDisplayLanguage] = useState(analysis.language)
  const [translatedContent, setTranslatedContent] = useState<{
    summary?: string
    clauseContents?: Record<number, string>
    riskDescriptions?: Record<number, string>
    referenceDescriptions?: Record<number, string>
  }>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { language } = useLanguageStore()
  const [isDragging, setIsDragging] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<{ [key: string]: boolean }>({})
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Save analysis to local storage when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        DocumentStorage.saveDocument(analysis)
      } catch (err) {
        console.error("Error saving document to storage:", err)
      }
    }
  }, [analysis])

  // Sync documents with server on component mount
  useEffect(() => {
    const syncDocuments = async () => {
      try {
        // Get all documents from client storage
        const clientDocs = DocumentStorage.getDocuments()
        
        // Send to server
        await fetch("/api/documents/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(clientDocs),
        })

        // Get all documents from server
        const response = await fetch("/api/documents/sync")
        if (!response.ok) {
          throw new Error("Failed to sync with server")
        }

        const serverDocs = await response.json()
        
        // Update client storage with server documents
        serverDocs.forEach((doc: DocumentAnalysis) => {
          DocumentStorage.saveDocument(doc)
        })
      } catch (err) {
        console.error("Error syncing documents:", err)
      }
    }

    syncDocuments()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadResults = () => {
    const jsonString = JSON.stringify(analysis, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${analysis.documentName.split(".")[0]}-analysis.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLanguageChange = async (language: string) => {
    if (language === analysis.language) {
      setDisplayLanguage(language)
      setTranslatedContent({})
      return
    }

    setIsTranslating(true)
    setDisplayLanguage(language)
    setError(null)

    try {
      // Translate summary
      const summaryResponse = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: analysis.summary,
          fromLanguage: analysis.language,
          toLanguage: language,
        }),
      })

      if (!summaryResponse.ok) {
        throw new Error("Failed to translate summary")
      }

      const summaryData = await summaryResponse.json()
      const translatedSummary = summaryData.translatedText

      // Initialize containers for translated content
      const clauseContents: Record<number, string> = {}
      const riskDescriptions: Record<number, string> = {}
      const referenceDescriptions: Record<number, string> = {}

      // Translate key clauses (in parallel)
      await Promise.all(
        analysis.keyClauses.map(async (clause, index) => {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: clause.content,
              fromLanguage: analysis.language,
              toLanguage: language,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to translate clause ${index}`)
          }

          const data = await response.json()
          clauseContents[index] = data.translatedText
        }),
      )

      // Translate risk descriptions (in parallel)
      await Promise.all(
        analysis.riskAnalysis.map(async (risk, index) => {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: risk.description,
              fromLanguage: analysis.language,
              toLanguage: language,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to translate risk ${index}`)
          }

          const data = await response.json()
          riskDescriptions[index] = data.translatedText
        }),
      )

      // Translate reference descriptions (in parallel)
      await Promise.all(
        analysis.nigerianLawReferences.map(async (ref, index) => {
          const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: ref.description,
              fromLanguage: analysis.language,
              toLanguage: language,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to translate reference ${index}`)
          }

          const data = await response.json()
          referenceDescriptions[index] = data.translatedText
        }),
      )

      setTranslatedContent({
        summary: translatedSummary,
        clauseContents,
        riskDescriptions,
        referenceDescriptions,
      })
    } catch (err) {
      console.error("Translation error:", err)
      setError(getUserFriendlyErrorMessage(err))
    } finally {
      setIsTranslating(false)
    }
  }

  const handleGenerateDocument = async () => {
    setIsGeneratingDocument(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${analysis.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document: analysis }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate document")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `${analysis.documentName.split(".")[0]}-modified.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error generating document:", err)
      setError(getUserFriendlyErrorMessage(err))
    } finally {
      setIsGeneratingDocument(false)
    }
  }

  const getSummary = () => {
    return translatedContent.summary || analysis.summary
  }

  const getClauseContent = (index: number) => {
    return translatedContent.clauseContents?.[index] || analysis.keyClauses[index].content
  }

  const getRiskDescription = (index: number) => {
    return translatedContent.riskDescriptions?.[index] || analysis.riskAnalysis[index].description
  }

  const getReferenceDescription = (index: number) => {
    return translatedContent.referenceDescriptions?.[index] || analysis.nigerianLawReferences[index].description
  }

  // Calculate overall risk level based on analysis
  const calculateOverallRisk = () => {
    const highRisks = analysis.riskAnalysis.filter((risk) => risk.severity === "HIGH").length
    const mediumRisks = analysis.riskAnalysis.filter((risk) => risk.severity === "MEDIUM").length

    if (highRisks > 1) return "HIGH"
    if (highRisks === 1 || mediumRisks > 2) return "MEDIUM"
    return "LOW"
  }

  const overallRisk = calculateOverallRisk()

  if (!isClient) {
    return <AnalysisSkeleton />
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Document Actions */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold">{analysis.documentName}</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={displayLanguage} onValueChange={handleLanguageChange} disabled={isTranslating}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="yo">Yoruba</SelectItem>
              <SelectItem value="ha">Hausa</SelectItem>
              <SelectItem value="ig">Igbo</SelectItem>
              <SelectItem value="pcm">Nigerian Pidgin</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadResults}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleGenerateDocument} disabled={isGeneratingDocument}>
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingDocument ? "Generating..." : "Generate Document"}
          </Button>
        </div>
      </div>

      {isTranslating && (
        <Alert>
          <Translate className="h-4 w-4" />
          <AlertTitle>Translating Content</AlertTitle>
          <AlertDescription>
            Please wait while we translate the content to {displayLanguage.toUpperCase()}...
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  overallRisk === "HIGH" ? "bg-red-500" : overallRisk === "MEDIUM" ? "bg-yellow-500" : "bg-green-500"
                }`}
              ></div>
              <h2 className="text-lg font-semibold">Document Risk Level: {overallRisk}</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1">
                <Badge variant="destructive">{analysis.riskAnalysis.filter((r) => r.severity === "HIGH").length}</Badge>
                <span className="text-sm">High Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="default">{analysis.riskAnalysis.filter((r) => r.severity === "MEDIUM").length}</Badge>
                <span className="text-sm">Medium Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline">{analysis.riskAnalysis.filter((r) => r.severity === "LOW").length}</Badge>
                <span className="text-sm">Low Risk</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Analysis Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="clauses">Key Clauses</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="references">Legal References</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="prose max-w-none">
                <p>{getSummary()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-4">
          {analysis.keyClauses.map((clause, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{clause.title}</h3>
                    <Badge variant="outline">{clause.type}</Badge>
                  </div>
                  <div className="prose max-w-none">
                    <p>{getClauseContent(index)}</p>
                  </div>
                  {clause.suggestion && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <h4 className="text-sm font-semibold text-amber-800">Suggested Improvement</h4>
                      <p className="text-sm text-amber-700">{clause.suggestion}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analysis.entities.map((entity, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{entity.text}</h3>
                    <Badge variant="outline">{entity.type}</Badge>
                  </div>
                  {entity.relevance && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Relevance: </span>
                      <span className="text-xs font-medium">{(entity.relevance * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          {analysis.riskAnalysis.map((risk, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{risk.title}</h3>
                    <Badge
                      variant={
                        risk.severity === "HIGH" ? "destructive" : risk.severity === "MEDIUM" ? "default" : "outline"
                      }
                    >
                      {risk.severity} RISK
                    </Badge>
                  </div>
                  <div className="prose max-w-none">
                    <p>{getRiskDescription(index)}</p>
                  </div>
                  {risk.recommendation && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-semibold text-blue-800">Recommendation</h4>
                      <p className="text-sm text-blue-700">{risk.recommendation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="references" className="space-y-4">
          {analysis.nigerianLawReferences.map((reference, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{reference.title}</h3>
                    <Badge variant="outline">{reference.type}</Badge>
                  </div>
                  <div className="text-sm font-medium">Citation: {reference.citation}</div>
                  <div className="prose max-w-none">
                    <p>{getReferenceDescription(index)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <Skeleton className="h-24 w-full" />

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
