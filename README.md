# Santa Biblia 1909 — Con Agente IA 📖

## Instrucciones de Publicación en GitHub Pages

### 1. Archivos que debes subir a tu repositorio

```
tu-repositorio/
├── index.html      ← Cargador principal (protegido)
├── sw.js           ← Service Worker (caché offline)
├── bible.enc       ← Tu Biblia cifrada con XOR+Base64
└── manifest.json   ← PWA manifest
```

### 2. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Source: **Deploy from a branch**
4. Branch: `main` → `/root`
5. Guardar

Tu app estará en: `https://TU-USUARIO.github.io/TU-REPO/`

---

## ¿Cómo funciona la protección?

| Capa | Qué hace |
|------|----------|
| **Cifrado XOR + Base64** | `bible.enc` es ilegible — no es HTML |
| **Service Worker** | Cachea `bible.enc` cifrado en el navegador |
| **iframe srcdoc** | El contenido vive en un iframe, no en el DOM principal |
| **Descifrado en memoria** | La clave se fragmenta y el HTML se borra de memoria tras render |
| **Bloqueo de inspector** | F12, Ctrl+Shift+I, clic derecho bloqueados |

### Caché offline
- **Primera visita**: descarga `bible.enc` (≈342KB) y lo guarda cifrado
- **Visitas siguientes**: carga 100% desde caché — **0 datos consumidos**
- **Sin internet**: funciona igual gracias al Service Worker

---

## Regenerar el cifrado (si actualizas el contenido)

```python
import base64

with open('Santa_Biblia_1909_IA_v19.html', 'rb') as f:
    content = f.read()

key = b'Biblia1909RVA-ProtectedContent-Key-2024-GitHubPages'
encrypted = bytearray(b ^ key[i % len(key)] for i, b in enumerate(content))
b64 = base64.b64encode(bytes(encrypted)).decode()

with open('bible.enc', 'w') as f:
    f.write(b64)
```

---

> ⚠️ **Nota**: Esta protección disuade al usuario casual.
> Un desarrollador determinado con tiempo puede revertir el proceso.
> Para protección completa considera un backend con autenticación.
