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
import type * as ai_entities from "../ai/entities.js";
import type * as ai_sparks from "../ai/sparks.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as glow from "../glow.js";
import type * as players from "../players.js";
import type * as positions from "../positions.js";
import type * as posts from "../posts.js";
import type * as tasks from "../tasks.js";
import type * as territory from "../territory.js";
import type * as testingFunctions from "../testingFunctions.js";
import type * as user from "../user.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/entities": typeof ai_entities;
  "ai/sparks": typeof ai_sparks;
  crons: typeof crons;
  games: typeof games;
  glow: typeof glow;
  players: typeof players;
  positions: typeof positions;
  posts: typeof posts;
  tasks: typeof tasks;
  territory: typeof territory;
  testingFunctions: typeof testingFunctions;
  user: typeof user;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
