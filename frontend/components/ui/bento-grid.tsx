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
                "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
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
                "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-background dark:bg-black border border-transparent justify-between flex flex-col space-y-4 relative overflow-hidden",
                className
            )}
        >
            {/* Borders and Backgrounds */}
            <div className="absolute inset-0 border border-neutral-200 dark:border-white/[0.2] rounded-xl z-0 pointer-events-none" />
            <div className="absolute inset-0 border border-red-500/0 group-hover/bento:border-red-500/50 rounded-xl transition duration-500 z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover/bento:opacity-100 transition duration-500 z-0 pointer-events-none" />

            <div className="relative z-20 h-full flex flex-col justify-between">
                {header}
                <div className="group-hover/bento:translate-x-2 transition duration-200 mt-4">
                    {icon}
                    <div className="font-sans font-bold text-foreground dark:text-neutral-200 mb-2 mt-2">
                        {title}
                    </div>
                    <div className="font-sans font-normal text-muted-foreground text-xs dark:text-neutral-300">
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
};
