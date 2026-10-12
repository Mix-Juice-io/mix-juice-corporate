import type { AnchorHTMLAttributes, ReactNode } from 'react'

interface LinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  to: string
  children: ReactNode
}

// Plain anchor used inside React page components. The site is a static
// multi-page Astro build, so internal navigation is a normal full page load.
export default function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}
