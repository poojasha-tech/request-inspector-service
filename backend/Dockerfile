FROM node:20-alpine3.16

WORKDIR /app

ENV DATABASE_URL="file:./dev.db"

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma@5 db push

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "app.js"]