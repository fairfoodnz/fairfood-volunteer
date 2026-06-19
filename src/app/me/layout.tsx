// Account pages are per-user and disallowed in robots.txt; the noindex meta
// keeps them out of search indexes even if a URL is discovered. Child pages
// only set a title, so they inherit this robots directive.
export const metadata = { robots: { index: false, follow: false } };

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
