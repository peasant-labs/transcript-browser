import { useCallback, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Search, X } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { Kbd } from "@peasant-labs/fairtrade/ui";

export interface SearchBarProps {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  /** 1-based current match index. */
  currentMatch: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  className?: string;
}

/**
 * Centered top search overlay. Auto-focuses on open, closes on Esc, navigates
 * with Up/Down (or Shift+Enter / Enter). Ported from peasant's
 * `overlays/SearchBar.tsx`.
 */
export function SearchBar({ open, query, onQueryChange, matchCount, currentMatch, onPrev, onNext, onClose, className }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      inputRef.current?.select();
    }
  }, [open]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) onPrev();
        else onNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      }
    },
    [onClose, onPrev, onNext],
  );

  if (!open) return null;

  return (
    <div className={cn("tb-root tb-searchbar", className)} role="search">
      <Search size={14} strokeWidth={1.75} className="tb-searchbar-icon" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search across turns, tool args, and results…"
        className="tb-searchbar-input"
      />
      <span className="tb-mono tb-tnum tb-searchbar-count">
        {matchCount > 0 ? `${currentMatch}/${matchCount}` : query ? "0 matches" : ""}
      </span>
      <button type="button" onClick={onPrev} disabled={matchCount === 0} className={cn("tb-searchbar-nav", matchCount === 0 && "tb-searchbar-nav-disabled")} aria-label="Previous match (↑ or Shift+Enter)">
        <ChevronUp size={13} strokeWidth={1.75} />
      </button>
      <button type="button" onClick={onNext} disabled={matchCount === 0} className={cn("tb-searchbar-nav", matchCount === 0 && "tb-searchbar-nav-disabled")} aria-label="Next match (↓ or Enter)">
        <ChevronDown size={13} strokeWidth={1.75} />
      </button>
      <span className="tb-searchbar-hint">
        <Kbd>⎋</Kbd>
        <span>close</span>
      </span>
      <button type="button" onClick={onClose} className="tb-searchbar-nav" aria-label="Close search">
        <X size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/** Bind Cmd/Ctrl+F to open the search bar. Cleanup-safe. */
export function useSearchHotkey(open: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}
