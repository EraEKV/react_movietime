# Movietime

A React single-page application for discovering TV series and exploring how their
episodes are rated, powered by the [TMDB API](https://developer.themoviedb.org/docs).

> Midterm project — React SPA (KBTU).

**Live demo:** _coming soon_

## Tech stack

- React 19 + Vite
- React Router (declarative mode)
- CSS Modules
- Plain `fetch` + custom hooks (no data-fetching libraries, so effect logic stays explicit)

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your TMDB Read Access Token
npm run dev
```

| Script            | Description          |
| ----------------- | -------------------- |
| `npm run dev`     | Start the dev server |
| `npm run build`   | Production build     |
| `npm run preview` | Preview the build    |
| `npm run lint`    | Lint with ESLint     |
| `npm run format`  | Format with Prettier |

## Environment variables

| Name              | Description                         |
| ----------------- | ----------------------------------- |
| `VITE_TMDB_TOKEN` | TMDB API Read Access Token (Bearer) |

## Deployment

Deployed on Vercel. `vercel.json` rewrites every path to `index.html` so client-side
routes survive a page refresh. `VITE_TMDB_TOKEN` is set in the Vercel project settings.

## Project structure

```
src/
├── api/          # TMDB client and endpoint helpers
├── components/   # Reusable UI components
├── hooks/        # Custom hooks (data fetching, debounce, ...)
├── pages/        # Route-level components
├── styles/       # Global styles and design tokens
└── utils/        # Pure helpers
```
