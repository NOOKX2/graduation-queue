# Graduation Queue MVP

ระบบจัดคิวถ่ายรูปรับปริญญาแบบวันเดียว

## Flow

1. User เปิด `/`
2. กรอกชื่อเล่น
3. ระบบสร้างคิว + public token
4. Redirect ไป `/queue/<token>`
5. User เห็นคิวของตัวเองและคิวปัจจุบันแบบ realtime
6. Admin เปิด `/admin`
7. Login ด้วย Supabase Auth
8. Admin สามารถ:
   - เรียกคิวถัดไป
   - ย้อนคิว
   - เลือกคิวใด ๆ แล้วข้ามไปคิวนั้น

## 1) สร้าง Supabase project

สร้าง project ใหม่ที่ Supabase แล้วเปิด SQL Editor

นำ `supabase/schema.sql` ไปรันทั้งหมด

## 2) ตั้งค่า Admin

สร้างผู้ใช้ใน Supabase Dashboard:

Authentication > Users > Add user

จากนั้นหา UUID ของ user แล้วรัน:

```sql
update public.profiles
set role = 'admin'
where id = 'PUT-USER-UUID-HERE';
```

## 3) ตั้งค่า environment

คัดลอก `.env.example` เป็น `.env.local`

ใส่:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

หาได้จาก Supabase Project Settings > API

## 4) ติดตั้งและรัน

```bash
npm install
npm run dev
```

เปิด:

- User: http://localhost:3000
- Admin: http://localhost:3000/admin

## Security note

User ไม่ต้อง Login และใช้ public token ใน URL เป็นตัวระบุคิวของตัวเอง

การแก้คิวทำผ่าน `admin_set_current_queue()` ซึ่งตรวจ role จาก `profiles` ที่ฝั่ง database ดังนั้นการซ่อนปุ่มฝั่งหน้าเว็บอย่างเดียวไม่ใช่ตัวป้องกันหลัก

## Production notes

ก่อนนำไปใช้จริงควรเพิ่ม:
- custom domain
- หน้า admin จัดการสมาชิก admin
- audit log ว่าใครเปลี่ยนคิว
- rate limiting / CAPTCHA ที่หน้า register
- ปุ่ม copy/share queue link
- หน้าแสดง QR code
- validation และ error messages ภาษาไทยให้ละเอียดขึ้น
- backup / monitoring
