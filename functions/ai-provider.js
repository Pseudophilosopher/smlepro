/**
 * AI Provider Interface — ZeroClaw-inspired "swap anything" modular provider abstraction.
 *
 * Usage:
 *   const provider = getProvider('deepseek');  // or 'openai', 'gemini'
 *   const response = await provider.generate({
 *     system: 'You are a medical question writer...',
 *     prompt: 'Write a question about...',
 *     temperature: 0.7,
 *     maxTokens: 2048,
 *     format: 'json',  // requests JSON mode where supported
 *   });
 *
 * Adding a new provider = one file in this directory following the ProviderInterface pattern.
 *
 * @see https://github.com/msitarzewski/agency-agents  (specialized agent personas)
 * @see https://github.com/bytedance/deer-flow           (hierarchical agent harness)
 * @see https://github.com/zeroclaw-labs/zeroclaw        (plugin-based provider swap)
 */

const DEFAULT_CONFIG = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    defaultMaxTokens: 2048,
    defaultTemperature: 0.7,
    supportsJsonMode: true,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    defaultMaxTokens: 2048,
    defaultTemperature: 0.7,
    supportsJsonMode: true,
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    defaultMaxTokens: 2048,
    defaultTemperature: 0.7,
    supportsJsonMode: false,
  },
};

/**
 * @typedef {Object} GenerateOptions
 * @property {string} system    - System prompt (the "agent personality")
 * @property {string} prompt    - User prompt / task description
 * @property {number} [temperature]    - Sampling temperature (0-2)
 * @property {number} [maxTokens]      - Max output tokens
 * @property {string} [format]         - 'json' or undefined (plain text)
 * @property {string} [modelOverride]  - Override the default model
 */

/**
 * DeepSeek provider implementation.
 * Uses the same API key Cline has stored for you in ~/.cline/data/secrets.json.
 */
function createDeepSeekProvider(apiKey) {
  const cfg = DEFAULT_CONFIG.deepseek;

  return {
    name: 'deepseek',
    model: cfg.model,

    async generate(options) {
      const { system, prompt, temperature, maxTokens, format } = options;
      const isJson = format === 'json';

      const body = {
        model: options.modelOverride || cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: temperature ?? cfg.defaultTemperature,
        max_tokens: maxTokens ?? cfg.defaultMaxTokens,
      };

      // JSON mode: DeepSeek supports response_format via the OpenAI-compatible API
      if (isJson && cfg.supportsJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      // 30-second timeout for normal calls (prevent context bloat on slow API)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30 * 1000);

      try {
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`DeepSeek API ${res.status}: ${errBody.slice(0, 300)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';

        return {
          content,
          model: data.model || cfg.model,
          usage: data.usage || null,
          finishReason: data?.choices?.[0]?.finish_reason || null,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

/**
 * OpenAI provider implementation (stub-ready, works with any OpenAI-compatible endpoint).
 */
function createOpenAiProvider(apiKey) {
  const cfg = DEFAULT_CONFIG.openai;

  return {
    name: 'openai',
    model: cfg.model,

    async generate(options) {
      const { system, prompt, temperature, maxTokens, format } = options;
      const isJson = format === 'json';

      const body = {
        model: options.modelOverride || cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: temperature ?? cfg.defaultTemperature,
        max_tokens: maxTokens ?? cfg.defaultMaxTokens,
      };

      if (isJson && cfg.supportsJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      // 30-second timeout (prevent context bloat on slow API)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30 * 1000);

      try {
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`OpenAI API ${res.status}: ${errBody.slice(0, 300)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';

        return {
          content,
          model: data.model || cfg.model,
          usage: data.usage || null,
          finishReason: data?.choices?.[0]?.finish_reason || null,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

/**
 * Factory: resolves a provider by name.
 * Throws if the provider is not available (i.e., no file for it yet).
 *
 * @param {string} name - 'deepseek', 'openai', or 'gemini'
 * @param {string} apiKey - The API key for that provider
 * @returns {Object} Provider interface with .generate(options)
 */
function getProvider(name, apiKey) {
  if (!apiKey) {
    throw new Error(`[AI Provider] No API key provided for "${name}". Set it via Firebase secrets.`);
  }

  switch (name) {
    case 'deepseek':
      return createDeepSeekProvider(apiKey);
    case 'openai':
      return createOpenAiProvider(apiKey);
    // case 'gemini':
    //   return createGeminiProvider(apiKey);
    default:
      throw new Error(`[AI Provider] Unknown provider "${name}". Available: deepseek, openai`);
  }
}

module.exports = { getProvider, DEFAULT_CONFIG };
