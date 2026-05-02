/**
 * Preventli wordmark — matches the marketing site at https://www.preventli.ai/.
 *
 * "Prevent" inherits surrounding text color via currentColor (so it goes
 * near-black on light surfaces and near-white on dark surfaces / sidebar).
 * "li" is the brand teal (#14B8A6 / Tailwind teal-500), always.
 *
 * Usage:
 *   <PreventliLogo className="h-8 w-auto text-foreground" />
 *   <PreventliLogo className="h-8 w-auto text-sidebar-foreground" />
 */
import type { SVGProps } from "react";

export function PreventliLogo({
  className,
  title = "Preventli",
  ...rest
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      role="img"
      aria-label={title}
      width="300"
      height="80"
      viewBox="0 0 300 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <text
        x="0"
        y="60"
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="60"
        fontWeight="700"
        letterSpacing="-1"
      >
        <tspan fill="currentColor">Prevent</tspan>
        <tspan fill="#14B8A6">li</tspan>
      </text>
    </svg>
  );
}

export default PreventliLogo;
