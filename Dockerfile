FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y nodejs npm ffmpeg curl

WORKDIR /app

COPY . .

# Install Python packages
RUN pip install -U yt-dlp

# Install Node dependencies
RUN npm install --production

EXPOSE 3000

CMD ["node", "server.js"]
