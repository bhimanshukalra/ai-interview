import { z } from 'zod';

const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string()
          })
        )
      })
    })
  )
});

type GenerateJsonOptions = {
  apiKey: string;
  model: string;
  prompt: string;
  responseJsonSchema: unknown;
  systemInstruction: string;
};

async function getGeminiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) {
    return `AI generation failed with status ${response.status}`;
  }

  try {
    const payload = z
      .object({
        error: z
          .object({
            message: z.string().optional()
          })
          .optional()
      })
      .parse(JSON.parse(text));

    return payload.error?.message
      ? `AI generation failed with status ${response.status}: ${payload.error.message}`
      : `AI generation failed with status ${response.status}`;
  } catch {
    return `AI generation failed with status ${response.status}: ${text.slice(0, 240)}`;
  }
}

export async function generateGeminiJson(options: GenerateJsonOptions): Promise<unknown> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: options.systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: options.prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: options.responseJsonSchema
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(await getGeminiErrorMessage(response));
  }

  const payload = GeminiResponseSchema.parse(await response.json());
  const text = payload.candidates[0]?.content.parts[0]?.text;

  if (!text) {
    throw new Error('AI generation response did not include generated text');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('AI generation response did not include valid JSON');
  }
}
