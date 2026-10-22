# TextOps

TextOps is a stateless HTTP API that analyzes text. It uses Node.js 22 and Express, and stores no request data.

## Run locally

```sh
npm ci
npm start
```

The server listens on `0.0.0.0` at port `3000` by default. Set `PORT` to use another port. Run automated tests with `npm test`.

## Frontend

Open `http://localhost:3000/` to use the built-in frontend. It lets you submit text to `/api/analyze`, view key metrics, and inspect top word frequencies.

## Endpoints

Analyze text:

```sh
curl -sS http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello world. Hello Kubernetes!"}'
```

Example response:

```json
{
  "characterCount": 30,
  "wordCount": 4,
  "sentenceCount": 2,
  "estimatedReadingTimeMinutes": 1,
  "topWords": [
    { "word": "hello", "count": 2 },
    { "word": "kubernetes", "count": 1 },
    { "word": "world", "count": 1 }
  ]
}
```

The `text` field must be a non-blank string of at most 50,000 Unicode code points. Invalid requests return a JSON `error` object with a stable code and a human-readable message.

Check health and service information:

```sh
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/api/info
```

The info response includes `applicationName`, `version`, `uptimeSeconds`, and `hostname`.

Every response includes `X-Served-By`, set to the serving host's hostname. Request logs contain the method, path, status, and duration, and never include submitted text.

## Counting rules

- Character count is the number of Unicode code points, including spaces and punctuation. This is not a count of UTF-16 code units or user-perceived grapheme clusters.
- Words are runs of Unicode letters or numbers. An internal straight or curly apostrophe stays within a word, so `can't` is one word. Punctuation otherwise separates words.
- Word frequencies use lowercase forms. When counts tie, words sort in ascending Unicode code point order, so output is deterministic across replicas.
- Sentence count is the number of runs of `.`, `!`, or `?`. Abbreviations with periods therefore count each period run as a sentence ending.
- Reading time is rounded up to whole minutes at 200 words per minute, with a minimum of one minute for accepted non-blank input.
- At most the ten most frequent words are returned.

## Docker

Build and run the container with:

```sh
docker build -t textops .
docker run --rm -p 3000:3000 textops
```

The image uses `node:22-alpine`, installs production dependencies, and runs as the unprivileged `node` user.

## Kubernetes replicas

Each replica handles each request independently and keeps no shared state, so a Kubernetes Service can distribute independent requests across available Pods. A persistent HTTP connection may continue sending requests to the same Pod because the connection is already established; new connections can be balanced separately. `X-Served-By` identifies the hostname that handled each response.

## Publish as a public GitHub repository

Create an empty public repository on GitHub, then run these commands from this folder, replacing `YOUR-USERNAME` with your GitHub username:

```sh
git init
git add .
git commit -m "Build TextOps API"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/textops.git
git push -u origin main
```

The GitHub Actions workflow runs `npm ci`, `npm test`, and a Docker build check on pushes and pull requests. It does not publish an image or deploy the application.
