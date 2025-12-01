# Arquitectura del Sistema (SmartSalud V5)

```mermaid
flowchart TD
    subgraph Frontend[Frontend (Next.js 15)]
        FE[UI: BulkCallManager, Dashboard, Calls]
    end

    subgraph Backend[Backend (Node.js + Express)]
        API[API Routes]
        Service[Servicios]
        Queue[CallQueueService (in‑memory queue)]
    end

    subgraph DB[Base de datos]
        PostgreSQL[(PostgreSQL)]
    end

    subgraph Ext[Integraciones Externas]
        Eleven[ElevenLabs API]
        Twilio[Twilio (WhatsApp & Voice)]
        OpenAI[OpenAI (Groq LLM)]
    end

    FE -->|HTTP (REST)| API
    API --> Service
    Service --> Queue
    Service --> PostgreSQL
    Queue -->|Procesa llamadas| Eleven
    Queue -->|Envía SMS/WhatsApp| Twilio
    Service -->|Genera texto/IA| OpenAI
    PostgreSQL -->|Datos de pacientes, citas, llamadas| Service
    style Frontend fill:#f9f9f9,stroke:#333,stroke-width:2px
    style Backend fill:#e6f7ff,stroke:#333,stroke-width:2px
    style DB fill:#fff3e0,stroke:#333,stroke-width:2px
    style Ext fill:#ffe6e6,stroke:#333,stroke-width:2px
```

**Descripción**
- **Frontend**: aplicación React con Next.js 15, UI premium, toasts (Sonner) y polling cada 5 s.
- **Backend**: Express expone los endpoints (`/calls`, `/appointments`, `/metrics`).
- **CallQueueService**: gestiona la cola de llamadas con concurrencia configurable (por defecto 1, recomendado 3‑5). En modo simulación registra la llamada en la DB.
- **Base de datos**: Prisma ORM sobre PostgreSQL almacena pacientes, citas y registro de llamadas.
- **Integraciones**: ElevenLabs para voz, Twilio para WhatsApp y llamadas, OpenAI (Groq) para detección de intención.

---
*Última actualización: 2025‑11‑24*
