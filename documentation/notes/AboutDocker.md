# Docker — How It Works

## What is a Docker image?

A Docker image is a **read-only snapshot** of everything an application needs to run:

- Your source code (`src/`)
- Config files (`.auth.json`)
- The runtime (Node.js)
- The operating system (Alpine Linux)
- All dependencies (`node_modules/`)

Think of it as a **packaged `.tar.gz` of the entire root filesystem (`/`)** with the OS, runtime, and app baked in.

When you build an image, Docker layers each step (install OS packages, copy files, install npm deps) on top of the previous one. Layers are cached — if you only change your source code, only that layer rebuilds.

## Image vs Container

| Concept | What it is |
|---|---|
| **Image** | A blueprint / snapshot (like a `.iso` file). Created once with `docker build`. |
| **Container** | A running instance of an image (like a VM). Created with `docker run`. |

```
docker build -t advancedgui .     # creates image (blueprint)
docker run -d -p 8080:8080 advancedgui   # creates + runs a container from that image
```

You can start many containers from the same image. Changes made inside a container (logs, temp files) are lost when it's deleted. The image stays untouched.

## Where are the files?

- Image layers are stored in `/var/lib/docker/overlay2/` (internal — don't touch)
- To peek inside an image:
  ```sh
  docker run --rm -it advancedgui sh
  ls /app/src
  cat /etc/os-release
  ```

## Portability

Anyone with Docker can build and run the app — **no Node.js, npm, or Linux needed on the host**:

```sh
git clone <repo>
cd advancedGUI/advancedGUI
docker build -t advancedgui .
docker run -d -p 8080:8080 --init advancedgui
```

The image contains Alpine Linux + Node.js + the app. Everything runs inside a container.

### Works on all major OSes

| Host OS | How it works |
|---|---|
| **Linux** | Native — containers share the host kernel |
| **macOS** | Runs inside a lightweight Linux VM (Docker Desktop) |
| **Windows** | Runs inside a WSL2-based Linux VM (Docker Desktop) |

The only requirement on the host is **Docker itself**.

## How our Dockerfile works

```dockerfile
FROM node:22-alpine       # Start with Node.js on Alpine Linux
WORKDIR /app              # Working directory inside the container
RUN apk add --no-cache tini   # Install tini for proper signal handling
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx   # Install production deps + tsx
COPY src/ ./src/          # Copy application source
COPY .auth.json ./        # Copy auth config
EXPOSE 8080               # Document the port
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "src/main/index.ts"]   # Start the app
```

We use `tsx` at runtime (same as `npm start`) because the project has pre-existing TypeScript type errors in third-party libraries that don't affect runtime behavior.
