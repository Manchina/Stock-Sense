import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("flex items-center justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1 list-none m-0 p-0", className)}
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" className={cn("inline-flex items-center", className)} {...props} />;
}

export type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<"button">;

function PaginationLink({
  className,
  isActive,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        "h-8 min-w-8 px-2 flex items-center justify-center text-xs font-semibold rounded-full transition-all duration-150 select-none cursor-pointer border disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed",
        isActive
          ? "bg-white border-2 border-slate-300 text-slate-900 font-bold shadow-xs ring-1 ring-black/5"
          : "bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn("h-8 w-8 p-0 rounded-full", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4 stroke-[2]" />
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn("h-8 w-8 p-0 rounded-full", className)}
      {...props}
    >
      <ChevronRight className="h-4 w-4 stroke-[2]" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex h-8 w-6 items-center justify-center text-slate-400", className)}
      {...props}
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
