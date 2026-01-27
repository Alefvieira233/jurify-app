# 🚀 JURIFY DEV ENVIRONMENT
# Based on usage of official Node.js Alpine image for minimal footprint

FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies (using clean install for reproducibility)
RUN npm ci

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 8080

# Start development server
CMD ["npm", "run", "dev:8080"]
