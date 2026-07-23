export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase text-scope-blue">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted md:text-base">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
