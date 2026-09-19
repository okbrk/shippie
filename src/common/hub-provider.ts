import { registerProvider } from '@flue/runtime'

type Env = Record<string, string | undefined>

const HUB_MODELS = {
  'claude-opus-4-5-20251101': { contextWindow: 200000, maxTokens: 32000 },
  'claude-opus-4-6': { contextWindow: 200000, maxTokens: 32000 },
  'claude-sonnet-4-5-20250929': { contextWindow: 200000, maxTokens: 32000 },
  'claude-haiku-4-5-20251001': { contextWindow: 200000, maxTokens: 16000 },
} as const

export const registerHub = (env: Env = process.env): void => {
  const apiKey = env.ANTHROPIC_API_KEY
  const baseUrl = env.ANTHROPIC_BASE_URL
  if (!apiKey || !baseUrl) return
  registerProvider('hub', {
    api: 'openai-completions',
    baseUrl: `${baseUrl.replace(/\/$/, '')}/v1`,
    apiKey,
    contextWindow: 200000,
    maxTokens: 32000,
    models: HUB_MODELS,
  })
}
