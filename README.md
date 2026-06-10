# Sistema Solar 3D

Aplicación web educativa para explorar el sistema solar con modelos 3D,
fichas visuales, estructura interna de cada cuerpo celeste, comparación
entre planetas y un modo de estudio para armar el sistema solar colocando
cada planeta en su órbita.

## Qué incluye

- Visor 3D interactivo para modelos `.glb` (rotar, zoom, AR y vista 360°).
- Galería educativa con estructura interna y ficha visual por cuerpo celeste.
- Comparador de dos cuerpos celestes lado a lado.
- Panel de detalles con tipo, característica, ubicación y lunas.
- Notas astronómicas y datos curiosos de cada planeta.
- Modo `Estudio` para armar el sistema solar arrastrando cada planeta
  hasta su órbita en una escena 3D.

## Cuerpos celestes incluidos

Sol, Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno.

## Descargar el proyecto

Opción 1: desde GitHub

1. Abre este repositorio en GitHub.
2. Haz clic en `Code`.
3. Selecciona `Download ZIP`.
4. Descomprime la carpeta descargada.

Opción 2: con Git

```bash
git clone https://github.com/ilver12/Sistema_solar_3D.git
cd Sistema_solar_3D/app
```

## Cómo usar la app

Necesitas tener Node.js instalado. Descárgalo desde:

https://nodejs.org

Luego abre una terminal dentro de la carpeta `app` y ejecuta:

```bash
npm start
```

Cuando aparezca el mensaje `Accepting connections at http://localhost:5173`,
abre el navegador en:

```text
http://localhost:5173/app/
```

Para entrar al modo de armado 3D, abre:

```text
http://localhost:5173/app/studio.html
```

Para detener el servidor, vuelve a la terminal y presiona `Ctrl + C`.

## Alternativas de ejecución

Desde la carpeta `app` también puedes ejecutar:

```bash
npm run start:py
```

o:

```bash
npm run start:node
```

La app debe servirse con un servidor local. No abras `index.html` con doble
clic, porque el visor 3D puede no cargar correctamente los modelos `.glb`.

## Estructura

```text
Sistema_solar_3D/
|-- app-assets/                     # modelos 3D, miniaturas, estructuras y fichas
|   |-- 3D/                         # modelos .glb de los 9 cuerpos celestes
|   |-- anatomia/                   # estructura interna de cada cuerpo
|   |-- cuerpos_transparentes/      # imágenes grandes con fondo transparente
|   |-- datos_importantes/          # fichas visuales
|   |-- identidad/                  # logo, órbitas y fondo espacial
|   `-- miniaturas/                 # miniaturas para el menú lateral
|-- app/                            # aplicación web
|   |-- index.html                  # galería principal
|   |-- studio.html                 # modo de armado del sistema solar
|   |-- package.json
|   |-- css/
|   `-- js/                         # data.js contiene los datos educativos
`-- COMO_EJECUTAR.txt
```

## Notas

La aplicación es estática: no necesita backend ni base de datos. Los datos
educativos están en `app/js/data.js` y los recursos se cargan desde las
carpetas locales del proyecto.

## Créditos

- Estructura basada en la plantilla educativa
  [Cuerpo-humano_3D](https://github.com/jceronch1/Cuerpo-humano_3D) del profesor.
- El modelo 3D del Sol usa la textura del modelo público de la NASA
  (Sun 1:1391000).
