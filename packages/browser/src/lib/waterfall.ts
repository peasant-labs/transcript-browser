/**
 * Steps waterfall: turn the tasks of a session into a
 * proportional duration lane — each task a horizontal segment whose width is its
 * share of total work time and whose offset is the cumulative work before it
 * (segments tile back-to-back, idle gaps compressed out). Pure function of its
 * input (no clock/random); when total duration is 0 every segment is zero-width
 * at offset 0 so the caller renders the list without bars rather than dividing by
 * zero.
 *
 * The implementation lives in the shared fairtrade transcript analytics utility
 * (`@peasant-labs/fairtrade/ui`) and is re-exported here to keep the
 * `@peasant-labs/transcript-browser` import path stable for consumers.
 */
export {
  buildTaskWaterfall,
  type WaterfallSegment,
} from "@peasant-labs/fairtrade/ui";
