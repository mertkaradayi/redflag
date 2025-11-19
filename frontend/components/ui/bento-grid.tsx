import { cn } from "@/lib/utils";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid md:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "row-span-1 rounded-2xl group/bento hover:scale-[1.01] hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/20 transition duration-300 shadow-none p-8 bg-transparent border border-neutral-200/50 dark:border-white/5 justify-between flex flex-col space-y-4 relative overflow-hidden",
                className
            )}
        >
            {/* Gradient Background - Always Visible */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-transparent to-transparent dark:from-white/5 opacity-100 transition duration-500 z-0 pointer-events-none" />

            <div className="relative z-20 h-full flex flex-col justify-between">
                <div className="flex-1 min-h-0">
                    {header}
                </div>
                <div className="group-hover/bento:translate-x-2 transition duration-200 mt-4">
                    {icon}
                    <div className="font-sans font-bold text-foreground dark:text-neutral-200 mb-2 mt-2 text-lg">
                        {title}
                    </div>
                    <div className="font-sans font-normal text-muted-foreground text-sm dark:text-neutral-400 leading-relaxed mb-2">
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
};
