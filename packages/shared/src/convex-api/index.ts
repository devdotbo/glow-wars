// Convex API utilities for frontend integration

import { ConvexReactClient } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'

export interface ConvexClients {
  convexClient: ConvexReactClient
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}

export function createConvexClients(convexUrl: string): ConvexClients {
  // Create Convex client
  const convexClient = new ConvexReactClient(convexUrl)

  // Bridge Convex with React Query
  const convexQueryClient = new ConvexQueryClient(convexClient)

  // Create query client with Convex integration
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        staleTime: 5000,
        refetchInterval: false,
        retry: 3,
      },
    },
  })

  // Connect the clients
  convexQueryClient.connect(queryClient)

  return {
    convexClient,
    queryClient,
    convexQueryClient,
  }
}

// Game-specific API helpers
export interface GameSession {
  gameId: string
  playerId: string
  gameCode: string
}

export interface CreateGameParams {
  hostName: string
  maxPlayers?: number
  gameDuration?: number
}

export interface JoinGameParams {
  gameCode: string
  playerName: string
}

export interface UpdatePositionParams {
  gameId: string
  playerId: string
  position: { x: number; y: number }
  timestamp: number
}

// Type-safe API function references would be imported from the generated Convex API
// For now, we'll define the structure that frontends can use