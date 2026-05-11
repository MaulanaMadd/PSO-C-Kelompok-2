FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["sh"."-c","npm run start -- -H 0.0.0.0 -p ${PORT:-8080}"]