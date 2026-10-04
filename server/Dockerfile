FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=8080
EXPOSE 8080

# Matches `npm start`, but invokes the binary directly. `npx` would shell out to
# resolve it, and silently download a copy at boot if the install ever lost it.
CMD ["./node_modules/.bin/tsx", "src/server.ts"]
