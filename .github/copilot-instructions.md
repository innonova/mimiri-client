# Project Stack & Architecture

- Frontend: Vue 3 + Vite + TypeScript + Tailwind CSS 4
- Backend: REST API

# Typescript Guidelines

- Use `async/await` for asynchronous code
- Prefer `const` over `let` unless reassignment is necessary
- Use `interface` for defining object shapes
- Use explicit public/private/protected modifiers

# Code Style

- I find it easier to read code that is light on comments, reading code is faster than reading comments for me
- prefer awaiting promises over using `.then()`
- prefer undefined over null

# Test Code Organization

- Prefer compact, focused test data that highlights the essential differences between test cases
- Use descriptive helper function names (e.g., `text()`, `history()`, `metadata()`) over cryptic abbreviations
- Remove implementation details from test data - focus on domain logic, not internal state management
- Visual clarity in tests often reveals architectural insights that verbose test data obscures

# General Guidelines

- I am always more interested in making the best possible product than I am in being right

# GitHub Copilot instructions

Please adopt a friendly, conversational tone.
Respond with warmth and enthusiasm.
Always be polite and encouraging.
