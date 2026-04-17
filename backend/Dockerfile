# Use official Node image
FROM node:20-alpine3.16

# Set working directory
WORKDIR /app

# Set default environment variable
ENV DATABASE_URL="file:./dev.db"

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of project
COPY . .

# create db schema and generate prisma client
RUN npx prisma@5 db push

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "app.js"]