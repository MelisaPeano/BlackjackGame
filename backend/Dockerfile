# Usar una imagen de Python ligera para optimizar el despliegue
FROM python:3.12-slim

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar los archivos del backend al entorno aislado
COPY . /app/

# Exponer el puerto para permitir la comunicación
EXPOSE 5000

# Comando por defecto para iniciar el servidor TCP/HTTP
CMD ["python", "server.py"]