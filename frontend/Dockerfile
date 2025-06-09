FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Make entrypoint.sh executable
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

# Use our entrypoint script which ensures recharts is installed and binds to 0.0.0.0
ENTRYPOINT ["./entrypoint.sh"]
