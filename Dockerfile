# --- Build Stage ---
# Use a Maven image with Java 17 to build the application
FROM maven:3.8.5-eclipse-temurin-17 AS builder
 
# Set the working directory inside the container
WORKDIR /app
 
# Copy the pom.xml first to leverage Docker's layer caching.
# This downloads dependencies only when pom.xml changes.
COPY CrowdShield/pom.xml .
RUN mvn dependency:go-offline -B

# Copy the rest of the backend source code
COPY CrowdShield/ .
 
# Build the application using the standard 'mvn' command
RUN mvn clean package -DskipTests -B

# --- Final Stage ---
# Use a lightweight JRE image for the final container
FROM eclipse-temurin:17-jre-alpine

# Set working directory
WORKDIR /app

# Copy the executable JAR from the builder stage
COPY --from=builder /app/target/crowdshield-0.0.1-SNAPSHOT.jar app.jar

# Expose the port your app runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
