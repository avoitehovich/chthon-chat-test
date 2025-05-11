import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="border rounded-lg p-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  )
}
