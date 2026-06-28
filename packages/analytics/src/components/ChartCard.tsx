import type { ComponentType, ReactNode } from "react";
import { cn } from "../internal/cn.js";

type IconComponent = ComponentType<{
  className?: string;
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface ChartCardProps {
  title: string;
  icon?: IconComponent;
  /** Optional one-line description shown under the title. */
  subtitle?: ReactNode;
  /** Optional right-aligned slot in the header (e.g. a summary figure). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled card wrapping a chart (or any content). The chart itself is passed
 * as `children`, usually a fairtrade chart component. Paints from fairtrade
 * tokens; carries no chart logic of its own.
 */
export function ChartCard({
  title,
  icon: Icon,
  subtitle,
  aside,
  children,
  className,
}: ChartCardProps) {
  return (
    <section className={cn("tb-a-card", className)}>
      <header className="tb-a-card__head">
        <div>
          <h3 className="tb-a-card__title">
            {Icon != null ? (
              <Icon className="lucide tb-a-card__icon" aria-hidden="true" />
            ) : null}
            {title}
          </h3>
          {subtitle != null ? (
            <p className="tb-a-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {aside != null ? <div className="tb-a-card__aside">{aside}</div> : null}
      </header>
      <div className="tb-a-card__body">{children}</div>
    </section>
  );
}
