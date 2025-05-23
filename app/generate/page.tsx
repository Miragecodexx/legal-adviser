import { Suspense } from "react"
import { DocumentGenerationForm } from "@/components/document-generation-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

export default function GeneratePage() {
  return (
    <main className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col items-center space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Legal Document Generator</h1>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            Generate custom legal documents tailored to Nigerian law. Specify your requirements and get a document draft
            in seconds.
          </p>
        </div>

        <Alert className="max-w-3xl">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>API Information</AlertTitle>
          <AlertDescription>
            This feature uses Groq's API for document generation. To enable full functionality, ensure the Groq API key
            is properly configured as an environment variable. Without a key, the system will operate in demo mode with
            template-based documents.
          </AlertDescription>
        </Alert>

        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Document Generation</CardTitle>
            <CardDescription>
              Enter your document requirements below. Be as specific as possible about the clauses and terms you need.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormSkeleton />}>
              <DocumentGenerationForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-10 w-32 ml-auto" />
    </div>
  )
}
