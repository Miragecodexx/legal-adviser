import { Suspense } from "react"
import { AnalysisResults } from "@/components/analysis-results"
import { Skeleton } from "@/components/ui/skeleton"
import { getDocumentAnalysis } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface AnalysisPageProps {
  params: {
    id: string
  }
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  try {
    console.log("Fetching analysis for ID:", params.id)
    const analysis = await getDocumentAnalysis(params.id)

    if (!analysis) {
      console.log("Analysis not found for ID:", params.id)
      return (
        <div className="container mx-auto py-10 px-4 md:px-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Not Found</AlertTitle>
            <AlertDescription>
              The document analysis you're looking for could not be found. It may have been deleted or the analysis ID
              is incorrect.
            </AlertDescription>
          </Alert>
          <div className="text-center mt-8">
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      )
    }

    console.log("Analysis found:", analysis.documentName)
    return (
      <main className="container mx-auto py-10 px-4 md:px-6">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter">Document Analysis</h1>
            <p className="text-muted-foreground mt-2">Analysis results for {analysis.documentName}</p>
          </div>

          <Suspense fallback={<AnalysisSkeleton />}>
            <AnalysisResults analysis={analysis} />
          </Suspense>
        </div>
      </main>
    )
  } catch (error) {
    console.error("Error retrieving analysis:", error)
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Analysis</AlertTitle>
          <AlertDescription>
            There was a problem loading the document analysis. Please try again or analyze a new document.
          </AlertDescription>
        </Alert>
        <div className="text-center mt-8">
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    )
  }
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
