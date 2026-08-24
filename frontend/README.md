# Raw2Ready Frontend

A React + Vite application for transforming raw business ideas into structured market research and business insights.

## Features

* Business idea input form
* OpenAI and Google Gemini model selection
* Client-side form validation
* Loading and API error handling
* Duplicate submission prevention
* Form data persistence using localStorage
* Structured results presentation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

Make sure the Raw2Ready backend is also running on port `8000`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```
