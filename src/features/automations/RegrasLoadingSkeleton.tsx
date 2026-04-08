import { Skeleton } from '@/components/ui/skeleton';

export function RegrasLoadingSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-44 rounded-[12px]" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={`skel-${i}`} className="h-32 w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

export default RegrasLoadingSkeleton;
