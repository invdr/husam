const cardVariants = {
  default: "rounded-2xl border p-0",
  listing:
    "group h-full overflow-hidden rounded-2xl border border-brand/20 bg-ink p-0 flex flex-col transition-all hover:border-brand/40 hover:shadow-xl",
};

const cardHeaderVariants = {
  default: "p-6",
  listing: "px-4 py-2 sm:px-5 sm:py-3",
};

const cardContentVariants = {
  default: "p-6 pt-0",
  listing: "px-4 pb-3 pt-0 sm:px-5 sm:pb-4 flex-1 flex flex-col",
};

const cardTitleVariants = {
  default: "text-xl font-bold",
  listing: "font-play text-white text-lg sm:text-xl line-clamp-2",
};

const cardDescriptionVariants = {
  default: "text-sm text-gray-400",
  listing: "text-xs sm:text-sm",
  listingClamped: "text-xs sm:text-sm line-clamp-1",
};

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <div
      className={`${cardVariants[variant] || cardVariants.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, variant = "default", className = "" }) {
  return (
    <div className={`${cardHeaderVariants[variant] || cardHeaderVariants.default} ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, variant = "default", className = "" }) {
  return (
    <div className={`${cardContentVariants[variant] || cardContentVariants.default} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, variant = "default", className = "", ...props }) {
  return (
    <h3
      className={`${cardTitleVariants[variant] || cardTitleVariants.default} ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <p
      className={`${cardDescriptionVariants[variant] || cardDescriptionVariants.default} ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}
