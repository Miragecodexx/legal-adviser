import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container mx-auto py-20 px-4 md:px-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md mx-auto text-center space-y-6">
        <FileQuestion className="h-20 w-20 text-muted-foreground mx-auto" />
        <h1 className="text-3xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  )
}
