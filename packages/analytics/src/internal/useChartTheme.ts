import { useEffect, useState } from "react";

/**
 * Concrete colour strings recharts needs for stroke/fill. recharts renders to
 * SVG and cannot read CSS custom properties for every prop, so we resolve the
 * relevant `--tb-*` tokens to real colours once and re-resolve when the theme
 * flips (observed via a class/attribute mutation on the document element).
 *
 * Tokens stay the single source of truth — overriding a `--tb-*` variable in
 * the host app re-themes the charts too, with no component change. Fallbacks
 * mirror the light palette so charts still render if the token sheet is absent.
 */
export interface ChartTheme {
  ink: string;
  ink3: string;
  rule: string;
  accent: string;
  positive: string;
  caution: string;
  negative: string;
  roleUser: string;
  roleAssistant: string;
  surface: string;
  fontSans: string;
}

const FALLBACK: ChartTheme = {
  ink: "hsl(24 10% 6%)",
  ink3: "hsl(25 5% 46%)",
  rule: "hsl(30 8% 88%)",
  accent: "hsl(24 10% 6%)",
  positive: "hsl(142 71% 30%)",
  caution: "hsl(35 92% 38%)",
  negative: "hsl(0 72% 45%)",
  roleUser: "hsl(216 45% 46%)",
  roleAssistant: "hsl(16 58% 52%)",
  surface: "hsl(0 0% 100%)",
  fontSans: "ui-sans-serif, system-ui, sans-serif",
};

const VAR_MAP: Record<keyof ChartTheme, string> = {
  ink: "--tb-ink",
  ink3: "--tb-ink-3",
  rule: "--tb-rule",
  accent: "--tb-accent",
  positive: "--tb-positive",
  caution: "--tb-caution",
  negative: "--tb-negative",
  roleUser: "--tb-role-user",
  roleAssistant: "--tb-role-assistant",
  surface: "--tb-surface",
  fontSans: "--tb-font-sans",
};

function resolve(el: Element | null): ChartTheme {
  if (el == null || typeof window === "undefined") return FALLBACK;
  const cs = window.getComputedStyle(el);
  const out = {} as ChartTheme;
  for (const key of Object.keys(VAR_MAP) as (keyof ChartTheme)[]) {
    const v = cs.getPropertyValue(VAR_MAP[key]).trim();
    out[key] = v || FALLBACK[key];
  }
  return out;
}

/**
 * Resolve the chart palette from `el` (or `document.documentElement`). Re-runs
 * when the element's `class`/`data-tb-theme`/`style` changes, so a `tb-dark`
 * toggle on an ancestor re-themes the charts without a manual refresh.
 */
export function useChartTheme(el?: Element | null): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = el ?? document.documentElement;
    const update = () => setTheme(resolve(root));
    update();

    // Watch the document element (where `tb-dark` typically toggles) plus the
    // target element itself, so either flips the palette.
    const observers: MutationObserver[] = [];
    const watch = (node: Element) => {
      const mo = new MutationObserver(update);
      mo.observe(node, {
        attributes: true,
        attributeFilter: ["class", "data-tb-theme", "style"],
      });
      observers.push(mo);
    };
    watch(document.documentElement);
    if (root !== document.documentElement) watch(root);
    return () => observers.forEach((o) => o.disconnect());
  }, [el]);

  return theme;
}
