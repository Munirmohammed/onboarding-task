# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
# Install ALL dependencies (including dev) to build TS, then prune
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]