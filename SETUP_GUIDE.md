# DAS 2.0 - Hướng dẫn Triển khai Môi trường Cục bộ

Tài liệu này cung cấp hướng dẫn từng bước, không thể thất bại, để một kỹ sư mới có thể thiết lập và chạy toàn bộ hệ sinh thái backend và frontend của dự án DAS trên máy cục bộ.

## 1. Yêu cầu Cài đặt (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt các công cụ sau trên hệ thống của mình:

-   **[pnpm](https://pnpm.io/installation)**: Trình quản lý package hiệu suất cao.
-   **[Docker](https://www.docker.com/products/docker-desktop/)**: Nền tảng container hóa.
-   **[Node.js](https://nodejs.org/en)** (v18+).

## 2. Các Bước Thiết lập

### Bước 1: Clone Repository

Clone repository của dự án về máy của bạn:

```bash
git clone <repository_url>
cd <repository_folder>
```

### Bước 2: Cấu hình Biến môi trường

Toàn bộ hệ thống backend sử dụng một file `.env` chung đặt tại thư mục `das-backend`.

1.  Di chuyển vào thư mục backend:
    ```bash
    cd das-backend
    ```
2.  Tạo file `.env` bằng cách sao chép từ file mẫu:
    ```bash
    cp .env.example .env
    ```
3.  Mở file `.env` và xem lại các giá trị. Các giá trị mặc định đã được cấu hình để hoạt động với Docker Compose. Bạn không cần thay đổi gì ở bước này.

### Bước 3: Khởi chạy Hạ tầng với Docker Compose

Lệnh sau sẽ khởi tạo tất cả các dịch vụ hạ tầng cần thiết trong các container Docker chạy nền:

-   PostgreSQL (CSDL chính)
-   RabbitMQ (Message Broker)
-   MinIO (Lưu trữ file S3-compatible)
-   Redis (Caching)

Từ thư mục `das-backend`, chạy lệnh:

```bash
docker-compose up -d
```

Để kiểm tra trạng thái các container, sử dụng `docker-compose ps`.

### Bước 4: Cài đặt Dependencies

Sử dụng `pnpm` để cài đặt tất cả dependencies cho monorepo từ thư mục gốc của dự án:

```bash
# Đảm bảo bạn đang ở thư mục gốc của repo
pnpm install
```

### Bước 5: Khởi tạo Cơ sở dữ liệu

Sau khi container Postgres đã chạy, chúng ta cần áp dụng schema vào cơ sở dữ liệu.

Từ thư mục gốc, chạy lệnh sau để thực thi Prisma Migrate:

```bash
pnpm --filter @das/prisma-client exec prisma migrate dev
```

Bạn sẽ được yêu cầu nhập tên cho migration, ví dụ: `init`.

### Bước 6: Khởi chạy Toàn bộ Hệ thống

Bây giờ, bạn có thể khởi chạy tất cả các microservice backend và ứng dụng frontend trong chế độ watch (hot-reloading).

-   **Backend**: Các app NestJS sẽ tự động biên dịch và khởi động lại khi có thay đổi.
-   **Frontend**: Vite dev server sẽ khởi chạy.

Từ thư mục gốc, chạy lệnh:

```bash
pnpm start:dev
```

### Bước 7: Truy cập Hệ thống

Sau khi các dịch vụ đã khởi động thành công, bạn có thể truy cập:

-   **Frontend Application**: [http://localhost:5173](http://localhost:5173)
-   **API Gateway (Base URL)**: [http://localhost:3000](http://localhost:3000)
-   **Swagger API Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
-   **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Credentials: `minioadmin` / `minioadmin`)
-   **RabbitMQ Management**: [http://localhost:15672](http://localhost:15672) (Credentials: `guest` / `guest`)

Hệ thống của bạn hiện đã sẵn sàng để phát triển. Mọi thay đổi trong mã nguồn sẽ được tự động cập nhật.