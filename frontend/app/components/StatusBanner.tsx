import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";

interface StatusBannerProps {
  variant: "success" | "error";
  title: string;
  children: ReactNode;
}

export function StatusBanner({ variant, title, children }: StatusBannerProps) {
  const isSuccess = variant === "success";
  
  return (
    <Alert variant={isSuccess ? "default" : "destructive"} className={isSuccess ? "border-green-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-100" : ""}>
      {isSuccess ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <AlertTitle className="mb-2">{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-1 text-xs sm:text-sm">{children}</div>
      </AlertDescription>
    </Alert>
  );
}
