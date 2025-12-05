FROM golang:1.22-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

# Pre-download common packages
ENV GOPROXY=https://proxy.golang.org,direct
ENV GO111MODULE=on

USER executor
