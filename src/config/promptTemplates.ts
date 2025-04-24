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
    questionPrompt: "Generate a single, focused question based on the information provided. The question must be self-contained and understandable without any additional context. Do not use pronouns or references like 'this text', 'the passage', 'the image', etc. Instead, explicitly mention the subject or topic. The question should be specific and clear enough that someone who hasn't seen the source material can understand what is being asked. Output only the raw question text without any greetings, markdown, or formatting.\n\nSummary:\n{summary}\n\nChunk:\n{chunk}",
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
  },
  {
    name: 'Image Analysis QA',
    questionPrompt: 
    `
    ### TASK DEFINITION:
    Generate a question that tests the understanding of specific information depicted in the given image. Focus on:
    - Specific entities and their relationships shown in the image
    - Labels and their positions in the image
    - Sequences and dependencies in the image
    - Terminology in the image

    ### GUIDELINES:
    - Use specific nouns and names instead of pronouns 
    - Your question should be self-contained and make sense without additional context
    - Output only the raw question text without any greetings, markdown, or formatting
    - IMPORTANT: Do NOT reproduce any example questions - create a NEW question specific to the current image

    ### EXAMPLE SECTION (These are only for reference - DO NOT copy these questions):
    EXAMPLE 1:
    Input image: An image showing a diagram of a finetuning process with multiple steps and procedures
    Sample question: In what 2 datasets is the data divided before finetuning?

    EXAMPLE 2:
    Input image: An image showing a table of specifications for a specific vehicle
    Sample question: What is the maximum weight CAT 797 can carry?

    EXAMPLE 3:
    Input image: An image describing a hiring process with a detailed flowchart
    Sample question: What does the hiring process look like?

    ### END OF EXAMPLES

    ### CURRENT IMAGE ANALYSIS TASK:
    The document summary provided below is supplementary only. Focus primarily on the image content.
    Document Summary: {summary}

    Now, analyze the current image below to generate a NEW, UNIQUE question: 
    Input Image: {chunk}
    `, 
    answerPrompt: 
    `
    ### TASK DEFINITION:
    Generate an answer to the question based primarily on specific information depicted in the given image. Focus on:
    - Specific entities and their relationships shown in the image
    - Labels and their positions in the image 
    - Sequences and dependencies in the image
    - Terminology in the image

    ### GUIDELINES:
    - Use specific nouns and names instead of pronouns
    - Your answer must be self-contained and make sense without additional context
    - Output only the raw answer text without any greetings, markdown, or formatting
    - IMPORTANT: Do NOT reproduce any example answers - create a NEW answer specific to the current image and question

    ### EXAMPLE SECTION (These are only for reference - DO NOT copy these answers):
    EXAMPLE 1:
    Input image: An image showing a diagram of a finetuning process with multiple steps and procedures
    Question: In what 2 datasets is the data divided before finetuning?
    Sample answer: Before finetuning, the data is divided into the training and evaluation set.

    EXAMPLE 2: 
    Input image: An image showing a table of specifications for a specific vehicle
    Question: What is the maximum weight CAT 797 can carry?
    Sample answer: CAT 797 can carry a maximum weight of 400 tons.

    EXAMPLE 3:
    Input image: An image describing a hiring process with a detailed flowchart  
    Question: What does the hiring process look like?
    Sample answer: The hiring process starts with an application submission, followed by a screening interview, technical assessment, final interview, and offer stage.

    ### END OF EXAMPLES

    ### CURRENT IMAGE ANALYSIS TASK:
    The document summary provided below is supplementary only. Focus primarily on the image content.
    Document Summary: {summary}

    Now, analyze the current image and question below to generate a NEW, UNIQUE answer:
    Input Image: {chunk}
    Question: {question} 
    `
    }
];

// Function to create a new custom template
export const createCustomTemplate = (name: string = 'Custom Template'): PromptTemplate => ({
  name,
  questionPrompt: '',
  answerPrompt: ''
}); 