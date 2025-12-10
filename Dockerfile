FROM node:18-bullseye

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && pip3 install -U yt-dlp

WORKDIR /app

COPY package.json /app/
RUN npm install --production

COPY . /app

EXPOSE 3000
CMD ["node", "server.js"]
