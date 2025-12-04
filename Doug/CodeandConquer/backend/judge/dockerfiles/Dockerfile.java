FROM openjdk:17-alpine

RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

USER executor

