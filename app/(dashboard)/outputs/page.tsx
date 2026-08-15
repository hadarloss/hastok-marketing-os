import { OutputsGalleryClient } from "@/components/outputs/OutputsGalleryClient";
import { listOutputs } from "@/lib/fs/outputs";

export default async function OutputsPage() {
  const outputs = await listOutputs();

  return (
    <div className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">📦 תוצרים</h1>
        <p className="text-muted-foreground mt-1">
          קמפיינים שיווקיים ונכסי מיתוג ששמרתם מתוך שיחות עם הסוכנים.
        </p>
      </div>
      <OutputsGalleryClient outputs={outputs} />
    </div>
  );
}
