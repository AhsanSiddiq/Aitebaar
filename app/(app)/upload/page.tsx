import { FileUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload financials</h1>
        <p className="mt-1 text-sm text-ink-50">Upload a PDF or Excel statement, review the AI extraction, then save it into the spreading template.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald">
            <FileUp className="size-6" />
          </div>
          <div className="font-medium">Arrives in build step 3</div>
          <p className="max-w-md text-sm text-ink-50">
            Statement extraction is always shown for human review before saving, and manual entry stays available if the AI service is down.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
