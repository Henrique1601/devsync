FROM node:22-alpine AS source
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY ui ./ui
RUN node --check src/coordinator.js && node --check src/cli.js

FROM node:22-alpine AS coordinator
WORKDIR /app
ENV NODE_ENV=production \
    DEVSYNC_COORDINATOR_HOST=0.0.0.0 \
    DEVSYNC_COORDINATOR_PORT=8787 \
    DEVSYNC_COORDINATOR_HOME=/data
RUN mkdir /data && chown node:node /data
COPY --from=source --chown=node:node /app ./
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.DEVSYNC_COORDINATOR_PORT+'/api/health',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/cli.js", "coordinator"]
