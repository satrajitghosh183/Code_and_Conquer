FROM ruby:3.3-alpine

# Install JSON support (built-in but ensure it's available)
RUN apk add --no-cache build-base

# Security: Run as non-root user
RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

USER executor

# Environment
ENV RUBY_YJIT_ENABLE=1

