FROM node:18-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && pip3 install -U yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm install --production
COPY . /app

RUN mkdir -p /app/downloads
EXPOSE 3000

CMD ["node","server.js"]
