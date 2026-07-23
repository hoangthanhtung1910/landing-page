# VyVy Order Korea — vận hành và triển khai

## Ma trận môi trường

| Thành phần | Local | Staging | Production |
|---|---|---|---|
| Web | `localhost:3000` | domain staging riêng | domain chính thức + TLS |
| Admin | `localhost:3001` | domain staging riêng | domain nội bộ + TLS |
| API | `localhost:4000` | private service + CORS staging | private service + CORS chính xác |
| MongoDB | database local | database/credential riêng | managed Mongo, backup bật |
| Media | local adapter | bucket staging | S3/CDN adapter trước go-live |

Mỗi môi trường dùng secret, database và storage riêng. Thứ tự deploy: Mongo/indexes + storage → API
(`GET /ready`) → admin → web. Build web chỉ được chạy khi API trả nội dung hợp lệ. Rollback ứng dụng dùng
artifact trước đó; rollback nội dung dùng dashboard/API `/rollback`.

## Health, logs và cảnh báo

- Liveness: `GET /health`; readiness: `GET /ready`; web: `GET /api/health`.
- `GET /health/publishing` cho biết tổng release và số lần revalidation thất bại.
- API ghi mỗi request thành JSON (`method`, `path`, `status`, `durationMs`). Thu thập stdout vào nền tảng log.
- Cảnh báo khi readiness lỗi, HTTP 5xx tăng, `revalidationFailures > 0`, hoặc không có publish thành công
  trong khoảng dự kiến sau thao tác quản trị.

## Backup và phục hồi

Local/staging dùng `scripts/backup-local.sh` và `scripts/restore-local.sh` với ba biến bắt buộc
`MONGO_URI`, `STORAGE_LOCAL_DIR`, `BACKUP_DIR`. Sau restore: chạy `pnpm --filter api indexes`, gọi
`/ready`, `/public/content`, so release number và mở toàn bộ media URL. Production dùng snapshot Mongo
và versioning bucket tương đương; diễn tập restore hàng quý vào database/bucket tách biệt.

## Staging acceptance và production gate

Chạy V1–V15 trong `specs/001-landing-page/quickstart.md`, lưu ảnh/Lighthouse/log tại hồ sơ release.
Sau đó chạy `pnpm launch:gate`. Gate cố ý thất bại nếu thiếu domain thật, xác minh Zalo/Kakao/phone,
brand asset, SEO và tên người duyệt kinh doanh. Không thay các giá trị này bằng placeholder.

## Tiêu chí đo lường cần người sở hữu

| Tiêu chí | Loại | Owner | Mẫu/phương pháp | Bằng chứng |
|---|---|---|---|---|
| SC-002 tìm contact ≤10 giây | pre-launch | Product owner | 5 người dùng mới, mobile | hồ sơ acceptance |
| SC-003 hiểu quy trình ≥4/5 | pre-launch | UX owner | phỏng vấn 5 người | biên bản nghiên cứu |
| SC-005 trust panel ≥80% | pre-launch | UX owner | khảo sát sau tác vụ | biên bản nghiên cứu |
| SC-008 publish-to-live ≤5 phút | pre-launch + monitor | CMS owner | timestamp audit/revalidation | log release |
| SC-009 edit điển hình ≤3 phút | pre-launch | Content owner | 5 lần tác vụ dashboard | hồ sơ acceptance |
| SC-001 contact tap ≥8% | post-launch KPI | Growth owner | event consented `contact_cta` / session | analytics dashboard |
