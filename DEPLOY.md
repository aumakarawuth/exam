# คู่มือ Deploy ระบบข้อสอบขึ้นใช้งานจริง

เอกสารนี้พาไปทีละขั้นตอน เลือกทำแค่ **1 ตัวเลือก** ที่เหมาะกับสถานการณ์ของคุณ:

| ตัวเลือก | เหมาะกับ | ความยาก | ค่าใช้จ่าย |
|---|---|---|---|
| **A. Railway** | ครูคนเดียว ไม่มีเซิร์ฟเวอร์ อยากได้ลิงก์ใช้เร็วที่สุด | ง่ายที่สุด | ฟรี (มี quota) |
| **B. Render** | คล้าย Railway เป็นทางเลือกสำรอง | ง่าย | ฟรี (มี cold-start หน่วง) |
| **C. VPS โรงเรียนเอง** | มีเซิร์ฟเวอร์/โดเมนของโรงเรียนอยู่แล้ว ต้องการคุมเองเต็มที่ | ปานกลาง-ยาก | ตามค่าเซิร์ฟเวอร์ |

ทุกตัวเลือกต้องมี **โค้ดอยู่บน GitHub** ก่อน (ขั้นตอนที่ 0) แล้วค่อยเลือก A, B หรือ C

---

## ขั้นตอนที่ 0: เตรียมโค้ดขึ้น GitHub (ทำครั้งเดียว ทุกตัวเลือกต้องใช้)

1. สร้างบัญชี GitHub ฟรีที่ https://github.com (ถ้ายังไม่มี)
2. สร้าง repository ใหม่ (กดปุ่ม **New repository** สีเขียว) ตั้งชื่อเช่น `exam-system` เลือก **Private** ถ้าไม่อยากให้คนอื่นเห็นโค้ด
3. แตกไฟล์ `exam-backend.zip` ที่ได้รับในเครื่องตัวเอง จะได้โฟลเดอร์ `exam-backend/`
4. เปิด Terminal / Command Prompt ในโฟลเดอร์นั้น แล้วรันทีละบรรทัด:
   ```bash
   git init
   git add .
   git commit -m "ระบบข้อสอบเริ่มต้น"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้ของคุณ>/exam-system.git
   git push -u origin main
   ```
   (แทน `<ชื่อผู้ใช้ของคุณ>` ด้วย GitHub username จริง — GitHub จะมีคำสั่งชุดนี้ให้คัดลอกอยู่แล้วในหน้า repo ที่สร้างใหม่)
5. ตรวจว่าไฟล์ `.env` **ไม่ถูกอัปโหลด** ขึ้นไป (มี `.gitignore` กันไว้ให้แล้ว) — เห็นแค่ `.env.example` บน GitHub ก็ถูกต้อง

---

## ตัวเลือก A: Deploy ด้วย Railway (แนะนำ ง่ายที่สุด)

1. ไปที่ https://railway.app แล้ว **Sign in with GitHub**
2. กด **New Project** → **Deploy from GitHub repo** → เลือก repo `exam-system` ที่เพิ่ง push ไป
3. Railway จะ build และรันให้อัตโนมัติ (มันมองเห็น `package.json` แล้วรัน `npm install && npm start` ให้เอง)
4. ตั้งค่า Environment Variable:
   - ไปที่แท็บ **Variables** ของโปรเจกต์
   - เพิ่มตัวแปร `ADMIN_KEY` = รหัสผู้ดูแลที่คาดเดายาก (เช่น `Sc00l-Exam-2569!xk`)
   - (ไม่ต้องตั้ง `PORT` เอง Railway จัดการให้)
5. ไปที่แท็บ **Settings** → **Networking** → กด **Generate Domain** จะได้ลิงก์สาธารณะ เช่น
   `https://exam-system-production.up.railway.app`
6. ทดสอบ:
   - หน้านักเรียน: `https://exam-system-production.up.railway.app/`
   - หน้าผู้ดูแล: `https://exam-system-production.up.railway.app/admin`
7. **ทุกครั้งที่แก้โค้ดแล้ว `git push`** Railway จะ deploy เวอร์ชันใหม่ให้อัตโนมัติ

**ข้อควรรู้เรื่องข้อมูล:** Railway free tier ปกติเก็บไฟล์ (`data/db.json`) ได้ระหว่างรัน แต่ถ้าอยากมั่นใจว่าข้อมูลไม่หายเวลา redeploy ให้เพิ่ม **Volume** (แท็บ Settings → Volumes → New Volume → mount ที่ path `/app/data`) — กันไว้ก่อนดีที่สุด

---

## ตัวเลือก B: Deploy ด้วย Render

1. ไปที่ https://render.com แล้ว **Sign in with GitHub**
2. กด **New +** → **Web Service** → เลือก repo `exam-system`
3. ตั้งค่า:
   - **Name**: exam-system (หรือชื่อที่ต้องการ)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. เลื่อนลงไปที่ **Environment Variables** → เพิ่ม `ADMIN_KEY` = รหัสผู้ดูแล
5. กด **Create Web Service** รอ build เสร็จ (2-5 นาที) จะได้ลิงก์ เช่น
   `https://exam-system.onrender.com`
6. เพิ่ม **Disk** (แท็บ Disks → Add Disk → mount path `/opt/render/project/src/data`) เพื่อกันข้อมูลหายตอน redeploy

**ข้อควรรู้:** Free tier ของ Render จะ "หลับ" เมื่อไม่มีคนเข้าใช้นานเกิน 15 นาที ครั้งแรกที่มีคนเปิดหลังจากนั้นจะโหลดช้าประมาณ 30-60 วินาที (cold start) — ถ้าจะใช้สอบจริงพร้อมกันหลายคน แนะนำเปิดหน้าทิ้งไว้ล่วงหน้า 1-2 นาทีก่อนเริ่มสอบ

---

## ตัวเลือก C: Deploy บน VPS ของโรงเรียนเอง (Ubuntu + PM2 + Nginx + HTTPS)

เหมาะถ้าโรงเรียนมีเซิร์ฟเวอร์/โดเมนอยู่แล้ว และต้องการคุมข้อมูลเองทั้งหมด

### C.1 ติดตั้ง Node.js บนเซิร์ฟเวอร์
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # ควรขึ้น v20.x ขึ้นไป
```

### C.2 ดึงโค้ดขึ้นเซิร์ฟเวอร์
```bash
cd /var/www
sudo git clone https://github.com/<ชื่อผู้ใช้ของคุณ>/exam-system.git
cd exam-system/exam-backend
sudo npm install
cp .env.example .env
nano .env        # แก้ ADMIN_KEY เป็นรหัสจริง, ตั้ง PORT=3000 (หรือพอร์ตที่ต้องการ)
```

### C.3 รันแบบถาวรด้วย PM2 (ไม่หลุดเมื่อปิด terminal หรือรีสตาร์ทเครื่อง)
```bash
sudo npm install -g pm2
pm2 start server.js --name exam-system
pm2 save
pm2 startup        # จะขึ้นคำสั่งให้คัดลอกไปรันอีกบรรทัด ทำตามนั้น
```
ตรวจสถานะได้ด้วย `pm2 status` / ดู log ด้วย `pm2 logs exam-system`

### C.4 ตั้ง Nginx เป็น Reverse Proxy (ให้เข้าผ่านโดเมนได้โดยไม่ต้องพิมพ์ :3000)
```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/exam-system
```
ใส่เนื้อหานี้ (แก้ `exam.yourschool.ac.th` เป็นโดเมนจริง):
```nginx
server {
    listen 80;
    server_name exam.yourschool.ac.th;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
เปิดใช้งานและรีโหลด:
```bash
sudo ln -s /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### C.5 เปิด HTTPS ฟรีด้วย Let's Encrypt
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d exam.yourschool.ac.th
```
ทำตามคำถามที่ขึ้น (ใส่อีเมล, ยอมรับเงื่อนไข) certbot จะตั้งค่า HTTPS และต่ออายุใบรับรองอัตโนมัติให้

### C.6 ทดสอบ
- หน้านักเรียน: `https://exam.yourschool.ac.th/`
- หน้าผู้ดูแล: `https://exam.yourschool.ac.th/admin`

### C.7 อัปเดตโค้ดครั้งต่อไป
```bash
cd /var/www/exam-system/exam-backend
git pull
npm install
pm2 restart exam-system
```

---

## เช็กลิสต์ก่อนใช้งานจริงกับนักเรียน (ทำทุกตัวเลือก)

- [ ] เปลี่ยน `ADMIN_KEY` เป็นรหัสที่คาดเดายาก ไม่ใช่ `changeme123`
- [ ] เข้า `/admin` ทดสอบ login ด้วย Admin Key จริงได้
- [ ] นำเข้ารายชื่อนักเรียนจริงในแท็บ "รายชื่อนักเรียน"
- [ ] สร้าง/แก้ชุดข้อสอบจริง กำหนดห้องที่มีสิทธิ์และอาจารย์ประจำวิชาให้ครบ
- [ ] ทดลองล็อกอินฝั่งนักเรียนด้วยรหัสนักเรียนจริง 1 คน ทำข้อสอบให้ครบทุกส่วนดูว่าคะแนน/PDF/Excel ออกมาถูกต้อง
- [ ] เว็บใช้ HTTPS แล้ว (มีแม่กุญแจในเบราว์เซอร์) — สำคัญเพราะ Admin Key ถูกส่งผ่านเน็ตเวิร์กทุกครั้งที่ใช้โหมดผู้ดูแล
- [ ] สำรองไฟล์ `data/db.json` เก็บไว้ก่อนวันสอบจริง (กันเหตุไม่คาดฝัน)
- [ ] แจ้งนักเรียนล่วงหน้าว่ารหัสนักเรียนคือ "รหัสผ่าน" เข้าสอบ ไม่ควรบอกคนอื่น

## ถ้าเจอปัญหา
- **เข้าเว็บไม่ได้ / 502 Error**: เช็กว่า `pm2 status` (กรณี VPS) ยังรันอยู่ไหม, หรือดู deploy log ใน Railway/Render ว่า build ผ่านหรือไม่
- **`/admin` บอกรหัสผิดทั้งที่ใส่ถูก**: เช็กว่า Environment Variable `ADMIN_KEY` บนเซิร์ฟเวอร์ตรงกับที่พิมพ์ในหน้าเว็บ (ตัวพิมพ์เล็ก-ใหญ่มีผล)
- **นักเรียนกรอกรหัสแล้วบอก "ไม่พบรหัสนักเรียน"**: เช็กในแท็บ "รายชื่อนักเรียน" ว่านำเข้ารหัสนี้แล้วหรือยัง และรหัสตรงเป๊ะ (ไม่มีช่องว่างเกิน)
- **ข้อมูลหายหลัง redeploy** (Railway/Render): ต้องเพิ่ม Volume/Disk ตามขั้นตอน A หรือ B ด้านบน ไม่งั้นไฟล์ `data/db.json` จะถูกรีเซ็ตทุกครั้งที่ deploy ใหม่
