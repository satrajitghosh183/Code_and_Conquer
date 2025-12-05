FROM php:8.3-cli-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

USER executor

# Environment
ENV PHP_CLI_SERVER_WORKERS=1

