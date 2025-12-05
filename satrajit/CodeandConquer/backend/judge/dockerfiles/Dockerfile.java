FROM eclipse-temurin:21-jdk-alpine

# Install required tools
RUN apk add --no-cache curl

# Download Gson for JSON serialization
RUN mkdir -p /usr/share/java && \
    curl -L -o /usr/share/java/gson.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

# Security: Run as non-root user
RUN addgroup -g 1001 -S executor && \
    adduser -u 1001 -S executor -G executor

WORKDIR /sandbox
RUN chown executor:executor /sandbox

# Set classpath for Gson
ENV CLASSPATH=/usr/share/java/gson.jar:.

USER executor
