# WordPress Dockerfile for Google Cloud Run
FROM wordpress:php8.2-apache

# Install additional PHP extensions if needed
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Set working directory
WORKDIR /var/www/html

# Copy custom WordPress configuration if needed
# COPY wp-config.php /var/www/html/wp-config.php

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Modify Apache to listen on PORT env var (Cloud Run requirement)
RUN sed -i 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf && \
    sed -i 's/:80/:${PORT}/' /etc/apache2/sites-enabled/000-default.conf

# Create startup script to handle PORT env var
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Apache gets grumpy about PID files pre-existing\n\
rm -f /var/run/apache2/apache2.pid\n\
\n\
# Set PORT from environment variable (Cloud Run requirement)\n\
export APACHE_PORT=${PORT:-8080}\n\
\n\
# Update Apache configuration to use PORT\n\
sed -i "s/Listen 80/Listen ${APACHE_PORT}/" /etc/apache2/ports.conf\n\
sed -i "s/:80/:${APACHE_PORT}/" /etc/apache2/sites-enabled/000-default.conf\n\
\n\
# Start Apache in foreground\n\
exec apache2-foreground' > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["apache2-foreground"]

