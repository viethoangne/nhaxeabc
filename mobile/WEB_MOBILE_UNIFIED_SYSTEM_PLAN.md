# Web-Mobile Unified System Plan

Muc tieu: mobile va web dung chung 1 backend + 1 database, khong nhan ban business logic o mobile.

## 1) Nguyen tac bat buoc

- Backend (`backend/src`) la noi duy nhat chua business rule.
- Mobile chi:
  - goi API,
  - hien thi UI,
  - validate input co ban (format, required field),
  - khong tinh toan nghiep vu quan trong (gia ve, rang buoc dat cho, loyalty rule).
- Web admin thao tac du lieu tren cung schema, mobile nhin thay thay doi theo thoi gian thuc qua API.

## 2) API contract hien tai mobile dang dung

- Auth:
  - `POST /auth/login-demo`
  - `POST /auth/google-login`
  - `GET /auth/me`
- Tim chuyen:
  - `GET /chuyenXe?action=searchTrips&from=&to=&date=`
- Dat cho va thanh toan:
  - `GET /payment/booked-seats/:tripId`
  - `POST /payment/create-link`
  - `GET /payment/status/:orderCode`
- Loyalty:
  - `GET /loyalty?userId=...`
  - `POST /loyalty/redeem`
- OTP:
  - `POST /otp/send-otp`
  - `POST /otp/verify`
- Tra cuu:
  - `GET /lookup`

## 3) Cac diem can dong bo de tranh lech logic

1. **Auth response shape phai dong nhat**
   - Tat ca login endpoint tra ve `token` + `user`.
   - Da cap nhat `POST /auth/google-login` tra `token`.

2. **Tinh nang AI goi y/cham diem chuyen**
   - Neu la business rule (anh huong ket qua tim chuyen), chuyen sang backend.
   - Mobile chi render `score/recommendTag` neu backend tra ve.

3. **Tinh tier loyalty**
   - Tier nen la output cua backend (hoac endpoint profile loyalty), khong hard-code nguong o mobile.
   - Tranh truong hop admin doi rule nhung mobile chua cap nhat.

4. **Validation dat cho**
   - Rang buoc ghe, tong tien, voucher hop le va trang thai dat cho phai xac nhan tai backend truoc khi tao payment link.
   - Mobile khong duoc xem local state la su that cuoi cung.

## 4) Lo trinh trien khai de bat dau ngay

### Phase 1 - On dinh contract (uu tien cao)

- [x] Dong bo response `google-login` tra `token`.
- [ ] Tao tai lieu contract JSON mau cho tung endpoint mobile dang dung.
- [ ] Chuan hoa ma loi backend (vd: `INVALID_OTP`, `SEAT_UNAVAILABLE`) de mobile map thong bao.

### Phase 2 - Cat business rule khoi mobile

- [ ] Dua logic scoring/recommend trip sang backend.
- [ ] Dua logic loyalty tier sang backend response.
- [ ] Mobile xoa logic business local, chi giu UI behavior.

### Phase 3 - Shared domain model

- [ ] Tao package dung chung type (hoac copy generated type) cho `Trip`, `Order`, `Loyalty`, `Voucher`.
- [ ] Mobile map du lieu theo type nay, giam sai khac field name.

### Phase 4 - Van hanh 1 he thong

- [ ] Them monitoring API theo client (`web`, `mobile`) de so sanh loi.
- [ ] Viet regression test backend cho booking flow va loyalty flow.
- [ ] Checklist release bat buoc: backend pass test truoc khi release mobile.

## 5) Checklist "Definition of done" cho moi tinh nang moi

- [ ] Rule nghiep vu nam o backend.
- [ ] Web va mobile goi cung endpoint.
- [ ] Co test backend cho rule moi.
- [ ] Mobile khong duplicate rule tinh toan.
- [ ] Admin web sua du lieu/rule thi mobile nhan ket qua dung khong can sua app ngay.
