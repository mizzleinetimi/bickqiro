/**
 * Minimal layout for embed pages - no navigation
 * Uses the root layout's html/body tags to avoid hydration mismatch
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
