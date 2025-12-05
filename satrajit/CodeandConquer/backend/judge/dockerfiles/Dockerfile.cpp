FROM alpine:3.19

# Install GCC, G++, and build tools
RUN apk add --no-cache \
    gcc \
    g++ \
    libc-dev \
    make

# Security: Run as non-root user
RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

USER executor
