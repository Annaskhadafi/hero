import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function CareerSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="text-3xl font-bold tracking-tight">Application Submitted!</h1>
        <p className="text-muted-foreground">
          Thank you for applying. We have received your application and your CV. Our HR team will review it and get back to you if your profile matches our requirements.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}
