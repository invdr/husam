export default function Badge({
  children,
  variant = "default",
  className = "",
}) {
  const variants = {
    default: "inline-block rounded-full bg-brand px-4 py-2 text-ink",
    outline:
      "inline-flex items-center rounded-lg bg-brand/10 border border-brand/20 px-2 py-1 text-xs text-brand",
  };

  return (
    <span className={`${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
