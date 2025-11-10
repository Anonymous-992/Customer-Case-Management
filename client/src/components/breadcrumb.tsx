import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link href="/">
        <a className="flex items-center hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </a>
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.href && index < items.length - 1 ? (
            <Link href={item.href}>
              <a className="hover:text-foreground transition-colors truncate max-w-[150px] sm:max-w-none">
                {item.label}
              </a>
            </Link>
          ) : (
            <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-none">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
