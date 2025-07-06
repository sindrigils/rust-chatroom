# Use the official Node.js image as a builder
FROM node:20-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use a lightweight HTTP server to serve the built application
FROM node:20-alpine

# Install a simple HTTP server
RUN npm install -g serve

# Set the working directory
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose port 80
EXPOSE 80

# Serve the application
CMD ["serve", "-s", "dist", "-l", "80"] 