# Nigerian Legal Document Analyzer

A web application that analyzes Nigerian legal documents using AI to provide insights, risk analysis, and key information extraction.

## Features

- Document upload and analysis (PDF, DOCX, TXT)
- AI-powered legal document analysis
- Risk assessment and scoring
- Key clause identification
- Entity extraction
- Nigerian law references
- Multi-language support (English, Yoruba, Hausa, Igbo, Nigerian Pidgin, French)
- Document generation with improvements

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Groq AI
- Zustand for state management
- Shadcn/ui components

## Getting Started

1. Clone the repository:
\`\`\`bash
git clone [your-repo-url]
cd [your-repo-name]
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
Create a \`.env.local\` file with:
\`\`\`
GROQ_API_KEY=your_groq_api_key
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

- \`GROQ_API_KEY\`: Your Groq API key for AI analysis

## Deployment

This project is deployed on Vercel. The production version can be found at .

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
