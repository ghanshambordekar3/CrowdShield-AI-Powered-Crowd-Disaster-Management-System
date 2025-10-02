# Use a lightweight Nginx image
FROM nginx:1.25-alpine

# Copy static content (HTML, CSS, JS) from the current folder to the Nginx web root
COPY . /usr/share/nginx/html

# Expose port 80 for the web server
EXPOSE 80