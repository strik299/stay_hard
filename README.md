# Stay Hard

Aplicación Pomodoro enfocada en proyectos y tareas con seguimiento de tiempo.

## Ejecutar la app en local

1. Clona o descarga este repositorio.
2. Abre una terminal en la carpeta del proyecto (`stay_hard`).
3. Levanta un servidor estático sencillo:
   - Con Node.js: `npx serve .`
   - O con Python: `python3 -m http.server 8080`
4. Abre tu navegador y visita la URL que indique el servidor (por ejemplo `http://localhost:3000` o `http://localhost:8080`).

También puedes abrir directamente el archivo `index.html` en tu navegador, pero usar un servidor evita restricciones del navegador para notificaciones y garantiza que los recursos se carguen correctamente.

## Dónde se guardan los datos

- La aplicación guarda automáticamente proyectos, tareas y ajustes en `localStorage` del navegador.
- Mantén la aplicación en la misma computadora/navegador para conservarlos. El borrado de caché o usar modo incógnito puede eliminar esa información.

## Copias de seguridad manuales

En la parte superior de la app encontrarás dos botones nuevos:

- **📤 Exportar datos**: descarga un archivo JSON con todos tus proyectos, tareas, tiempos y configuración.
- **📥 Importar datos**: restaura un archivo generado previamente desde la app.

Usa estas opciones antes de cambiar de equipo o limpiar tu historial. Tras importar, la aplicación restablece el modo actual y tus estadísticas para que continúes trabajando donde lo dejaste.

## Requisitos del navegador

- Debe permitir `localStorage` y reproducir audio (para la alerta al finalizar un pomodoro).
- Concede permiso de notificaciones si quieres recibir avisos nativos.

¡Listo! Ya puedes trabajar con Stay Hard sin conexión a internet y con tus datos guardados localmente.
