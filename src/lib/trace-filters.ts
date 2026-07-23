import type { Trace, TraceStatus } from "./types";

export interface TraceFilters {
  query?: string;
  environment?: Trace["environment"] | "";
  status?: TraceStatus | "";
  model?: string;
  tag?: string;
}

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function filterTraces(traces: Trace[], filters: TraceFilters) {
  const query = normalized(filters.query);
  const environment = normalized(filters.environment);
  const status = normalized(filters.status);
  const model = normalized(filters.model);
  const tag = normalized(filters.tag);

  return traces.filter((trace) => {
    const haystack = [
      trace.id,
      trace.app,
      trace.environment,
      trace.model,
      trace.status,
      trace.userInput,
      trace.finalResponse,
      trace.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (!environment || trace.environment === environment) &&
      (!status || trace.status === status) &&
      (!model || trace.model.toLowerCase() === model) &&
      (!tag || trace.tags.some((item) => item.toLowerCase() === tag))
    );
  });
}
