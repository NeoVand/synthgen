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
    questionPrompt: "Generate a single, focused question based primarily on the specific information in the following chunk of text. Use the summary only for context to better understand the chunk. The question should be answerable using the chunk's content. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a direct answer to the question using information from the given chunk of text. Use the summary only for context to better understand the chunk. The answer must be supported by the chunk's content. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Abstractive Test',
    questionPrompt: "Create a question that requires analyzing or synthesizing information specifically found in the following chunk. The question should focus on broader concepts, implications, or relationships present in the chunk, not the summary. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Provide a comprehensive answer that explains the broader concepts, implications, or relationships based on the information in the chunk. While you may use the summary for context, your answer must be grounded in the chunk's content. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Extractive Test',
    questionPrompt: "Create a precise question targeting a specific fact, detail, number, or quote that appears in the following chunk of text. The question must be answerable with information explicitly stated in the chunk, not the summary. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Extract and provide the exact fact, detail, number, or quote from the chunk that answers the question. The answer must come directly from the chunk's content, not the summary. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Hallucination Test',
    questionPrompt: "Create a question that appears to be related to the chunk's topic but asks about information that is NOT explicitly stated in the chunk. The question should be crafted to test for potential hallucinations. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Review the chunk carefully and indicate whether the information needed to answer the question is present or not. If the information is not explicitly stated in the chunk, respond with 'The chunk does not contain information about [topic].' Do not make assumptions or infer information not present in the chunk. Use the summary only for context. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  },
  {
    name: 'Yes/No Questions',
    questionPrompt: "Create a yes/no question that can be definitively answered based on information explicitly stated in the following chunk. The question must be verifiable using the chunk's content, not the summary. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
    answerPrompt: "Answer with 'Yes' or 'No' followed by a single sentence explanation using only information explicitly stated in the chunk. Do not use information from the summary in the explanation. Output only the raw answer text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}\n\nQuestion:\n{question}"
  }
];

// Function to create a new custom template
export const createCustomTemplate = (name: string = 'Custom Template'): PromptTemplate => ({
  name,
  questionPrompt: '',
  answerPrompt: ''
}); 