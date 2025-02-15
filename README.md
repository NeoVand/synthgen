# SynthGen: Ollama based synthetic Q&A dataset generation from your data

SynthGen is a user-friendly desktop application that helps you generate high-quality synthetic question-answer datasets from your documents. Perfect for creating training and evaluation datasets for LLMs, embedding models, RAG systems, and other NLP applications.

## Features

📄 **Multi-format Support**: Upload and process documents in various formats (PDF, DOCX, TXT, CSV)

🔄 **Smart Text Chunking**: Configurable text chunking with adjustable size and overlap

🤖 **Ollama Integration**: Leverage local LLMs through Ollama for data generation

📊 **Flexible Generation**: Generate both document summaries and Q&A pairs

✏️ **Interactive Editing**: Edit generated content directly in the interface

💳 **Dual View Modes**: Switch between table view for bulk operations and flashcard view for focused editing

💾 **Easy Export**: Export your dataset as CSV for immediate use

🎛️ **Advanced Controls**: Fine-tune generation parameters (temperature, top-p, context size)

🎯 **Selective Generation**: Generate Q&A for specific chunks or the entire document

🌓 **Dark/Light Mode**: Comfortable viewing in any lighting condition

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally
- A compatible LLM model pulled in Ollama (e.g., mistral, llama2, etc.)
- Node.js 18+ and npm/yarn installed

## Installation

```bash
# Clone the repository
git clone https://github.com/NeoVand/synthgen.git
cd synthgen

# Install dependencies
npm install
# or if you use yarn
yarn install

# Build the application
npm run build
# or
yarn build
```

## Running the Application

### Development Mode
```bash
# Start the development server
npm run dev
# or
yarn dev
```

### Production Mode
```bash
# Start the production build
npm run preview
# or
yarn preview
```

The application will be available at `http://localhost:5173` (dev) or `http://localhost:4173` (preview).

Make sure Ollama is running before starting the application:
```bash
ollama serve
```

## Getting Started

1. Install and start Ollama on your machine
2. Pull your preferred LLM model using Ollama (e.g., `ollama pull mistral`)
3. Launch SynthGen
4. Select your model and adjust generation settings
5. Upload your document
6. (Optional) Generate and edit the document summary
7. Configure chunking parameters and chunk your document
8. Generate Q&A pairs
9. Switch between table and flashcard views to edit content
10. Export your dataset as CSV

## Use Cases

- Creating training data for fine-tuning LLMs
- Building evaluation datasets for RAG systems
- Generating benchmarking data for embedding models
- Creating test sets for question-answering systems
- Bootstrapping training data for domain-specific applications

## Tips for Best Results

- Adjust chunk size based on your document's structure and complexity
- Use temperature to control generation creativity (lower for factual, higher for creative)
- Leverage the summary feature to provide additional context for Q&A generation
- Edit prompts to guide the type of questions and answers generated
- Use selective generation to focus on specific sections of your document
- Switch to flashcard view for focused editing and review of individual Q&A pairs
- Use table view for bulk operations and overall dataset management

## Contributing

Feel free to open issues or submit pull requests with improvements.

## License

[Add your license here]
