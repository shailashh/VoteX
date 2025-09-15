import { cn } from "@/lib/utils"
import { ShieldCheck } from "lucide-react"

export function VotexLogo({ className }: { className?: string }) {
    return (
        <ShieldCheck className={cn("h-7 w-7 text-primary", className)} />
    )
}
