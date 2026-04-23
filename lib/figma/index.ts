// Figma REST API client — SERVER-ONLY.
// The access token must never be exposed to the browser. Import this module
// only from Next.js route handlers, server components, or Node scripts.
// Docs: https://www.figma.com/developers/api

const FIGMA_API_BASE = 'https://api.figma.com/v1'

export class FigmaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message)
    this.name = 'FigmaApiError'
  }
}

function getToken(): string {
  if (typeof window !== 'undefined') {
    throw new Error('[figma] client module must not be imported in the browser')
  }
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) {
    throw new Error('[figma] FIGMA_ACCESS_TOKEN is not set')
  }
  return token
}

async function figmaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FIGMA_API_BASE}${path}`, {
    ...init,
    headers: {
      'X-Figma-Token': getToken(),
      ...(init?.headers ?? {}),
    },
    // Figma responses change independently of our app — opt out of Next's
    // default static caching so callers see fresh data.
    cache: 'no-store',
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => undefined)
    }
    throw new FigmaApiError(
      `Figma API ${res.status} ${res.statusText} for ${path}`,
      res.status,
      body,
    )
  }

  return (await res.json()) as T
}

// ---- Types (narrow subset — expand as needed) ----

export interface FigmaUser {
  id: string
  handle: string
  email?: string
  img_url: string
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  [key: string]: unknown
}

export interface FigmaFile {
  name: string
  lastModified: string
  version: string
  thumbnailUrl?: string
  document: FigmaNode
  components: Record<string, unknown>
  styles: Record<string, unknown>
}

export interface FigmaNodesResponse {
  name: string
  lastModified: string
  nodes: Record<string, { document: FigmaNode } | null>
}

export interface FigmaImagesResponse {
  err: string | null
  images: Record<string, string | null>
}

export type FigmaImageFormat = 'jpg' | 'png' | 'svg' | 'pdf'

// ---- Public API ----

export async function getCurrentUser(): Promise<FigmaUser> {
  return figmaFetch<FigmaUser>('/me')
}

export async function getFile(fileKey: string): Promise<FigmaFile> {
  return figmaFetch<FigmaFile>(`/files/${encodeURIComponent(fileKey)}`)
}

export async function getFileNodes(
  fileKey: string,
  nodeIds: string[],
): Promise<FigmaNodesResponse> {
  if (nodeIds.length === 0) {
    throw new Error('[figma] getFileNodes requires at least one node id')
  }
  const qs = new URLSearchParams({ ids: nodeIds.join(',') })
  return figmaFetch<FigmaNodesResponse>(
    `/files/${encodeURIComponent(fileKey)}/nodes?${qs}`,
  )
}

export async function getImageUrls(
  fileKey: string,
  nodeIds: string[],
  options: { format?: FigmaImageFormat; scale?: number } = {},
): Promise<FigmaImagesResponse> {
  const { format = 'png', scale } = options
  const qs = new URLSearchParams({ ids: nodeIds.join(','), format })
  if (scale !== undefined) qs.set('scale', String(scale))
  return figmaFetch<FigmaImagesResponse>(
    `/images/${encodeURIComponent(fileKey)}?${qs}`,
  )
}

/**
 * Extract a Figma file key from a full URL like
 *   https://www.figma.com/file/<KEY>/<slug>
 *   https://www.figma.com/design/<KEY>/<slug>
 */
export function parseFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design)\/([0-9a-zA-Z]+)/)
  return match?.[1] ?? null
}
