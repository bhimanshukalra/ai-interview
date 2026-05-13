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

export async function generateGeminiJson(options: GenerateJsonOptions) {
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
    throw new Error(`AI generation failed with status ${response.status}`);
  }

  const payload = GeminiResponseSchema.parse(await response.json());
  const text = payload.candidates[0]?.content.parts[0]?.text;

  if (!text) {
    throw new Error('AI generation response did not include generated text');
  }

  return JSON.parse(text) as unknown;
}
