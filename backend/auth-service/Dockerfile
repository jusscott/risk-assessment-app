FROM node:18-bullseye

# Install build essentials for any native dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# First clean any problematic packages (ensures bcrypt is removed)
RUN rm -rf node_modules
RUN npm cache clean --force

# Install dependencies
RUN npm install
# Ensure bcryptjs is installed and no bcrypt
RUN npm uninstall bcrypt || true
RUN npm install --save bcryptjs
# Ensure TypeScript types for bcryptjs are installed
RUN npm install --save-dev @types/bcryptjs
# Make sure TypeScript can find the types
RUN npm install --save-dev tsconfig-paths

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 5001

# Create a script to run migrations and start the app
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use the entrypoint script
CMD ["/app/entrypoint.sh"]
