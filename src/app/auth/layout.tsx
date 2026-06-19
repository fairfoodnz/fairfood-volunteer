// Auth flows are disallowed in robots.txt; the noindex meta keeps sign-in,
// sign-up, password-reset and verification URLs out of search indexes. Child
// pages only set a title, so they inherit this robots directive.
export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
