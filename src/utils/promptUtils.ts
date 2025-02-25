/**
 * Replace placeholders in a prompt template with actual data
 */
export const replacePlaceholders = (
  prompt: string,
  data: { summary: string; chunk: string; question?: string }
): string => {
  return prompt
    .replace(/\{summary\}/g, data.summary || '')
    .replace(/\{chunk\}/g, data.chunk || '')
    .replace(/\{question\}/g, data.question || '');
};

/**
 * Default summary prompt
 */
export const DEFAULT_SUMMARY_PROMPT = 
  "Create a focused, factual summary of the following text. The summary should capture key points and main ideas without adding external information. Output only the raw summary text without any greetings, markdown, or formatting.";

/**
 * Default question generation prompt
 */
export const DEFAULT_QUESTION_PROMPT = 
  "Please read the following text (and summary) and create a single and short and relevant question related to the text. Don't add any markdown or greetings. Only the question.";

/**
 * Default answer generation prompt
 */
export const DEFAULT_ANSWER_PROMPT = 
  "Based on the text (and summary) plus the question, provide a concise answer. Don't add any markdown or greetings. Only the Answer."; 