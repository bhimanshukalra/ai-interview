import { readFileSync } from 'node:fs';

const env = {
  AI_PROVIDER: 'gemini',
  AI_MODEL: 'gemini-2.5-flash',
  ...readDevVars()
};

const questionSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          question: { type: 'string' },
          rubric: {
            type: 'object',
            properties: {
              excellent: { type: 'string' },
              good: { type: 'string' },
              weak: { type: 'string' }
            },
            required: ['excellent', 'good', 'weak']
          }
        },
        required: ['title', 'question', 'rubric']
      }
    }
  },
  required: ['questions']
};

const evaluationSchema = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 10 },
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' }
    },
    weaknesses: {
      type: 'array',
      items: { type: 'string' }
    },
    followUpQuestion: { type: 'string' }
  },
  required: ['score', 'summary', 'strengths', 'weaknesses']
};

function readDevVars() {
  try {
    return Object.fromEntries(
      readFileSync('.dev.vars', 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        })
    );
  } catch {
    return {};
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateGeminiRequest(url, init, expectedSchema) {
  assert(url.includes(`/models/${env.AI_MODEL}:generateContent`), 'Gemini request used the wrong model URL.');
  assert(init.method === 'POST', 'Gemini request must use POST.');
  assert(init.headers['Content-Type'] === 'application/json', 'Gemini request must send JSON.');
  assert(init.headers['x-goog-api-key'], 'Gemini request must include an API key header.');

  const body = JSON.parse(init.body);

  assert(body.system_instruction?.parts?.[0]?.text, 'Gemini request must include a system instruction.');
  assert(body.contents?.[0]?.parts?.[0]?.text, 'Gemini request must include a prompt.');
  assert(body.generationConfig?.responseMimeType === 'application/json', 'Gemini must be asked for JSON.');
  assert(
    JSON.stringify(body.generationConfig?.responseJsonSchema) === JSON.stringify(expectedSchema),
    'Gemini request used an unexpected response schema.'
  );
}

async function generateGeminiJson({ apiKey, model, prompt, responseJsonSchema, systemInstruction, fetchImpl }) {
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema
      }
    })
  });

  assert(response.ok, `Gemini request failed with status ${response.status}.`);

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  assert(text, 'Gemini response did not include generated text.');

  return JSON.parse(text);
}

function createMockFetch(expectedSchema, responsePayload, validatePrompt = () => {}) {
  return async (url, init) => {
    validateGeminiRequest(url, init, expectedSchema);

    const body = JSON.parse(init.body);
    validatePrompt(body.contents?.[0]?.parts?.[0]?.text ?? '');

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(responsePayload) }]
              }
            }
          ]
        };
      }
    };
  };
}

async function runQuestionSmokeTest(fetchImpl) {
  const payload = await generateGeminiJson({
    apiKey: env.AI_API_KEY || 'mock-api-key',
    model: env.AI_MODEL,
    prompt: [
      'Create 3 interview questions.',
      'Role: Frontend Engineer',
      'Level: junior',
      'Interview type: technical',
      'Topic: React'
    ].join('\n'),
    responseJsonSchema: questionSchema,
    systemInstruction: 'You are an expert technical interviewer. Return only structured JSON.',
    fetchImpl
  });

  assert(Array.isArray(payload.questions), 'Question payload must include questions.');
  assert(payload.questions.length > 0, 'Question payload must include at least one question.');
  assert(payload.questions[0].rubric?.excellent, 'Question payload must include rubric details.');
}

async function runEvaluationSmokeTest(fetchImpl) {
  const payload = await generateGeminiJson({
    apiKey: env.AI_API_KEY || 'mock-api-key',
    model: env.AI_MODEL,
    prompt: [
      'Role: Frontend Engineer',
      'Question: How do you avoid unnecessary React re-renders?',
      'Candidate answer: I memoize expensive work and keep state scoped.',
      'Candidate code:',
      'Language: TypeScript',
      'const ranked = candidates.toSorted((left, right) => right.score - left.score);'
    ].join('\n'),
    responseJsonSchema: evaluationSchema,
    systemInstruction: 'You are an expert interviewer evaluating a written candidate answer.',
    fetchImpl
  });

  assert(Number.isInteger(payload.score), 'Evaluation payload must include an integer score.');
  assert(payload.summary, 'Evaluation payload must include a summary.');
  assert(Array.isArray(payload.strengths), 'Evaluation payload must include strengths.');
  assert(Array.isArray(payload.weaknesses), 'Evaluation payload must include weaknesses.');
}

const liveTest = process.env.AI_GEMINI_LIVE_TEST === '1';

if (liveTest) {
  assert(env.AI_API_KEY, 'Set AI_API_KEY in apps/api/.dev.vars before running a live Gemini test.');
  await runQuestionSmokeTest(fetch);
  await runEvaluationSmokeTest(fetch);
  console.log('Gemini live smoke test passed.');
} else {
  await runQuestionSmokeTest(
    createMockFetch(questionSchema, {
      questions: [
        {
          title: 'React rendering',
          question: 'How do you reduce unnecessary React re-renders?',
          rubric: {
            excellent: 'Explains measurement, state placement, memoization, and tradeoffs.',
            good: 'Mentions common render optimization tools with some context.',
            weak: 'Only names memo without explaining when it helps.'
          }
        }
      ]
    })
  );
  await runEvaluationSmokeTest(
    createMockFetch(
      evaluationSchema,
      {
        score: 8,
        summary: 'Specific and practical answer with clear examples.',
        strengths: ['Mentions state scoping', 'Includes code context'],
        weaknesses: ['Could discuss profiling first'],
        followUpQuestion: 'How would you prove memoization helped?'
      },
      (prompt) => {
        assert(prompt.includes('Candidate code:'), 'Evaluation prompt must include candidate code context.');
        assert(prompt.includes('TypeScript'), 'Evaluation prompt must include code language.');
        assert(prompt.includes('toSorted'), 'Evaluation prompt must include candidate code.');
      }
    )
  );
  console.log('Gemini mocked smoke test passed. Set AI_GEMINI_LIVE_TEST=1 with AI_API_KEY for a live call.');
}
