# IA Calculator Frontend

## Descripción

El frontend de IA Calculator permite a los usuarios dibujar y calcular expresiones matemáticas utilizando un canvas interactivo. La aplicación integra MathJax para renderizar expresiones LaTeX y se comunica con un backend para realizar cálculos matemáticos.

## Características

- Dibujo en canvas con selección dinámica de color
- Integración de MathJax para renderizar expresiones LaTeX
- Botones para reiniciar el canvas y calcular las expresiones dibujadas
- Envío de datos del canvas al backend para procesamiento
- Visualización de resultados como expresiones LaTeX desplazables en el canvas

## Requisitos

- Node.js
- npm

## Instalación

1. Clona el repositorio:

   ```sh
   git clone https://github.com/etzadev/ia-calculator-frontend.git
   cd ia-calculator-frontend
   ```

2. Instala las dependencias:

   ```sh
   npm install
   ```

3. Ejecuta la aplicación React:

   ```sh
   npm start
   ```

## Uso

1. Abre la aplicación en tu navegador:

   ```sh
   http://localhost:5173/
   ```

2. Dibuja en el canvas utilizando las herramientas de color y dibujo.
3. Haz clic en "Calcular" para enviar el dibujo al backend y obtener los resultados.
4. Los resultados se mostrarán como expresiones LaTeX en el canvas, que puedes arrastrar y colocar.

## Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue los siguientes pasos para contribuir:

1. Haz un fork del repositorio.
2. Crea una rama con tu nueva funcionalidad: `git checkout -b mi-nueva-funcionalidad`
3. Realiza los cambios y haz commit: `git commit -m 'Añadir nueva funcionalidad'`
4. Sube los cambios a tu rama: `git push origin mi-nueva-funcionalidad`
5. Abre un Pull Request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
