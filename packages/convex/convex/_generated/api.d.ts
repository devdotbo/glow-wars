/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_creepers from "../ai/creepers.js";
import type * as ai_entities from "../ai/entities.js";
import type * as ai_sparks from "../ai/sparks.js";
import type * as collision from "../collision.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as glow from "../glow.js";
import type * as optimizations_batch from "../optimizations/batch.js";
import type * as optimizations_cache from "../optimizations/cache.js";
import type * as optimizations_cleanup from "../optimizations/cleanup.js";
import type * as optimizations_prediction from "../optimizations/prediction.js";
import type * as optimizations_scheduler from "../optimizations/scheduler.js";
import type * as optimizations_spatial from "../optimizations/spatial.js";
import type * as players from "../players.js";
import type * as positions from "../positions.js";
import type * as posts from "../posts.js";
import type * as powerups from "../powerups.js";
import type * as tasks from "../tasks.js";
import type * as territory from "../territory.js";
import type * as user from "../user.js";
import type * as victory from "../victory.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/creepers": typeof ai_creepers;
  "ai/entities": typeof ai_entities;
  "ai/sparks": typeof ai_sparks;
  collision: typeof collision;
  crons: typeof crons;
  games: typeof games;
  glow: typeof glow;
  "optimizations/batch": typeof optimizations_batch;
  "optimizations/cache": typeof optimizations_cache;
  "optimizations/cleanup": typeof optimizations_cleanup;
  "optimizations/prediction": typeof optimizations_prediction;
  "optimizations/scheduler": typeof optimizations_scheduler;
  "optimizations/spatial": typeof optimizations_spatial;
  players: typeof players;
  positions: typeof positions;
  posts: typeof posts;
  powerups: typeof powerups;
  tasks: typeof tasks;
  territory: typeof territory;
  user: typeof user;
  victory: typeof victory;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
