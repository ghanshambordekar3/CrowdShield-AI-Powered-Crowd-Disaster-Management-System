# Use official Java 17 JDK
FROM eclipse-temurin:17-jdk-alpine

# Set working directory
WORKDIR /app

# Copy Maven wrapper and project files
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src ./src

# Make mvnw executable
RUN chmod +x mvnw

# Build the Spring Boot project
RUN ./mvnw clean package -DskipTests

# Expose the port your app runs on (default Spring Boot 8080)
EXPOSE 8080

# Set environment variables for database (can override in Render dashboard)
ENV SPRING_DATASOURCE_URL=jdbc:mysql://your-mysql-host:3306/aibuilder_db
ENV SPRING_DATASOURCE_USERNAME=root
ENV SPRING_DATASOURCE_PASSWORD=yourpassword

# Run the Spring Boot JAR
CMD ["java", "-jar", "target/crowdshield-0.0.1-SNAPSHOT.jar"]
