export interface PromptTemplate {
  name: string;
  questionPrompt: string;
  answerPrompt: string;
}

// Add helper function to replace placeholders in prompts
export const replacePlaceholders = (
  prompt: string,
  data: { summary: string; chunk: string; question?: string }
): string => {
  return prompt
    .replace(/\{summary\}/g, data.summary)
    .replace(/\{chunk\}/g, data.chunk)
    .replace(/\{question\}/g, data.question || '');
};

export const defaultTemplates: PromptTemplate[] = [
  {
    name: 'General Test',
    questionPrompt: "Generate a single, focused question based on the information provided. The question must be self-contained and understandable without any additional context. Do not use pronouns or references like 'this text', 'the passage', etc. Instead, explicitly mention the subject or topic. The question should be specific and clear enough that someone who hasn't seen the source material can understand what is being asked. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a direct, self-contained answer to the question. The answer should make sense on its own without requiring access to any source material. Use specific nouns and names instead of pronouns. When referring to entities mentioned in the question, you may use pronouns only if the reference is clear from the question itself. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Abstractive Test',
    questionPrompt: "Create a question that requires analyzing or synthesizing information about a specific topic or concept. The question must be self-contained and avoid any references to 'the text', 'this passage', or similar phrases. Use specific nouns and explicit references instead of pronouns or vague terms. The question should be clear and meaningful to someone who hasn't seen the source material. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a comprehensive answer that explains the concepts, implications, or relationships in a self-contained way. The answer must make sense without requiring access to any source material. Use specific nouns and names instead of pronouns or phrases like 'in the text'. When referring to entities mentioned in the question, you may use pronouns only if the reference is clear from the question itself. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Extractive Test',
    questionPrompt: "Create a precise question targeting a specific fact, detail, number, or quote about a clearly identified subject or topic. The question must be self-contained and avoid references like 'in the text' or 'the passage'. Use explicit nouns and names instead of pronouns. The question should be clear and meaningful to someone who hasn't seen the source material. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a specific, factual answer that stands on its own without requiring access to any source material. Use explicit nouns and names instead of pronouns or phrases like 'in the text'. When referring to entities mentioned in the question, you may use pronouns only if the reference is clear from the question itself. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Hallucination Test',
    questionPrompt: "Create a question about a specific aspect of the topic that requires information beyond what is available. The question must be self-contained and avoid references like 'the text' or 'this passage'. Use explicit nouns and names instead of pronouns. The question should be clear and meaningful to someone who hasn't seen the source material. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a clear response indicating whether specific information about the topic is available. Instead of saying 'the text doesn't mention', use a self-contained response like 'There is no available information about [specific topic]'. Avoid pronouns and references to any source material. When referring to entities mentioned in the question, you may use pronouns only if the reference is clear from the question itself. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Yes/No Questions',
    questionPrompt: "Create a yes/no question about a specific fact or detail, using explicit nouns and names. The question must be self-contained and avoid references like 'the text' or 'this passage'. Do not use pronouns or vague terms. The question should be clear and meaningful to someone who hasn't seen the source material. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Answer with 'Yes' or 'No' followed by a self-contained explanation. Use specific nouns and names instead of pronouns or phrases like 'in the text'. When referring to entities mentioned in the question, you may use pronouns only if the reference is clear from the question itself. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  }
];

// Function to create a new custom template
export const createCustomTemplate = (name: string = 'Custom Template'): PromptTemplate => ({
  name,
  questionPrompt: '',
  answerPrompt: ''
}); 