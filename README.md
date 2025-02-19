# SynthGen: AI-Powered Q&A Dataset Generator 🤖

SynthGen is a modern desktop application that helps you create high-quality question-answer datasets from your documents using Ollama's local LLMs. Perfect for training data generation, RAG systems, and NLP applications.

## ✨ Features

- 📝 **Smart Document Processing**: Support for PDF, DOCX, TXT, and CSV files with configurable text chunking
- 🎯 **Customizable Prompts**: Create, edit, and save prompt templates for different types of Q&A generation
- 🔄 **Dual View Modes**: 
  - Table view for bulk operations and dataset management
  - Flashcard view for focused editing of individual Q&A pairs
- ⚡ **Advanced Controls**: 
  - Fine-tune model parameters (temperature, context size, etc.)
  - Platform-aware Ollama connection handling with CORS support
  - Import/Export prompt templates
- 🎨 **Modern UI**: Clean, responsive interface with dark/light mode support
- 🌐 **Zero Backend**: Fully static web application - deploy anywhere, including GitHub Pages

## 🚀 Getting Started

1. Install [Ollama](https://ollama.ai)
2. Start Ollama with CORS enabled:
   ```bash
   # For Windows
   set "OLLAMA_ORIGINS=YOUR_DEPLOYMENT_URL" && ollama serve

   # For macOS/Linux
   OLLAMA_ORIGINS="YOUR_DEPLOYMENT_URL" ollama serve
   ```
   Replace `YOUR_DEPLOYMENT_URL` with your deployment URL (e.g., "https://username.github.io")

3. Pull your preferred model:
   ```bash
   ollama pull mistral
   ```

4. Access SynthGen:
   - Deploy your own instance on GitHub Pages
   - Or run locally:
     ```bash
     git clone https://github.com/NeoVand/synthgen.git
     cd synthgen
     npm install
     npm run dev
     ```

## 💡 Quick Tips

- Use the flashcard view for focused editing of individual Q&A pairs
- Save and reuse prompt templates for consistent Q&A generation
- Adjust model parameters to control the creativity and accuracy of generated content
- Use the table view for bulk operations and dataset management

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🗺️ Roadmap

- 🖼️ **Document Enhancement**:
  - Support for images using vision-language models in Ollama
  - Multi-document processing capabilities
  
- 💾 **Data Management**:
  - Browser-based local data persistence
  - Advanced document chunking with LlamaIndex splitters
  
- 🔌 **LLM Integration**:
  - Support for cloud providers:
    - OpenAI
    - Anthropic
    - Azure
    - Groq
    - Amazon Bedrock
    
- 🎯 **Extended Applications**:
  - Synthetic data generation for:
    - Classification tasks
    - Chat applications
    - Custom NLP applications

## 🤝 Contributing

Feel free to open issues or submit pull requests with improvements.

## 📄 License

MIT

## Prerequisites

1. Install [Ollama](https://ollama.ai) on your local machine
2. Start Ollama with CORS enabled:
   ```bash
   # For local development
   ollama serve

   # For accessing the deployed version
   OLLAMA_ORIGINS=https://neovand.github.io ollama serve
   ```

3. If accessing the deployed version, configure your browser:
   - Chrome/Edge: Enable "Insecure origins treated as secure" in chrome://flags/
   - Firefox: Set "security.fileuri.strict_origin_policy" to false in about:config

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

## Requirements

1. **Ollama**: This application requires Ollama to be running locally on your machine.
   - Install Ollama from [ollama.ai](https://ollama.ai)
   - Make sure Ollama is running before using the application
   - The application will automatically connect to Ollama running on `localhost:11434`

2. **Supported File Types**:
   - PDF files
   - DOCX files
   - TXT files
   - CSV files

## Setup & Running

1. Install Ollama and pull your desired model (e.g., `ollama pull mistral`)
2. Start Ollama on your machine
3. Open the application
4. Select your model in the Model Settings section
5. Upload your document and start generating Q&A pairs!

## Troubleshooting

1. **"Cannot connect to Ollama" error**:
   - Make sure Ollama is installed and running on your machine
   - Check if you can access `http://localhost:11434` in your browser
   - Restart Ollama if needed

2. **File upload issues**:
   - Make sure your file is in a supported format (PDF, DOCX, TXT, CSV)
   - PDF files require proper PDF.js worker setup
   - Large files may take longer to process

## Development

This is a React application built with Vite. To run locally:

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:5173` in your browser

## Building

To build for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT

## How it Works

This application runs entirely in your browser and requires a local Ollama installation. No data is sent to any external servers - all AI processing happens on your machine.
