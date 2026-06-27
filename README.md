# AI Resume Analyzer

A MERN stack application for uploading resumes, extracting content, analyzing ATS readiness, and reviewing resume improvements with AI.

## Features
- Upload and store resumes
- Extract text from PDF resumes
- Analyze resume quality with Gemini AI
- View ATS scoring, strengths, issues, and rewrite suggestions
- Manage resume versions and analyses

## Project Structure
- backend: Express.js + MongoDB + authentication + AI analysis routes
- frontend: React + Vite UI for resume upload, dashboard, and analysis views

## Prerequisites
- Node.js 18+
- MongoDB running locally or via MongoDB Atlas
- A Gemini API key

## Backend Setup
1. Open the backend folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the backend folder with:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d
   COOKIE_NAME=auth_token
   CLIENT_ORIGIN=http://localhost:5173
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```

## Frontend Setup
1. Open the frontend app folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

## Usage
- Open the frontend in your browser
- Register or log in
- Upload a resume PDF
- Review the analysis and suggested improvements

## Notes
- Keep your `.env` file private and do not commit it to GitHub.
- The backend uses Gemini AI for resume analysis; ensure your API key has access to the selected model.
