# AdAstra Docker 部署

AdAstra 是**纯前端静态 PWA**：没有后端、数据库或 `/api` 反代。Compose 栈只有一个 `frontend` 服务（Vite 构建产物 + Nginx）。

所有 Compose 与镜像定义集中在 `docker/` 目录。在仓库根目录执行 Compose 时，请使用 `-f docker/docker-compose.yml` 与 `--env-file docker/.env`。

## 运行时架构


| 组件  | 说明                                                                                 |
| --- | ---------------------------------------------------------------------------------- |
| 前端  | 镜像由 `docker/Dockerfile.frontend` 构建：`npm ci` + `npm run build` + Nginx 监听 **8080** |


构建使用 `npm run build`（开发夹具星表 `fixture-bright-stars`）。生产星表仍受数据授权门禁限制，**不要**在门禁未通过时改用 `build:release`，否则镜像构建会失败。详见仓库内 `docs/data-release-gate.md`。

改前端后须 `build frontend`；仅重启容器不会更新页面。

**构建上下文（**`build.context`**）为仓库根目录**。仓库根 `.dockerignore` 在构建时生效。

## 目录说明


| 文件                    | 作用                                                                  |
| --------------------- | ------------------------------------------------------------------- |
| `docker-compose.yml`  | 编排唯一服务 `frontend`                                                   |
| `Dockerfile.frontend` | Node 22 构建静态资源 + Nginx 托管 SPA                                       |
| `nginx.conf`          | 容器内监听 **8080**；SPA `try_files`；Service Worker / `index.html` 禁用长期缓存 |
| `.env.example`        | 环境变量模板，复制为 `docker/.env` 后按需修改                                      |




## 端口与映射


| 服务              | 容器内端口 | 默认宿主机映射                              |
| --------------- | ----- | ------------------------------------ |
| frontend（nginx） | 8080  | `FRONTEND_PUBLISH_PORT`（默认 **8083**） |


## 前置条件

- 已安装 [Docker](https://docs.docker.com/get-docker/) 与 [Docker Compose V2](https://docs.docker.com/compose/)

## 配置

1. 复制环境变量文件：
  ```bash
   cp docker/.env.example docker/.env
  ```
2. 编辑 `docker/.env`：
  - `COMPOSE_PROJECT_NAME`：默认 `adastra`（同机部署时勿删）
  - 若端口冲突，调整 `FRONTEND_PUBLISH_PORT`，并同步更新 tencentDocker 的 `ADASTRA_FRONTEND_UPSTREAM`



## 启动与停止

在**仓库根目录**执行：

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env build
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
```

或在 `docker/` 目录下：

```bash
cd docker
docker compose --env-file .env build
docker compose --env-file .env up -d
```

停止并删除容器：

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env down
```



## 更新代码后重新部署

```bash
git pull
docker compose -f docker/docker-compose.yml --env-file docker/.env build
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
```



## 自检

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8083/
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8083/service-worker.js
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8083/manifest.webmanifest
```

期望均为 **200**。浏览器打开 `http://127.0.0.1:8083/` 应能加载星空页；正式离线安装请使用 `https://adastra.zhangzhicheng.info/`。

## 常见问题


| 症状                                          | 处理                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 改了前端页面线上没变化                                 | `docker compose ... build frontend && up -d frontend`                                                        |
| 与其他项目端口冲突                                   | 修改 `FRONTEND_PUBLISH_PORT`，并同步更新 tencentDocker 的 `ADASTRA_FRONTEND_UPSTREAM`                                 |
| Service Worker 不更新 / 一直旧版                   | 确认 `nginx.conf` 对 `/service-worker.js` 设置了 `Cache-Control: no-cache`，并走 HTTPS 域名访问                           |
| `npm run build` 在镜像里失败且提到 productionAllowed | 不要改用 `build:release`；当前线上包使用夹具星表                                                                             |
| 页面能开但 Service Worker 安装失败                   | `cache.addAll` 会预缓存 `/favicon-32.png`、`/icon-192.png` 等；仓库当前默认只有 `public/favicon.svg`。缺 PNG 时在线浏览仍可用，离线安装会失败 |


