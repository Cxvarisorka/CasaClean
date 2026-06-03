import { cn } from "@/lib/cn";

/*
 * Skeleton
 * --------
 * Content placeholder using the shimmer utility from animations.css. Compose
 * primitives (Skeleton.Text, .Avatar, .Card) to mirror real layouts so the
 * transition from loading to loaded feels seamless.
 */

export function Skeleton({ className, rounded = "rounded-lg", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-shimmer", rounded, className)}
      {...props}
    />
  );
}

Skeleton.Text = function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
};

Skeleton.Avatar = function SkeletonAvatar({ className }) {
  return <Skeleton rounded="rounded-full" className={cn("size-12", className)} />;
};

Skeleton.Card = function SkeletonCard({ className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-100 bg-white p-6 shadow-soft",
        className
      )}
    >
      <Skeleton className="mb-4 h-40 w-full rounded-xl" />
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton.Text lines={2} />
    </div>
  );
};

export default Skeleton;
