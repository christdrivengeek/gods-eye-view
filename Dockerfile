FROM node:24-bookworm-slim

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV HOST=0.0.0.0
ENV PORT=2244
ENV VITE_BASE=/2244/
ENV GEV_ALLOWED_HOSTS=sorpodstack.com,www.sorpodstack.com,notestack.cam,localhost,127.0.0.1

EXPOSE 2244

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "2244", "--base", "/2244/"]
