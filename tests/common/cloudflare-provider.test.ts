import { describe, expect, it } from 'vitest'
import { normaliseCloudflareBody } from '../../src/common/cloudflare-provider'

describe('normaliseCloudflareBody', () => {
  it('flattens array content into a string', () => {
    const body = JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'hello ' },
            { type: 'text', text: 'world' },
          ],
        },
      ],
    })
    const out = JSON.parse(normaliseCloudflareBody(body))
    expect(out.messages[0].content).toBe('hello world')
  })

  it('replaces null content with an empty string', () => {
    const body = JSON.stringify({
      messages: [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } },
          ],
        },
      ],
    })
    const out = JSON.parse(normaliseCloudflareBody(body))
    expect(out.messages[0].content).toBe('')
    expect(out.messages[0].tool_calls).toHaveLength(1)
  })

  it('drops image parts rather than emitting an object Cloudflare rejects', () => {
    const body = JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'look' },
            { type: 'image_url', image_url: { url: 'data:...' } },
          ],
        },
      ],
    })
    const out = JSON.parse(normaliseCloudflareBody(body))
    expect(out.messages[0].content).toBe('look')
  })

  it('leaves string content untouched', () => {
    const body = JSON.stringify({
      messages: [{ role: 'system', content: 'already a string' }],
    })
    const out = JSON.parse(normaliseCloudflareBody(body))
    expect(out.messages[0].content).toBe('already a string')
  })

  it('returns malformed json unchanged instead of throwing', () => {
    expect(normaliseCloudflareBody('not json')).toBe('not json')
  })

  it('preserves non-message fields', () => {
    const body = JSON.stringify({
      model: '@cf/x',
      tools: [{ type: 'function' }],
      messages: [],
    })
    const out = JSON.parse(normaliseCloudflareBody(body))
    expect(out.model).toBe('@cf/x')
    expect(out.tools).toHaveLength(1)
  })
})
