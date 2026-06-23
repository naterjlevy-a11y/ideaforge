import { GoogleGenerativeAI } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
    throw new Error(
      'GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add it to .env.local'
    )
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _client
}

export function getModel() {
  const client = getGeminiClient()
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
  return client.getGenerativeModel({ model: modelName })
}

export async function generateText(prompt: string): Promise<{ text: string; tokens: number }> {
  const model = getModel()
  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()
  const tokens = response.usageMetadata?.totalTokenCount ?? 0
  return { text, tokens }
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const model = getModel()
  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()

  // Strip markdown fences if the model wrapped the JSON
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`AI returned invalid JSON. Raw response:\n${raw.slice(0, 500)}`)
  }
}
