import { registerProvider } from '@flue/runtime'

const WORKERS_AI_MODELS = {
  '@cf/openai/gpt-oss-120b': { contextWindow: 128000, maxTokens: 32000 },
  '@cf/openai/gpt-oss-20b': { contextWindow: 128000, maxTokens: 32000 },
  '@cf/qwen/qwen2.5-coder-32b-instruct': { contextWindow: 32768, maxTokens: 8192 },
  '@cf/qwen/qwen3-30b-a3b-fp8': { contextWindow: 32768, maxTokens: 8192 },
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { contextWindow: 24000, maxTokens: 8192 },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { contextWindow: 131000, maxTokens: 8192 },
  '@cf/deepseek-ai/deepseek-v4-pro-0813': { contextWindow: 128000, maxTokens: 16384 },
} as const

type Env = Record<string, string | undefined>

const flattenContent = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

export const normaliseCloudflareBody = (body: string): string => {
  let parsed: { messages?: unknown }
  try {
    parsed = JSON.parse(body)
  } catch {
    return body
  }
  if (!Array.isArray(parsed.messages)) return body
  parsed.messages = parsed.messages.map((message) => ({
    ...(message as Record<string, unknown>),
    content: flattenContent((message as { content?: unknown }).content),
  }))
  return JSON.stringify(parsed)
}

type FetchInput = Parameters<typeof globalThis.fetch>[0]

const targetsCloudflareAi = (input: FetchInput): boolean => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url
  return url.includes('api.cloudflare.com') && url.includes('/ai/')
}

let patched = false

const patchFetchForCloudflare = (): void => {
  if (patched) return
  patched = true
  const original = globalThis.fetch
  globalThis.fetch = async (input: FetchInput, init?: RequestInit) => {
    if (!targetsCloudflareAi(input) || typeof init?.body !== 'string') {
      return original(input, init)
    }
    return original(input, { ...init, body: normaliseCloudflareBody(init.body) })
  }
}

const accountId = (env: Env): string => {
  const id = env.CLOUDFLARE_ACCOUNT_ID
  if (!id) throw new Error('CLOUDFLARE_ACCOUNT_ID is required for cloudflare-workers-ai')
  return id
}

export const registerCloudflareWorkersAi = (env: Env = process.env): void => {
  if (!env.CLOUDFLARE_API_KEY) return
  patchFetchForCloudflare()
  registerProvider('cloudflare-workers-ai', {
    api: 'openai-completions',
    baseUrl:
      env.CLOUDFLARE_AI_BASE_URL ??
      `https://api.cloudflare.com/client/v4/accounts/${accountId(env)}/ai/v1`,
    apiKey: env.CLOUDFLARE_API_KEY,
    contextWindow: 32768,
    maxTokens: 8192,
    models: WORKERS_AI_MODELS,
  })
}
