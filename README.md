# 🛠️ KeyTool Tracker 

Dashboard interactivo en tiempo real para el control, monitoreo y gestión automatizada de inventario de herramientas mediante Inteligencia Artificial. Desarrollado para el **Entropy Hack** de Key Institute.

## 🚀 Características Principales

- **Monitoreo en Vivo (WebRTC):** Vinculación instantánea mediante código QR para utilizar cualquier dispositivo móvil como cámara transmisora remota.
- **Detección por IA (FastAPI):** Procesamiento de fotogramas en tiempo real para identificar herramientas y actualizar el inventario automáticamente.
- **Gestión Dinámica de Estado:** Control visual de herramientas guardadas vs. fuera de gaveta con alertas de actividad reciente en tiempo real.
- **Diseño Responsivo:** Adaptado tanto para pantallas de escritorio como para interfaces móviles.

## 🧰 Stack Tecnológico

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React
- **Conectividad / Streaming:** PeerJS (WebRTC)
- **Backend:** FastAPI (Python) + Computer Vision / Modelos de IA

## ⚙️ Configuración y Ejecución Local

1. Clona el repositorio:
   ```bash
   git clone [https://github.com/Hopeelex/keytool-tracker.git](https://github.com/Hopeelex/keytool-tracker.git)
   cd keytool-tracker