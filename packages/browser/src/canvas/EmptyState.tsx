export interface EmptyStateProps {
  title?: string;
  body?: string;
}

export function EmptyState({
  title = "No turns to display",
  body = "This session has no displayable content yet.",
}: EmptyStateProps) {
  return (
    <div className="tb-empty">
      <div className="tb-empty-icon">○</div>
      <h2 className="tb-empty-title">{title}</h2>
      <p className="tb-empty-body">{body}</p>
    </div>
  );
}
