# --- Build Stage ---
# Use a Maven image with Java 17 to build the application
FROM maven:3.8.5-eclipse-temurin-17 AS builder
 
# Set the working directory inside the container
WORKDIR /app
 
# Copy the entire backend project into the container
# This is simpler and ensures all files (pom.xml, mvnw, .mvn, src) are included.
COPY CrowdShield/ .
 
# Make the Maven wrapper executable
RUN chmod +x mvnw

# Build the application using the Maven wrapper for consistency
RUN ./mvnw clean package -DskipTests

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
