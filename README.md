# **🚀 Portafolio GitHub**

Un portafolio personal moderno, estético y totalmente automatizado que consume la API pública de GitHub para mostrar tu perfil, estadísticas y repositorios en tiempo real.

## **✨ Características**

* **Diseño Glassmorphism:** Estética "Cyber-Neon" con efectos de cristal, desenfoque y sombras dinámicas.  
* **Sincronización Automática:** Carga tu foto, bio, seguidores y repositorios directamente desde GitHub.  
* **Visor de Código Integrado:** Explora los archivos de tus repositorios sin salir de la web.  
* **Estadísticas en Vivo:** Contador de Stars, Forks y detección automática de tu lenguaje más usado.  
* **Búsqueda y Filtros:** Buscador instantáneo (con *debounce*) y filtrado por tecnologías.  
* **Detección de Webs:** Si un repositorio tiene una URL de despliegue (homepage), muestra un botón especial "WEB".  
* **Optimizado:** Carga diferida (paginación) y animaciones CSS ligeras.

## **🛠️ Tecnologías**

* **HTML5 & CSS3**  
* **Tailwind CSS** (vía CDN)  
* **JavaScript (ES6+)**  
* **GitHub API**  
* **Lucide Icons**

## **🚀 Cómo Usar**

### **Opción A: Archivo Único (Rápido)**

Simplemente abre el archivo index.html en tu navegador. Todo el CSS y JS está incluido.

### **Opción B: Modular (Recomendado)**

Para un proyecto más ordenado, separa el código en 3 archivos:

1. **index.html**: Estructura base.  
2. **style.css**: Todo lo que está dentro de las etiquetas \<style\>.  
3. **script.js**: Todo lo que está dentro de las etiquetas \<script\> (al final del body).

Asegúrate de vincularlos en tu HTML:

\<link rel="stylesheet" href="style.css"\>  
\<\!-- Al final del body \--\>  
\<script src="script.js"\>\</script\>

## **⚙️ Configuración**

Para mostrar **tu perfil**, edita la constante USERNAME al inicio del script:

// script.js o dentro de \<script\>  
const USERNAME \= 'TuUsuarioDeGitHub'; // Ej: 'Gmdrax'

## **⚠️ Límites de la API**

Este proyecto usa la API pública de GitHub.

* **Límite:** 60 peticiones por hora por dirección IP.  
* Si ves un error de "API Error", espera unos minutos o implementa un Token de Acceso Personal (PAT) en los headers del fetch.

## **🎨 Personalización de Colores**

Puedes cambiar la paleta de colores editando la configuración de Tailwind en el head:

colors: {  
    primary: '\#00f2ea',   /\* Color Principal (Cyan) \*/  
    secondary: '\#ff0050', /\* Color Secundario (Rosa) \*/  
    darkbg: '\#050510',    /\* Fondo \*/  
}

## **📄 Licencia**

Este proyecto es de código abierto. ¡Siéntete libre de usarlo y modificarlo\!