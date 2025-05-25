# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package.json and pnpm-lock.yaml (or other lock file)
COPY package.json pnpm-lock.yaml ./
# COPY pnpm-workspace.yaml ./ # Uncomment if you use pnpm workspaces at this level

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build
# Questo creerà una cartella 'dist' con i file statici


# Stage 2: Serve the application with Nginx
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
# Oppure se usi la configurazione di default e vuoi solo sovrascrivere il sito:
# COPY nginx.conf /etc/nginx/conf.d/default.conf


# Remove default Nginx static-site content
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (Nginx default port)
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]