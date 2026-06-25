/**
 * Steps waterfall (peasant roadmap 5.2): turn the tasks of a session into a
 * proportional duration lane — each task a horizontal segment whose width is its
 * share of total work time and whose offset is the cumulative work before it
 * (segments tile back-to-back, idle gaps compressed out). Pure function of its
 * input (no clock/random); when total duration is 0 every segment is zero-width
 * at offset 0 so the caller renders the list without bars rather than dividing by
 * zero.
 *
 * CONSOLIDATED into the one shared fairtrade transcript analytics util
 * (`@peasant-labs/fairtrade/ui`) and re-exported here so peasant's
 * `@peasant-labs/transcript-browser` import path stays stable. Same logic as
 * before; one implementation now backs all three consumers.
 */
export {
  buildTaskWaterfall,
  type WaterfallSegment,
} from "@peasant-labs/fairtrade/ui";
