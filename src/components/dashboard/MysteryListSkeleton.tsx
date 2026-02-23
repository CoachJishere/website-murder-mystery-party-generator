import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MysteryListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>

            <Skeleton className="h-10 w-full flex-1" />

            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-11" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
