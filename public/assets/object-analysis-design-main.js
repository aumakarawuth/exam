(function(){
"use strict";

/* ============ QUESTION BANK (Level 0/1/2 answer keys, used only for grading — never shown to student) ============ */
const QUESTIONS = {
  coffee: {
    title: 'ระบบร้านกาแฟ',
    tagline: 'Coffee Shop Order System',
    desc: 'ร้านกาแฟแห่งหนึ่งต้องการระบบจัดการคำสั่งซื้อ ลูกค้าสามารถสั่งเครื่องดื่มกับพนักงานหน้าร้าน พนักงานบันทึกออเดอร์เข้าระบบและแจ้งสถานะกลับ เมื่อเสร็จสิ้นระบบจะออกใบเสร็จให้ลูกค้า ผู้จัดการสามารถดูรายงานยอดขายและสั่งปรับราคาสินค้าผ่านระบบได้',
    requirements: ['ลูกค้าสั่งเครื่องดื่มและรับใบเสร็จ','พนักงานบันทึกออเดอร์และรับสถานะออเดอร์','ผู้จัดการดูรายงานยอดขายและปรับราคา'],
    entities: ['ลูกค้า','พนักงาน','ผู้จัดการ'],
    levelDesc: {
      0: 'ในระดับ Context Diagram นี้ ให้มองภาพรวมทั้งระบบเป็นหน่วยเดียว (1 Process) แสดงเฉพาะบุคคลภายนอกที่เกี่ยวข้องกับระบบ (ลูกค้า พนักงาน ผู้จัดการ) และข้อมูลที่ไหลเข้า-ออกจากระบบโดยรวมเท่านั้น ยังไม่ต้องลงรายละเอียดว่าโครงสร้างภายในระบบทำงานอย่างไร',
      1: 'ลองพิจารณาว่าตั้งแต่ลูกค้าสั่งเครื่องดื่มจนได้รับใบเสร็จ ร้านต้องผ่านขั้นตอนอะไรบ้าง เริ่มจากการรับและบันทึกคำสั่งซื้อ ตามด้วยขั้นตอนการเตรียมเครื่องดื่มและแจ้งผลกลับไปยังลูกค้าและพนักงาน และสุดท้ายคือการรวบรวมข้อมูลออเดอร์ทั้งหมดเพื่อสรุปเป็นรายงานยอดขายและรับคำสั่งปรับราคาจากผู้จัดการ ลองแตกกระบวนการเหล่านี้ออกเป็น Process ย่อยที่เหมาะสม พร้อมพิจารณาว่าจำเป็นต้องมีที่เก็บข้อมูล (Data Store) สำหรับส่งต่อรายละเอียดออเดอร์ระหว่างขั้นตอนหรือไม่',
      2: 'สำหรับ Level 2 ให้เลือก Process ที่ทำหน้าที่เตรียมเครื่องดื่มและแจ้งสถานะมาแตกย่อยต่ออีกขั้น โดยพิจารณาว่าเมื่อได้รับรายการออเดอร์มาแล้ว ร้านจะแยกงานออกเป็นสองส่วน คือส่วนที่ลงมือชงเครื่องดื่มตามรายการและออกใบเสร็จให้ลูกค้าทันทีที่เสร็จ กับอีกส่วนที่คอยติดตามความคืบหน้าการทำแต่ละออเดอร์เพื่อแจ้งเตือนพนักงานว่าออเดอร์ใดพร้อมแล้ว ลองพิจารณาว่าสองงานนี้ควรแยกเป็น Process กันอย่างไร และจำเป็นต้องมีข้อมูลกลางที่ใช้ส่งต่อความคืบหน้าระหว่างสอง Process นี้หรือไม่'
    },
    levels: {
      0: {
        shapes: [
          {id:'p1', type:'process', num:'0', x:430, y:280, w:160, h:90, label:'ระบบร้านกาแฟ'},
          {id:'e1', type:'entity', x:70,  y:90,  w:150, h:70, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:70,  y:470, w:150, h:70, label:'พนักงาน'},
          {id:'e3', type:'entity', x:780, y:280, w:150, h:70, label:'ผู้จัดการ'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'สั่งเครื่องดื่ม', keyFrom:'ลูกค้า', keyTo:'0'},
          {from:'p1', to:'e1', label:'ใบเสร็จ', keyFrom:'0', keyTo:'ลูกค้า'},
          {from:'e2', to:'p1', label:'บันทึกออเดอร์', keyFrom:'พนักงาน', keyTo:'0'},
          {from:'p1', to:'e2', label:'สถานะออเดอร์', keyFrom:'0', keyTo:'พนักงาน'},
          {from:'p1', to:'e3', label:'รายงานยอดขาย', keyFrom:'0', keyTo:'ผู้จัดการ'},
          {from:'e3', to:'p1', label:'คำสั่งปรับราคา', keyFrom:'ผู้จัดการ', keyTo:'0'}
        ]
      },
      1: {
        note: 'แตก Process 0 ออกเป็น Process ย่อย 1.0–3.0 โดยยังต้องคงเส้น Data Flow ที่ข้ามขอบเขตระบบ (จาก Level 0) ไว้ครบ และเพิ่ม Data Store ภายในได้',
        shapes: [
          {id:'e1', type:'entity', x:40,  y:60,  w:140, h:64, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:40,  y:520, w:140, h:64, label:'พนักงาน'},
          {id:'e3', type:'entity', x:820, y:290, w:140, h:64, label:'ผู้จัดการ'},
          {id:'p1', type:'process', num:'1.0', x:260, y:130, w:150, h:80, label:'รับออเดอร์'},
          {id:'p2', type:'process', num:'2.0', x:500, y:290, w:150, h:80, label:'ทำเครื่องดื่ม/แจ้งสถานะ'},
          {id:'p3', type:'process', num:'3.0', x:260, y:440, w:150, h:80, label:'สรุปยอดขาย'},
          {id:'d1', type:'store', num:'D1', x:520, y:470, w:170, h:60, label:'ข้อมูลออเดอร์'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'สั่งเครื่องดื่ม', keyFrom:'ลูกค้า', keyTo:'1.0'},
          {from:'p1', to:'d1', label:'บันทึกออเดอร์', keyFrom:'1.0', keyTo:'D1'},
          {from:'p1', to:'p2', label:'รายการออเดอร์', keyFrom:'1.0', keyTo:'2.0'},
          {from:'p2', to:'e1', label:'ใบเสร็จ', keyFrom:'2.0', keyTo:'ลูกค้า'},
          {from:'e2', to:'p2', label:'บันทึกออเดอร์', keyFrom:'พนักงาน', keyTo:'2.0'},
          {from:'p2', to:'e2', label:'สถานะออเดอร์', keyFrom:'2.0', keyTo:'พนักงาน'},
          {from:'d1', to:'p3', label:'ข้อมูลออเดอร์', keyFrom:'D1', keyTo:'3.0'},
          {from:'p3', to:'e3', label:'รายงานยอดขาย', keyFrom:'3.0', keyTo:'ผู้จัดการ'},
          {from:'e3', to:'p3', label:'คำสั่งปรับราคา', keyFrom:'ผู้จัดการ', keyTo:'3.0'}
        ],
        decomposeOf: '0'
      },
      2: {
        note: 'เลือกแตก Process 2.0 (ทำเครื่องดื่ม/แจ้งสถานะ) ต่อเป็น Process ย่อย 2.1–2.2 โดยคงเส้นที่เชื่อมกับภายนอก Process 2.0 เดิมไว้ครบ',
        parentProcess: '2.0',
        shapes: [
          {id:'e1', type:'entity', x:40,  y:280, w:140, h:64, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:780, y:60,  w:150, h:64, label:'พนักงาน'},
          {id:'p1in', type:'process', num:'1.0', x:40, y:60, w:150, h:64, label:'รับออเดอร์ (ภายนอก)'},
          {id:'p21', type:'process', num:'2.1', x:280, y:150, w:170, h:80, label:'ตรวจสอบและทำเครื่องดื่ม'},
          {id:'p22', type:'process', num:'2.2', x:520, y:340, w:170, h:80, label:'แจ้งสถานะออเดอร์'},
          {id:'d1', type:'store', num:'D1', x:280, y:480, w:170, h:60, label:'ข้อมูลออเดอร์'}
        ],
        connections: [
          {from:'p1in', to:'p21', label:'รายการออเดอร์', keyFrom:'1.0', keyTo:'2.1'},
          {from:'p21', to:'e1', label:'ใบเสร็จ', keyFrom:'2.1', keyTo:'ลูกค้า'},
          {from:'p21', to:'d1', label:'สถานะการทำ', keyFrom:'2.1', keyTo:'D1'},
          {from:'d1', to:'p22', label:'สถานะการทำ', keyFrom:'D1', keyTo:'2.2'},
          {from:'p22', to:'e2', label:'สถานะออเดอร์', keyFrom:'2.2', keyTo:'พนักงาน'}
        ]
      }
    }
  },

  library: {
    title: 'ระบบห้องสมุด',
    tagline: 'Library Borrowing System',
    desc: 'ห้องสมุดต้องการระบบยืม-คืนหนังสือ สมาชิกสามารถค้นหาและยืมหนังสือกับบรรณารักษ์ บรรณารักษ์บันทึกรายการยืม-คืน และแจ้งเตือนเมื่อเลยกำหนดคืน ผู้ดูแลระบบสามารถเพิ่ม/ลบข้อมูลหนังสือในระบบได้',
    requirements: ['สมาชิกยืมและคืนหนังสือ รับใบแจ้งกำหนดคืน','บรรณารักษ์บันทึกรายการยืม-คืน','ผู้ดูแลระบบจัดการข้อมูลหนังสือ'],
    entities: ['สมาชิก','บรรณารักษ์','ผู้ดูแลระบบ'],
    levelDesc: {
      0: 'ในระดับ Context Diagram นี้ ให้มองภาพรวมทั้งระบบเป็นหน่วยเดียว (1 Process) แสดงเฉพาะบุคคลภายนอก (สมาชิก บรรณารักษ์ ผู้ดูแลระบบ) และข้อมูลที่ไหลเข้า-ออกจากระบบห้องสมุดโดยรวมเท่านั้น ยังไม่ต้องลงรายละเอียดว่าเบื้องหลังระบบทำงานอย่างไร',
      1: 'ลองพิจารณาว่าการยืม-คืนหนังสือของสมาชิกแต่ละครั้งต้องผ่านขั้นตอนอะไรบ้าง เริ่มจากการบันทึกรายการยืมหรือคืนที่บรรณารักษ์เป็นผู้ดำเนินการ จากนั้นระบบต้องตรวจสอบกำหนดคืนของหนังสือแต่ละเล่มเพื่อแจ้งเตือนสมาชิกและแจ้งรายการค้างคืนให้บรรณารักษ์ทราบ และแยกอีกส่วนหนึ่งคือการจัดการข้อมูลหนังสือโดยผู้ดูแลระบบ ลองแตกกระบวนการเหล่านี้ออกเป็น Process ย่อย พร้อมพิจารณาว่าจำเป็นต้องมี Data Store เก็บข้อมูลการยืมไว้ให้ Process อื่นดึงไปใช้ต่อหรือไม่',
      2: 'สำหรับ Level 2 ให้เลือก Process ที่ทำหน้าที่จัดการยืม-คืนหนังสือมาแตกย่อยต่ออีกขั้น โดยพิจารณาว่าการยืมหนังสือกับการคืนหนังสือเป็นเหตุการณ์ที่เกิดขึ้นคนละช่วงเวลาและมีเงื่อนไขต่างกัน จึงอาจแยกเป็นสอง Process คือส่วนที่รับคำขอยืมจากสมาชิกและบันทึกรายการ กับส่วนที่รับเรื่องการคืนหนังสือและบันทึกรายการเช่นกัน โดยทั้งสอง Process นี้ต่างก็ต้องปรับปรุงข้อมูลชุดเดียวกันที่ใช้ตรวจสอบกำหนดคืนในภายหลัง ลองพิจารณาว่าจะออกแบบ Process และ Data Store ให้สอดคล้องกันอย่างไร'
    },
    levels: {
      0: {
        shapes: [
          {id:'p1', type:'process', num:'0', x:430, y:280, w:160, h:90, label:'ระบบห้องสมุด'},
          {id:'e1', type:'entity', x:70,  y:90,  w:150, h:70, label:'สมาชิก'},
          {id:'e2', type:'entity', x:70,  y:470, w:150, h:70, label:'บรรณารักษ์'},
          {id:'e3', type:'entity', x:780, y:280, w:170, h:70, label:'ผู้ดูแลระบบ'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'คำขอยืม/คืน', keyFrom:'สมาชิก', keyTo:'0'},
          {from:'p1', to:'e1', label:'ใบแจ้งกำหนดคืน', keyFrom:'0', keyTo:'สมาชิก'},
          {from:'e2', to:'p1', label:'บันทึกยืม-คืน', keyFrom:'บรรณารักษ์', keyTo:'0'},
          {from:'p1', to:'e2', label:'รายการค้างคืน', keyFrom:'0', keyTo:'บรรณารักษ์'},
          {from:'e3', to:'p1', label:'ข้อมูลหนังสือใหม่', keyFrom:'ผู้ดูแลระบบ', keyTo:'0'},
          {from:'p1', to:'e3', label:'รายงานหนังสือ', keyFrom:'0', keyTo:'ผู้ดูแลระบบ'}
        ]
      },
      1: {
        note: 'แตก Process 0 ออกเป็น Process ย่อย 1.0–3.0 คงเส้น Data Flow เดิมที่ข้ามขอบเขตไว้ครบ',
        shapes: [
          {id:'e1', type:'entity', x:40,  y:60,  w:140, h:64, label:'สมาชิก'},
          {id:'e2', type:'entity', x:40,  y:520, w:150, h:64, label:'บรรณารักษ์'},
          {id:'e3', type:'entity', x:820, y:290, w:150, h:64, label:'ผู้ดูแลระบบ'},
          {id:'p1', type:'process', num:'1.0', x:260, y:130, w:150, h:80, label:'จัดการยืม-คืน'},
          {id:'p2', type:'process', num:'2.0', x:500, y:290, w:150, h:80, label:'ตรวจสอบกำหนดคืน'},
          {id:'p3', type:'process', num:'3.0', x:260, y:440, w:150, h:80, label:'จัดการข้อมูลหนังสือ'},
          {id:'d1', type:'store', num:'D1', x:520, y:470, w:170, h:60, label:'ข้อมูลการยืม'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'คำขอยืม/คืน', keyFrom:'สมาชิก', keyTo:'1.0'},
          {from:'p1', to:'d1', label:'บันทึกรายการ', keyFrom:'1.0', keyTo:'D1'},
          {from:'e2', to:'p1', label:'บันทึกยืม-คืน', keyFrom:'บรรณารักษ์', keyTo:'1.0'},
          {from:'d1', to:'p2', label:'ข้อมูลการยืม', keyFrom:'D1', keyTo:'2.0'},
          {from:'p2', to:'e1', label:'ใบแจ้งกำหนดคืน', keyFrom:'2.0', keyTo:'สมาชิก'},
          {from:'p2', to:'e2', label:'รายการค้างคืน', keyFrom:'2.0', keyTo:'บรรณารักษ์'},
          {from:'e3', to:'p3', label:'ข้อมูลหนังสือใหม่', keyFrom:'ผู้ดูแลระบบ', keyTo:'3.0'},
          {from:'p3', to:'e3', label:'รายงานหนังสือ', keyFrom:'3.0', keyTo:'ผู้ดูแลระบบ'}
        ],
        decomposeOf: '0'
      },
      2: {
        note: 'เลือกแตก Process 1.0 (จัดการยืม-คืน) ต่อเป็น Process ย่อย 1.1–1.2 คงเส้นที่เชื่อมกับภายนอก Process 1.0 เดิมไว้ครบ',
        parentProcess: '1.0',
        shapes: [
          {id:'e1', type:'entity', x:40,  y:60,  w:140, h:64, label:'สมาชิก'},
          {id:'e2', type:'entity', x:40,  y:480, w:150, h:64, label:'บรรณารักษ์'},
          {id:'p2out', type:'process', num:'2.0', x:780, y:270, w:150, h:64, label:'ตรวจสอบกำหนดคืน (ภายนอก)'},
          {id:'p11', type:'process', num:'1.1', x:280, y:140, w:170, h:80, label:'บันทึกคำขอยืม'},
          {id:'p12', type:'process', num:'1.2', x:280, y:400, w:170, h:80, label:'บันทึกการคืน'},
          {id:'d1', type:'store', num:'D1', x:520, y:270, w:170, h:60, label:'ข้อมูลการยืม'}
        ],
        connections: [
          {from:'e1', to:'p11', label:'คำขอยืม', keyFrom:'สมาชิก', keyTo:'1.1'},
          {from:'p11', to:'d1', label:'บันทึกรายการ', keyFrom:'1.1', keyTo:'D1'},
          {from:'e2', to:'p11', label:'บันทึกยืม-คืน', keyFrom:'บรรณารักษ์', keyTo:'1.1'},
          {from:'e1', to:'p12', label:'คำขอคืน', keyFrom:'สมาชิก', keyTo:'1.2'},
          {from:'p12', to:'d1', label:'บันทึกรายการ', keyFrom:'1.2', keyTo:'D1'},
          {from:'d1', to:'p2out', label:'ข้อมูลการยืม', keyFrom:'D1', keyTo:'2.0'}
        ]
      }
    }
  },

  restaurant: {
    title: 'ระบบร้านอาหาร',
    tagline: 'Restaurant Ordering System',
    desc: 'ร้านอาหารต้องการระบบรับออเดอร์ ลูกค้าสั่งอาหารกับพนักงานเสิร์ฟ พนักงานเสิร์ฟส่งออเดอร์ไปยังครัวและรับแจ้งเมื่ออาหารเสร็จ เมื่อลูกค้ารับประทานเสร็จจะออกใบเสร็จให้ ผู้จัดการดูรายงานยอดขายประจำวันได้',
    requirements: ['ลูกค้าสั่งอาหารและรับใบเสร็จ','พนักงานเสิร์ฟส่งออเดอร์เข้าครัวและรับแจ้งอาหารเสร็จ','ผู้จัดการดูรายงานยอดขายประจำวัน'],
    entities: ['ลูกค้า','พนักงานเสิร์ฟ','ผู้จัดการ'],
    levelDesc: {
      0: 'ในระดับ Context Diagram นี้ ให้มองภาพรวมทั้งระบบเป็นหน่วยเดียว (1 Process) แสดงเฉพาะบุคคลภายนอก (ลูกค้า พนักงานเสิร์ฟ ผู้จัดการ) และข้อมูลที่ไหลเข้า-ออกจากระบบร้านอาหารโดยรวมเท่านั้น ยังไม่ต้องลงรายละเอียดว่าเบื้องหลังครัวและการเสิร์ฟทำงานอย่างไร',
      1: 'ลองพิจารณาว่าตั้งแต่ลูกค้าสั่งอาหารจนได้รับใบเสร็จ ร้านต้องผ่านขั้นตอนอะไรบ้าง เริ่มจากพนักงานเสิร์ฟรับออเดอร์และบันทึกเข้าระบบ จากนั้นครัวจะดำเนินการปรุงอาหารตามรายการที่ได้รับและแจ้งกลับเมื่อเสร็จ ก่อนจะออกใบเสร็จให้ลูกค้า และแยกอีกส่วนหนึ่งคือการรวบรวมข้อมูลออเดอร์เพื่อสรุปเป็นรายงานยอดขายส่งผู้จัดการ ลองแตกกระบวนการเหล่านี้ออกเป็น Process ย่อย พร้อมพิจารณาว่าจำเป็นต้องมี Data Store เก็บข้อมูลออเดอร์ไว้ให้ Process อื่นดึงไปใช้ต่อหรือไม่',
      2: 'สำหรับ Level 2 ให้เลือก Process ที่ทำหน้าที่จัดการงานครัวมาแตกย่อยต่ออีกขั้น โดยพิจารณาว่าเมื่อรายการออเดอร์ถูกส่งเข้าครัวแล้ว งานจะแบ่งเป็นสองส่วน คือส่วนที่ลงมือปรุงอาหารตามรายการ กับส่วนที่ตรวจสอบความเรียบร้อยของอาหารก่อนแจ้งพนักงานเสิร์ฟว่าจานไหนพร้อมเสิร์ฟแล้ว รวมถึงแจ้งให้ออกใบเสร็จลูกค้าได้ ลองพิจารณาว่าสองงานนี้ควรแยกเป็น Process กันอย่างไร และข้อมูลใดที่ต้องส่งต่อระหว่างกัน'
    },
    levels: {
      0: {
        shapes: [
          {id:'p1', type:'process', num:'0', x:430, y:280, w:160, h:90, label:'ระบบร้านอาหาร'},
          {id:'e1', type:'entity', x:70,  y:90,  w:150, h:70, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:70,  y:470, w:170, h:70, label:'พนักงานเสิร์ฟ'},
          {id:'e3', type:'entity', x:780, y:280, w:150, h:70, label:'ผู้จัดการ'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'สั่งอาหาร', keyFrom:'ลูกค้า', keyTo:'0'},
          {from:'p1', to:'e1', label:'ใบเสร็จ', keyFrom:'0', keyTo:'ลูกค้า'},
          {from:'e2', to:'p1', label:'บันทึกออเดอร์', keyFrom:'พนักงานเสิร์ฟ', keyTo:'0'},
          {from:'p1', to:'e2', label:'แจ้งอาหารเสร็จ', keyFrom:'0', keyTo:'พนักงานเสิร์ฟ'},
          {from:'p1', to:'e3', label:'รายงานยอดขาย', keyFrom:'0', keyTo:'ผู้จัดการ'}
        ]
      },
      1: {
        note: 'แตก Process 0 ออกเป็น Process ย่อย 1.0–3.0 คงเส้น Data Flow เดิมที่ข้ามขอบเขตไว้ครบ',
        shapes: [
          {id:'e1', type:'entity', x:40,  y:60,  w:140, h:64, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:40,  y:520, w:170, h:64, label:'พนักงานเสิร์ฟ'},
          {id:'e3', type:'entity', x:820, y:290, w:150, h:64, label:'ผู้จัดการ'},
          {id:'p1', type:'process', num:'1.0', x:260, y:130, w:150, h:80, label:'รับออเดอร์'},
          {id:'p2', type:'process', num:'2.0', x:500, y:290, w:150, h:80, label:'จัดการครัว'},
          {id:'p3', type:'process', num:'3.0', x:260, y:440, w:150, h:80, label:'สรุปยอดขาย'},
          {id:'d1', type:'store', num:'D1', x:520, y:470, w:170, h:60, label:'ข้อมูลออเดอร์'}
        ],
        connections: [
          {from:'e1', to:'p1', label:'สั่งอาหาร', keyFrom:'ลูกค้า', keyTo:'1.0'},
          {from:'p1', to:'d1', label:'บันทึกออเดอร์', keyFrom:'1.0', keyTo:'D1'},
          {from:'e2', to:'p1', label:'บันทึกออเดอร์', keyFrom:'พนักงานเสิร์ฟ', keyTo:'1.0'},
          {from:'d1', to:'p2', label:'รายการออเดอร์', keyFrom:'D1', keyTo:'2.0'},
          {from:'p2', to:'e2', label:'แจ้งอาหารเสร็จ', keyFrom:'2.0', keyTo:'พนักงานเสิร์ฟ'},
          {from:'p2', to:'e1', label:'ใบเสร็จ', keyFrom:'2.0', keyTo:'ลูกค้า'},
          {from:'d1', to:'p3', label:'ข้อมูลออเดอร์', keyFrom:'D1', keyTo:'3.0'},
          {from:'p3', to:'e3', label:'รายงานยอดขาย', keyFrom:'3.0', keyTo:'ผู้จัดการ'}
        ],
        decomposeOf: '0'
      },
      2: {
        note: 'เลือกแตก Process 2.0 (จัดการครัว) ต่อเป็น Process ย่อย 2.1–2.2 คงเส้นที่เชื่อมกับภายนอก Process 2.0 เดิมไว้ครบ',
        parentProcess: '2.0',
        shapes: [
          {id:'e1', type:'entity', x:780, y:60,  w:140, h:64, label:'ลูกค้า'},
          {id:'e2', type:'entity', x:40,  y:280, w:170, h:64, label:'พนักงานเสิร์ฟ'},
          {id:'d1in', type:'store', num:'D1', x:40, y:60, w:170, h:60, label:'ข้อมูลออเดอร์ (ภายนอก)'},
          {id:'p21', type:'process', num:'2.1', x:280, y:150, w:170, h:80, label:'ปรุงอาหาร'},
          {id:'p22', type:'process', num:'2.2', x:520, y:340, w:170, h:80, label:'ตรวจสอบและแจ้งเสร็จ'}
        ],
        connections: [
          {from:'d1in', to:'p21', label:'รายการออเดอร์', keyFrom:'D1', keyTo:'2.1'},
          {from:'p21', to:'p22', label:'อาหารพร้อมเสิร์ฟ', keyFrom:'2.1', keyTo:'2.2'},
          {from:'p22', to:'e2', label:'แจ้งอาหารเสร็จ', keyFrom:'2.2', keyTo:'พนักงานเสิร์ฟ'},
          {from:'p22', to:'e1', label:'ใบเสร็จ', keyFrom:'2.2', keyTo:'ลูกค้า'}
        ]
      }
    }
  }
};
const LEVEL_TITLES = {0:'Level 0 — Context Diagram', 1:'Level 1 — แตก Process หลัก', 2:'Level 2 — แตก Process ย่อย'};

/* ============ APP / SESSION STATE ============ */
let app = {
  studentId: null, studentName: '', classRoom: '', studentToken: sessionStorage.getItem('examStudentToken') || '', questionKey: null,
  level: null,          // currently open level, null when at hub
  attempts: {0:null, 1:null, 2:null},
  timeLeft: 60*60, examEndTime: null, tabSwitches: 0, tabWarningAcknowledged: 0, fullscreenExitAttempts: 0, reloadCount: 0, integrityEvents: [],
  globalTimerHandle: null,
  examEnded: false
};
let state = {
  shapes: [], connections: [], tool:'select', selectedId:null,
  history:[], future:[], zoom:1, panX:0, panY:0, hintsLeft:3, tabSwitches:0
};
let idCounter = 1;
const newId = (p)=> p + (idCounter++);

/* ============ SESSION PERSISTENCE ============ */
const DFD_SESSION_KEY = 'objectAnalysisExamSession';
let dfdSaveTimer = null;
let dfdServerSaveTimer = null;
const DFD_DEVICE_ID=(()=>{let id=sessionStorage.getItem('examDeviceId');if(!id){id='dev_'+crypto.randomUUID().replace(/-/g,'');sessionStorage.setItem('examDeviceId',id);}return id;})();
let dfdPageIsLeaving = false;
let dfdTabSwitchCheckTimer = null;
function saveDfdSession(){
  if(!app.studentId || !app.questionKey || app.examEnded) return;
  const canvasState = { shapes:state.shapes, connections:state.connections, tool:state.tool, selectedId:state.selectedId, zoom:state.zoom, panX:state.panX, panY:state.panY, hintsLeft:state.hintsLeft };
  const payload={ studentId:app.studentId, studentName:app.studentName, classRoom:app.classRoom, questionKey:app.questionKey, attempts:app.attempts, level:app.level, examEndTime:app.examEndTime, tabSwitches:app.tabSwitches, tabWarningAcknowledged:app.tabWarningAcknowledged, fullscreenExitAttempts:app.fullscreenExitAttempts, reloadCount:app.reloadCount, integrityEvents:app.integrityEvents, canvasState };
  try { localStorage.setItem(DFD_SESSION_KEY, JSON.stringify(payload)); updateDfdAutosaveTag('saved'); } catch(e) { updateDfdAutosaveTag('error'); }
  if(navigator.onLine&&app.studentToken){clearTimeout(dfdServerSaveTimer);dfdServerSaveTimer=setTimeout(()=>fetch('/api/exam-drafts/object_analysis_design_dfd',{method:'PUT',headers:{'Content-Type':'application/json','x-student-token':app.studentToken},body:JSON.stringify({draft:{...payload,deviceId:DFD_DEVICE_ID}})}).catch(()=>{}),1200);}
}
function updateDfdAutosaveTag(status){
  const tag=document.getElementById('autosaveTag');
  if(!tag) return;
  if(status==='saving'){ tag.textContent='💾 กำลังบันทึกอัตโนมัติ...'; tag.classList.add('saving'); return; }
  if(status==='error'){ tag.textContent='⚠ บันทึกอัตโนมัติไม่สำเร็จ'; tag.classList.remove('saving'); tag.classList.add('badge-warn'); return; }
  const time=new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  tag.textContent='💾 บันทึกอัตโนมัติแล้ว '+time; tag.classList.remove('saving','badge-warn');
}
function scheduleDfdSave(){ updateDfdAutosaveTag('saving'); clearTimeout(dfdSaveTimer); dfdSaveTimer = setTimeout(saveDfdSession, 300); }
function clearDfdSession(){ try { localStorage.removeItem(DFD_SESSION_KEY); } catch(e) {} }
function requestDfdFullscreen(){ if(!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{}); }
function recordDfdIntegrityEvent(type){ app.integrityEvents.push({type,at:new Date().toISOString()}); if(app.integrityEvents.length>50) app.integrityEvents.shift(); }
window.addEventListener('beforeunload', ()=>{ dfdPageIsLeaving = true; saveDfdSession(); });

/* ============ SCREEN REFS ============ */
const startScreen = document.getElementById('startScreen');
const selectScreen = document.getElementById('selectScreen');
const nameScreen = document.getElementById('nameScreen');
const countdownOverlay = document.getElementById('countdownOverlay');
const examScreen = document.getElementById('examScreen');
const hubView = document.getElementById('hubView');
const levelView = document.getElementById('levelView');
const finalScreen = document.getElementById('finalScreen');
const hubActions = document.getElementById('hubActions');
const levelActions = document.getElementById('levelActions');

document.getElementById('goSelectBtn').addEventListener('click', ()=>{
  startScreen.classList.add('hidden');
  selectScreen.classList.remove('hidden');
  renderQuestionGrid();
});
document.getElementById('backToStartBtn').addEventListener('click', ()=>{
  selectScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});
function renderQuestionGrid(){
  const grid = document.getElementById('qgrid');
  grid.innerHTML = Object.entries(QUESTIONS).map(([key,q])=>`
    <button class="qcard" data-qkey="${key}">
      <h3>${q.title}</h3>
      <p>${q.tagline}</p>
      <div class="lvbadges"><span class="lvbadge">Level 0</span><span class="lvbadge">Level 1</span><span class="lvbadge">Level 2</span></div>
    </button>`).join('');
  grid.querySelectorAll('.qcard').forEach(card=>{
    card.addEventListener('click', ()=>{
      grid.querySelectorAll('.qcard').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      app.questionKey = card.dataset.qkey;
      document.getElementById('confirmQBtn').disabled = false;
    });
  });
}
document.getElementById('confirmQBtn').addEventListener('click', ()=>{
  selectScreen.classList.add('hidden');
  nameScreen.classList.remove('hidden');
});
document.getElementById('backToSelectBtn').addEventListener('click', ()=>{
  nameScreen.classList.add('hidden');
  selectScreen.classList.remove('hidden');
});
document.getElementById('startExamBtn').addEventListener('click', ()=>{
  const val = document.getElementById('studentNameInput').value.trim();
  if(!val){ alert('กรุณากรอกชื่อ-นามสกุลก่อนเริ่มสอบ'); return; }
  app.studentName = val;
  requestDfdFullscreen();
  nameScreen.classList.add('hidden');
  beginCountdown();
});

function beginCountdown(){
  countdownOverlay.classList.remove('hidden');
  const numEl = document.getElementById('countdownNumber');
  const labelEl = document.getElementById('countdownLabel');
  let n = 3;
  numEl.textContent = n;
  labelEl.textContent = 'เตรียมตัวเข้าสู่การสอบ...';
  const iv = setInterval(()=>{
    n--;
    if(n > 0){ numEl.textContent = n; numEl.style.animation='none'; void numEl.offsetWidth; numEl.style.animation='pop .9s ease'; }
    else if(n === 0){ numEl.textContent='Start'; labelEl.textContent='เริ่มทำข้อสอบได้เลย'; numEl.style.animation='none'; void numEl.offsetWidth; numEl.style.animation='pop .9s ease'; }
    else {
      clearInterval(iv);
      countdownOverlay.classList.add('hidden');
      examScreen.classList.remove('hidden');
      startWholeExam();
    }
  }, 800);
}

/* ============ WHOLE-EXAM SESSION ============ */
function currentQuestion(){ return QUESTIONS[app.questionKey]; }
function currentLevelData(){ return currentQuestion().levels[app.level]; }

function startWholeExam(){
  document.getElementById('nameTag').textContent = '👤 ' + app.studentName;
  document.getElementById('hubQTitle').textContent = 'โจทย์: ' + currentQuestion().title;
  document.getElementById('hubQTagline').textContent = currentQuestion().tagline;
  const serverEndTime = Number(app.serverExamEndTime || 0);
  app.examEndTime = serverEndTime > Date.now() ? serverEndTime : Date.now() + 60*60*1000;
  app.timeLeft = Math.max(0, Math.round((app.examEndTime - Date.now()) / 1000));
  app.tabSwitches = 0;
  app.tabWarningAcknowledged = 0;
  app.fullscreenExitAttempts = 0;
  app.integrityEvents = [];
  dfdFullscreenWasActive = !!document.fullscreenElement;
  updateGlobalTimerDisplay();
  document.getElementById('tabSwitchTag').textContent = 'สลับแท็บ: 0 ครั้ง';
  updateDfdFullscreenTag();
  showHub();
  renderHubCards();
  saveDfdSession();
  runDfdTimer();
}
function runDfdTimer(){
  clearInterval(app.globalTimerHandle);
  app.globalTimerHandle = setInterval(()=>{
    app.timeLeft = Math.max(0, Math.round((app.examEndTime-Date.now())/1000));
    updateGlobalTimerDisplay();
    if(app.timeLeft % 15 === 0) saveDfdSession();
    // Submit one second before the authoritative deadline so normal network
    // latency cannot turn an automatic submission into a rejected late one.
    if(app.timeLeft <= 1){
      clearInterval(app.globalTimerHandle);
      forceTimeUp();
    }
  }, 1000);
}
function updateGlobalTimerDisplay(){
  const m = Math.floor(app.timeLeft/60).toString().padStart(2,'0');
  const s = (app.timeLeft%60).toString().padStart(2,'0');
  const el = document.getElementById('timerDisplay');
  el.textContent = m+':'+s;
  el.classList.toggle('warn', app.timeLeft<=600 && app.timeLeft>120);
  el.classList.toggle('danger', app.timeLeft<=120);
}

function showHub(){
  app.level = null;
  document.getElementById('topTitle').textContent = 'รายการ Level';
  hubActions.classList.remove('hidden');
  levelActions.classList.add('hidden');
  levelView.classList.add('hidden');
  hubView.classList.remove('hidden');
  renderHubCards();
}
function renderHubCards(){
  const q = currentQuestion();
  const grid = document.getElementById('lvGrid');
  grid.innerHTML = [0,1,2].map(lv=>{
    const att = app.attempts[lv];
    const statusHtml = att ? `<span class="lv-status done">ส่งแล้ว · คะแนนสูงสุด ${att.best.result.total}/100</span>` : `<span class="lv-status todo">ยังไม่ทำ</span>`;
    const btnLabel = att ? 'แก้ไขต่อ (คะแนนสูงสุดจะถูกเก็บไว้)' : 'เข้าทำ Level นี้';
    return `<div class="lv-card">
      <h3>${LEVEL_TITLES[lv]}</h3>
      <div class="lv-desc">${lv===0?'วาด Context Diagram แสดงภาพรวมระบบทั้งหมด 1 Process':lv===1?'แตก Process หลักเป็น Process ย่อยระดับที่ 1':'เลือก Process ย่อยหนึ่งจุดมาแตกต่อในระดับลึกขึ้น'}</div>
      ${statusHtml}
      <button class="btn btn-primary" data-enter="${lv}" ${app.examEnded?'disabled':''}>${btnLabel}</button>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-enter]').forEach(btn=>{
    btn.addEventListener('click', ()=> enterLevel(parseInt(btn.dataset.enter,10)));
  });
  grid.querySelectorAll('.lv-status.done').forEach(status => { status.textContent = 'ส่งคำตอบแล้ว'; });
  const anyDone = [0,1,2].some(lv=>app.attempts[lv]);
  document.getElementById('endExamBtn').disabled = false;
  document.getElementById('endExamBtn').title = 'จบการสอบและบันทึกคำตอบที่ทำไว้';
}
document.getElementById('endExamBtn').addEventListener('click', ()=>{
  if(confirm('ยืนยันจบการสอบ? หลังจากนี้จะไม่สามารถทำ Level เพิ่มเติมได้ และระบบจะสร้างไฟล์ PDF ให้ดาวน์โหลด')){
    clearInterval(app.globalTimerHandle);
    finalizeExam(false);
  }
});

/* ============ ENTER / LEAVE LEVEL ============ */
function enterLevel(lv){
  app.level = lv;
  const existing = app.attempts[lv];
  // Continue editing from the last saved attempt for this level (if any) instead of starting from a blank canvas.
  const resumeShapes = existing ? JSON.parse(JSON.stringify(existing.latest.shapes)) : [];
  const resumeConnections = existing ? JSON.parse(JSON.stringify(existing.latest.connections)) : [];
  state = {shapes:resumeShapes, connections:resumeConnections, tool:'select', selectedId:null, history:[], future:[], zoom:1, panX:0, panY:0, hintsLeft:3, tabSwitches:0};
  const q = currentQuestion();
  const lvl = currentLevelData();
  document.getElementById('topTitle').textContent = LEVEL_TITLES[lv] + ' — ' + q.title;
  document.getElementById('panelTitle').textContent = 'โจทย์: ' + q.title;
  const extra = q.levelDesc && q.levelDesc[lv] ? ' ' + q.levelDesc[lv] : '';
  document.getElementById('panelDesc').textContent = q.desc + extra;
  document.getElementById('panelReq').innerHTML = q.requirements.map(r=>`<li>${r}</li>`).join('');
  const noteEl = document.getElementById('decompNote');
  if(lv>0 && lvl.note){ noteEl.textContent = lvl.note; noteEl.classList.remove('hidden'); }
  else noteEl.classList.add('hidden');

  hubActions.classList.add('hidden');
  levelActions.classList.remove('hidden');
  hubView.classList.add('hidden');
  levelView.classList.remove('hidden');
  document.getElementById('levelResultModal').classList.add('hidden');
  document.querySelector('.tool-btn[data-tool="select"]').click();
  applyZoom();
  render();
  applyZoom();
}
document.getElementById('backToHubBtn').addEventListener('click', showHub);

/* ============ ANTI-CHEAT ============ */
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden){
    clearTimeout(dfdTabSwitchCheckTimer);
    if(app.tabSwitches>app.tabWarningAcknowledged && app.tabSwitches<=4 && !app.examEnded){
      const remaining = 5-app.tabSwitches;
      document.getElementById('tabWarningText').textContent = `คุณสลับแท็บ/หน้าต่างแล้ว ${app.tabSwitches} ครั้ง หากสลับอีก ${remaining} ครั้ง ระบบจะส่งข้อสอบทันที`;
      document.getElementById('tabWarningModal').classList.remove('hidden');
    }
    return;
  }
  clearTimeout(dfdTabSwitchCheckTimer);
  dfdTabSwitchCheckTimer = setTimeout(()=>{
    if(dfdPageIsLeaving || !document.hidden || examScreen.classList.contains('hidden') || app.examEnded) return;
    app.tabSwitches++;
    recordDfdIntegrityEvent('tab_switch');
    const tag = document.getElementById('tabSwitchTag');
    tag.textContent = 'สลับแท็บ: '+app.tabSwitches+' ครั้ง';
    tag.classList.add('badge-warn');
    saveDfdSession();
    if(app.tabSwitches>=5){ document.getElementById('tabWarningModal').classList.add('hidden'); forceTimeUp(); }
  }, 80);
});
document.getElementById('tabWarningAckBtn').addEventListener('click', ()=>{
  app.tabWarningAcknowledged = app.tabSwitches;
  saveDfdSession();
  document.getElementById('tabWarningModal').classList.add('hidden');
});
let dfdFullscreenWasActive = false;
function updateDfdFullscreenTag(){
  const tag = document.getElementById('fullscreenExitTag');
  tag.textContent = 'ออกจากเต็มจอ: '+app.fullscreenExitAttempts+' ครั้ง';
  tag.classList.toggle('badge-warn', app.fullscreenExitAttempts>0);
}
document.addEventListener('fullscreenchange', ()=>{
  if(document.fullscreenElement){ dfdFullscreenWasActive = true; return; }
  if(!dfdFullscreenWasActive || examScreen.classList.contains('hidden') || app.examEnded) return;
  app.fullscreenExitAttempts++;
  recordDfdIntegrityEvent('fullscreen_exit');
  updateDfdFullscreenTag(); saveDfdSession();
  showToast('ตรวจพบการออกจากโหมดเต็มจอ กรุณากลับเข้าสู่โหมดเต็มจอเพื่อทำข้อสอบต่อ');
});
document.getElementById('fullscreenBtn').addEventListener('click', ()=>{
  if(!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
});

/* ============ TOOLBAR ============ */
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    state.tool = btn.dataset.tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
document.addEventListener('keydown', (evt)=>{
  if((evt.key!=='Delete' && evt.key!=='Backspace')) return;
  if(levelView.classList.contains('hidden') || app.examEnded) return;
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if(tag==='INPUT' || tag==='TEXTAREA') return;
  if(!state.selectedId) return;
  evt.preventDefault();
  deleteSelected();
});
document.getElementById('clearBtn').addEventListener('click', ()=>{
  if(confirm('ล้างไดอะแกรมทั้งหมด?')){ pushHistory(); state.shapes=[]; state.connections=[]; state.selectedId=null; render(); }
});
document.getElementById('zoomIn').addEventListener('click', ()=>{state.zoom=Math.min(1.8,state.zoom+0.1); applyZoom();});
document.getElementById('zoomOut').addEventListener('click', ()=>{state.zoom=Math.max(0.5,state.zoom-0.1); applyZoom();});
document.getElementById('zoomReset').addEventListener('click', ()=>{state.zoom=1; state.panX=0; state.panY=0; applyZoom();});
function applyZoom(){ document.getElementById('canvasLayer').setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`); }

/* ============ HISTORY ============ */
function snapshot(){ return JSON.stringify({shapes:state.shapes, connections:state.connections}); }
function pushHistory(){ state.history.push(snapshot()); if(state.history.length>50) state.history.shift(); state.future=[]; }
function undo(){ if(!state.history.length) return; state.future.push(snapshot()); const p=JSON.parse(state.history.pop()); state.shapes=p.shapes; state.connections=p.connections; render(); }
function redo(){ if(!state.future.length) return; state.history.push(snapshot()); const n=JSON.parse(state.future.pop()); state.shapes=n.shapes; state.connections=n.connections; render(); }
function deleteSelected(){
  if(!state.selectedId) return;
  pushHistory();
  state.shapes = state.shapes.filter(s=>s.id!==state.selectedId);
  state.connections = state.connections.filter(c=>c.id!==state.selectedId && c.fromId!==state.selectedId && c.toId!==state.selectedId);
  state.selectedId = null;
  render();
}

/* ============ CANVAS INTERACTION ============ */
const svg = document.getElementById('dfdSvg');
const layer = document.getElementById('canvasLayer');
svg.addEventListener('dragstart', (e)=> e.preventDefault());
svg.addEventListener('selectstart', (e)=> e.preventDefault());
function svgPoint(evt){
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = layer.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  return {x:p.x, y:p.y};
}
const DEFAULT_SIZE = {process:{w:160,h:90}, entity:{w:150,h:70}, store:{w:170,h:60}};
function nextProcessNum(){
  const nums = state.shapes.filter(s=>s.type==='process').map(s=>s.num).filter(Boolean);
  if(app.level===0) return '0';
  if(app.level===1) return (nums.length+1)+'.0';
  const parent = currentLevelData().parentProcess || '1.0';
  const base = parent.split('.')[0];
  return base+'.'+(nums.length+1);
}
function defaultLabel(type){ if(type==='entity') return 'Entity'; if(type==='store') return 'Data Store'; return 'Process'; }

svg.addEventListener('click',(evt)=>{
  if(app.examEnded) return;
  const pencilShapeEl = evt.target.closest('[data-edit-shape-id]');
  if(pencilShapeEl){
    const shape = state.shapes.find(s=>s.id===pencilShapeEl.getAttribute('data-edit-shape-id'));
    if(shape) openLabelEditor(shape);
    return;
  }
  const pencilConnEl = evt.target.closest('[data-edit-conn-id]');
  if(pencilConnEl){
    const conn = state.connections.find(c=>c.id===pencilConnEl.getAttribute('data-edit-conn-id'));
    if(conn) openConnLabelEditor(conn);
    return;
  }
  const targetShapeEl = evt.target.closest('[data-shape-id]');
  const targetId = targetShapeEl ? targetShapeEl.getAttribute('data-shape-id') : null;

  if(['process','entity','store'].includes(state.tool)){
    if(targetId) return;
    const p = svgPoint(evt);
    const size = DEFAULT_SIZE[state.tool];
    pushHistory();
    const shape = {
      id:newId('s'), type:state.tool,
      x:p.x-size.w/2, y:p.y-size.h/2, w:size.w, h:size.h,
      label: defaultLabel(state.tool),
      num: state.tool==='process' ? nextProcessNum() : (state.tool==='store' ? 'D'+(state.shapes.filter(s=>s.type==='store').length+1) : undefined)
    };
    state.shapes.push(shape);
    state.tool = 'select';
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b=>b.classList.remove('active'));
    document.querySelector('.tool-btn[data-tool="select"]').classList.add('active');
    render();
    openLabelEditor(shape);
    return;
  }

  if(state.tool==='select'){
    if(targetId){ state.selectedId = targetId; }
    else {
      const connEl = evt.target.closest('[data-conn-id]');
      state.selectedId = connEl ? connEl.getAttribute('data-conn-id') : null;
    }
    render();
  }
});

let dragging = null;
let draggingWaypoint = null;
let draggingEndpointConn = null;
let newConnDrag = null;
let panningCanvas = null;
svg.addEventListener('mousedown',(evt)=>{
  if(state.tool!=='select' || app.examEnded) return;
  evt.preventDefault();

  const wpEl = evt.target.closest('.waypoint-handle');
  if(wpEl){
    const conn = state.connections.find(c=>c.id===wpEl.getAttribute('data-conn-id'));
    const idx = parseInt(wpEl.getAttribute('data-wp'),10);
    if(conn){ draggingWaypoint = {conn, index: idx, moved:false}; return; }
  }

  const segEl = evt.target.closest('.seg-insert');
  if(segEl){
    const conn = state.connections.find(c=>c.id===segEl.getAttribute('data-conn-id'));
    const segIdx = parseInt(segEl.getAttribute('data-seg'),10);
    if(conn){
      if(!conn.waypoints) conn.waypoints = [];
      const p = svgPoint(evt);
      conn.waypoints.splice(segIdx, 0, {x:p.x, y:p.y});
      draggingWaypoint = {conn, index: segIdx, moved:false};
      return;
    }
  }

  const endEl = evt.target.closest('.conn-endpoint');
  if(endEl){
    const conn = state.connections.find(c=>c.id===endEl.getAttribute('data-conn-id'));
    const end = endEl.getAttribute('data-end');
    if(conn){ draggingEndpointConn = {conn, end}; return; }
  }

  const targetShapeEl = evt.target.closest('[data-shape-id]');
  if(!targetShapeEl){
    const rect = svg.getBoundingClientRect();
    panningCanvas = {startX:evt.clientX, startY:evt.clientY, panX:state.panX, panY:state.panY, width:rect.width, height:rect.height};
    svg.classList.add('is-panning');
    return;
  }
  const shape = state.shapes.find(s=>s.id===targetShapeEl.getAttribute('data-shape-id'));
  if(!shape) return;
  const p = svgPoint(evt);
  const EDGE = 14;
  const edgeDist = Math.min(p.x-shape.x, shape.x+shape.w-p.x, p.y-shape.y, shape.y+shape.h-p.y);
  if(edgeDist <= EDGE){
    const {side,frac} = pointToSideFrac(shape, p);
    newConnDrag = {fromId:shape.id, fromSide:side, fromFrac:frac, cur:{x:p.x,y:p.y}};
    return;
  }
  dragging = {shape, offX:p.x-shape.x, offY:p.y-shape.y, moved:false};
});
svg.addEventListener('mousemove',(evt)=>{
  if(panningCanvas){
    state.panX = panningCanvas.panX + (evt.clientX-panningCanvas.startX) * 1000 / panningCanvas.width;
    state.panY = panningCanvas.panY + (evt.clientY-panningCanvas.startY) * 650 / panningCanvas.height;
    applyZoom();
    return;
  }
  if(newConnDrag){
    newConnDrag.cur = svgPoint(evt);
    render();
    return;
  }
  if(draggingWaypoint){
    const p = svgPoint(evt);
    if(!draggingWaypoint.conn.waypoints) draggingWaypoint.conn.waypoints = [];
    draggingWaypoint.conn.waypoints[draggingWaypoint.index] = {x:p.x, y:p.y};
    draggingWaypoint.moved = true;
    render();
    return;
  }
  if(draggingEndpointConn){
    draggingEndpointConn.cur = svgPoint(evt);
    render();
    return;
  }
  if(!dragging) return;
  const p = svgPoint(evt);
  dragging.shape.x = p.x-dragging.offX;
  dragging.shape.y = p.y-dragging.offY;
  dragging.moved = true;
  render();
});
window.addEventListener('mouseup',(evt)=>{
  if(panningCanvas){
    panningCanvas = null;
    svg.classList.remove('is-panning');
    return;
  }
  if(newConnDrag){
    const p = svgPoint(evt);
    const target = state.shapes.find(s=> s.id!==newConnDrag.fromId && p.x>=s.x && p.x<=s.x+s.w && p.y>=s.y && p.y<=s.y+s.h);
    if(target){
      pushHistory();
      const {side,frac} = pointToSideFrac(target, p);
      const conn = {id:newId('c'), fromId:newConnDrag.fromId, fromSide:newConnDrag.fromSide, fromFrac:newConnDrag.fromFrac, toId:target.id, toSide:side, toFrac:frac, label:'', waypoints:[]};
      state.connections.push(conn);
      newConnDrag = null;
      render();
      openConnLabelEditor(conn);
    } else {
      newConnDrag = null;
      render();
    }
    return;
  }
  if(draggingWaypoint){
    if(draggingWaypoint.moved) pushHistory();
    draggingWaypoint = null;
    render();
    return;
  }
  if(draggingEndpointConn){
    const p = svgPoint(evt);
    const conn = draggingEndpointConn.conn;
    const excludeId = draggingEndpointConn.end==='from' ? conn.toId : conn.fromId;
    const target = state.shapes.find(s=> s.id!==excludeId && p.x>=s.x && p.x<=s.x+s.w && p.y>=s.y && p.y<=s.y+s.h);
    if(target){
      pushHistory();
      const {side,frac} = pointToSideFrac(target, p);
      if(draggingEndpointConn.end==='from'){ conn.fromId=target.id; conn.fromSide=side; conn.fromFrac=frac; }
      else { conn.toId=target.id; conn.toSide=side; conn.toFrac=frac; }
    }
    draggingEndpointConn = null;
    render();
    return;
  }
  if(dragging && dragging.moved) pushHistory();
  dragging=null;
});

function openLabelEditor(shape){
  document.querySelector('.floating-input')?.remove();
  const matrix = layer.getScreenCTM();
  const topLeft = new DOMPoint(shape.x, shape.y).matrixTransform(matrix);
  const bottomRight = new DOMPoint(shape.x+shape.w, shape.y+shape.h).matrixTransform(matrix);
  const input = document.createElement('textarea');
  input.className = 'floating-input';
  input.value = shape.label;
  input.style.left = topLeft.x+'px';
  input.style.top = topLeft.y+'px';
  input.style.width = (bottomRight.x-topLeft.x)+'px';
  input.style.height = (bottomRight.y-topLeft.y)+'px';
  input.style.resize = 'none';
  document.body.appendChild(input);
  input.focus(); input.select();
  let committed = false;
  function commit(){ if(committed) return; committed = true; shape.label = input.value.trim() || shape.label; input.remove(); pushHistory(); render(); }
  input._commit = commit;
  input.addEventListener('blur', commit);
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); commit(); }});
}
function openConnLabelEditor(conn){
  const pts = connPoints(conn, state.shapes);
  if(!pts) return;
  const mx = pts.labelMid.x, my = pts.labelMid.y;
  const matrix = layer.getScreenCTM();
  const topLeft = new DOMPoint(mx-60, my-12).matrixTransform(matrix);
  const bottomRight = new DOMPoint(mx+60, my+12).matrixTransform(matrix);
  const input = document.createElement('input');
  input.className = 'floating-input';
  input.placeholder = 'ชื่อ Data Flow...';
  input.value = conn.label || '';
  input.style.left = topLeft.x+'px';
  input.style.top = topLeft.y+'px';
  input.style.width = (bottomRight.x-topLeft.x)+'px';
  document.body.appendChild(input);
  input.focus();
  let committed = false;
  function commit(){ if(committed) return; committed = true; conn.label = input.value.trim(); input.remove(); pushHistory(); render(); }
  input._commit = commit;
  input.addEventListener('blur', commit);
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); }});
}
/* Clicking anywhere outside a floating label editor commits it — needed because the
   canvas's own mousedown handler calls preventDefault(), which would otherwise
   suppress the browser's normal blur-on-click-away behavior. Runs in the capture
   phase so it fires before that handler. */
document.addEventListener('mousedown', (evt)=>{
  const fi = document.querySelector('.floating-input');
  if(fi && evt.target !== fi && !fi.contains(evt.target)){
    fi._commit && fi._commit();
  }
}, true);
svg.addEventListener('dblclick',(evt)=>{
  if(app.examEnded) return;
  const wpEl = evt.target.closest('.waypoint-handle');
  if(wpEl){
    const conn = state.connections.find(c=>c.id===wpEl.getAttribute('data-conn-id'));
    const idx = parseInt(wpEl.getAttribute('data-wp'),10);
    if(conn && conn.waypoints){ pushHistory(); conn.waypoints.splice(idx,1); render(); }
    return;
  }
  const targetShapeEl = evt.target.closest('[data-shape-id]');
  if(targetShapeEl){
    const shape = state.shapes.find(s=>s.id===targetShapeEl.getAttribute('data-shape-id'));
    if(shape) openLabelEditor(shape);
    return;
  }
  const connEl = evt.target.closest('[data-conn-id]');
  if(connEl){
    const conn = state.connections.find(c=>c.id===connEl.getAttribute('data-conn-id'));
    if(conn) openConnLabelEditor(conn);
  }
});

/* ============ ON-SCREEN RENDER (class based) ============ */
function shapeSVG(s){
  const cx=s.x+s.w/2, cy=s.y+s.h/2;
  const sel = (s.id===state.selectedId) ? 'selected-shape' : '';
  const cls = sel;
  let shapeEl = '', idLabel = '';
  if(s.type === 'process'){
    const r = Math.min(28, s.h/2.6);
    shapeEl = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${r}" class="shape-process-outline ${cls}" data-shape-id="${s.id}"/>
      <line x1="${s.x}" y1="${s.y+s.h*0.42}" x2="${s.x+s.w}" y2="${s.y+s.h*0.42}" class="shape-process-divider" data-shape-id="${s.id}"/>`;
    if(s.num) idLabel = `<text x="${cx}" y="${s.y+s.h*0.21}" class="shape-label-id">${escapeXML(s.num)}</text>`;
  } else if(s.type === 'entity'){
    shapeEl = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" class="shape-entity ${cls}" data-shape-id="${s.id}"/>`;
  } else {
    shapeEl = `<g data-shape-id="${s.id}" class="${cls}">
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" class="shape-store-outline" data-shape-id="${s.id}"/>
      <line x1="${s.x+14}" y1="${s.y}" x2="${s.x+14}" y2="${s.y+s.h}" class="shape-store-bar"/>
    </g>`;
    if(s.num) idLabel = `<text x="${s.x+7}" y="${s.y+14}" class="shape-label-id" style="font-size:10px;">${escapeXML(s.num)}</text>`;
  }
  const labelY = s.type==='process' ? cy + s.h*0.08 : cy;
  const lines = s.label.split('\n');
  const fs = s.fontSize || 13;
  const labelEl = lines.map((line,i)=>`<text x="${cx}" y="${labelY+(i-(lines.length-1)/2)*(fs+2)}" class="shape-label" style="font-size:${fs}px;">${escapeXML(line)}</text>`).join('');
  let pencil = '';
  if(s.id===state.selectedId && state.tool==='select'){
    const px = s.x+s.w+30, py = s.y-16;
    pencil = `<g data-edit-shape-id="${s.id}" style="cursor:pointer;">
      <circle cx="${px}" cy="${py}" r="13" fill="#2563EB" stroke="#fff" stroke-width="2"/>
      <text x="${px}" y="${py+4}" text-anchor="middle" font-size="13" fill="#fff" style="pointer-events:none;">✎</text>
    </g>`;
  }
  return shapeEl + idLabel + labelEl + pencil;
}
function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function pointToSideFrac(shape, pt){
  const distTop = Math.abs(pt.y - shape.y);
  const distBottom = Math.abs(pt.y - (shape.y+shape.h));
  const distLeft = Math.abs(pt.x - shape.x);
  const distRight = Math.abs(pt.x - (shape.x+shape.w));
  const min = Math.min(distTop,distBottom,distLeft,distRight);
  if(min===distLeft) return {side:'left', frac: clamp01((pt.y-shape.y)/shape.h)};
  if(min===distRight) return {side:'right', frac: clamp01((pt.y-shape.y)/shape.h)};
  if(min===distTop) return {side:'top', frac: clamp01((pt.x-shape.x)/shape.w)};
  return {side:'bottom', frac: clamp01((pt.x-shape.x)/shape.w)};
}
function sideFracPoint(shape, side, frac){
  const f = frac==null ? 0.5 : frac;
  if(side==='top') return {x:shape.x+f*shape.w, y:shape.y};
  if(side==='bottom') return {x:shape.x+f*shape.w, y:shape.y+shape.h};
  if(side==='left') return {x:shape.x, y:shape.y+f*shape.h};
  return {x:shape.x+shape.w, y:shape.y+f*shape.h};
}
function connPoints(c, shapes){
  const from = shapes.find(s=>s.id===c.fromId);
  const to = shapes.find(s=>s.id===c.toId);
  if(!from||!to) return null;
  const fromSide = c.fromSide||'right';
  const toSide = c.toSide||'left';
  const p0 = sideFracPoint(from, fromSide, c.fromFrac);
  const pEnd = sideFracPoint(to, toSide, c.toFrac);
  const waypoints = c.waypoints || [];
  let points;
  if(waypoints.length){
    // user has manually routed this flow — respect their waypoints exactly
    points = [p0, ...waypoints, pEnd];
  } else if(fromSide==='bottom' && toSide==='bottom'){
    // both leave from the bottom edge: drop down first, go across, then come back up
    const dropY = Math.max(p0.y, pEnd.y) + 44;
    points = [p0, {x:p0.x, y:dropY}, {x:pEnd.x, y:dropY}, pEnd];
  } else if(fromSide==='top' && toSide==='top'){
    // both leave from the top edge: rise up first, go across, then come back down
    const riseY = Math.min(p0.y, pEnd.y) - 44;
    points = [p0, {x:p0.x, y:riseY}, {x:pEnd.x, y:riseY}, pEnd];
  } else if(fromSide==='left' && toSide==='left'){
    const pushX = Math.min(p0.x, pEnd.x) - 44;
    points = [p0, {x:pushX, y:p0.y}, {x:pushX, y:pEnd.y}, pEnd];
  } else if(fromSide==='right' && toSide==='right'){
    const pushX = Math.max(p0.x, pEnd.x) + 44;
    points = [p0, {x:pushX, y:p0.y}, {x:pushX, y:pEnd.y}, pEnd];
  } else {
    points = [p0, pEnd];
  }
  let bestSeg=null, bestLen=-1;
  for(let i=0;i<points.length-1;i++){
    const a=points[i], b=points[i+1];
    const len=Math.hypot(b.x-a.x, b.y-a.y);
    if(len>bestLen){ bestLen=len; bestSeg={a,b}; }
  }
  const horizontal = Math.abs(bestSeg.a.y-bestSeg.b.y) < Math.abs(bestSeg.a.x-bestSeg.b.x);
  const labelMid = {x:(bestSeg.a.x+bestSeg.b.x)/2, y:(bestSeg.a.y+bestSeg.b.y)/2};
  return {points, labelMid, horizontal};
}
function connSVG(c, shapes, markerId){
  const r = connPoints(c, shapes);
  if(!r) return '';
  const sel = (c.id===state.selectedId) ? 'selected-shape' : '';
  const pts = r.points;
  const pathD = 'M'+pts.map(p=>`${p.x},${p.y}`).join(' L');
  const mid = markerId || 'arrow';
  const arrowSide = c.arrowSide || 'end';
  const markerAttrs =
    (arrowSide==='end'||arrowSide==='both' ? ` marker-end="url(#${mid})"` : '') +
    (arrowSide==='start'||arrowSide==='both' ? ` marker-start="url(#${mid})"` : '');
  let handles = '', endpoints = '', pencil = '';
  if(state.tool==='select' && c.id===state.selectedId){
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i], b=pts[i+1];
      const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      handles += `<circle cx="${mx}" cy="${my}" r="6" class="seg-insert ${sel}" data-conn-id="${c.id}" data-seg="${i}"/>`;
    }
    for(let i=1;i<pts.length-1;i++){
      const p=pts[i];
      handles += `<circle cx="${p.x}" cy="${p.y}" r="7" class="waypoint-handle ${sel}" data-conn-id="${c.id}" data-wp="${i-1}"/>`;
    }
    endpoints = `<rect x="${pts[0].x-6}" y="${pts[0].y-6}" width="12" height="12" class="conn-endpoint" data-conn-id="${c.id}" data-end="from"/>
      <rect x="${pts[pts.length-1].x-6}" y="${pts[pts.length-1].y-6}" width="12" height="12" class="conn-endpoint" data-conn-id="${c.id}" data-end="to"/>`;
  }
  if(state.tool==='select' && c.id===state.selectedId){
    const px = r.labelMid.x+16, py = r.labelMid.y-16;
    pencil = `<g data-edit-conn-id="${c.id}" style="cursor:pointer;">
      <circle cx="${px}" cy="${py}" r="12" fill="#2563EB" stroke="#fff" stroke-width="2"/>
      <text x="${px}" y="${py+4}" text-anchor="middle" font-size="12" fill="#fff" style="pointer-events:none;">✎</text>
    </g>`;
  }
  let labelEl = '';
  if(c.label){
    const approxW = Math.max(28, c.label.length*7.2+14);
    const anchor = r.horizontal ? 'middle' : 'start';
    const lx = r.horizontal ? r.labelMid.x : r.labelMid.x+10;
    const ly = r.horizontal ? r.labelMid.y-10 : r.labelMid.y+4;
    const rectX = anchor==='middle' ? lx-approxW/2 : lx-6;
    labelEl = `<rect x="${rectX}" y="${ly-13}" width="${approxW}" height="17" rx="4" style="fill:var(--bg);" opacity="0.95" data-conn-id="${c.id}"/>
      <text x="${lx}" y="${ly}" class="flow-label" style="text-anchor:${anchor};" data-conn-id="${c.id}">${escapeXML(c.label)}</text>`;
  }
  return `<path d="${pathD}" stroke="transparent" stroke-width="16" fill="none" data-conn-id="${c.id}"/>
    <path d="${pathD}" class="flow-line ${sel}" data-conn-id="${c.id}" style="stroke-width:${c.strokeWidth||2};"${markerAttrs}/>
    ${labelEl}
    ${handles}${endpoints}${pencil}`;
}
function edgePoint(shape,tx,ty){
  const cx=shape.x+shape.w/2, cy=shape.y+shape.h/2;
  const dx=tx-cx, dy=ty-cy;
  const halfW=shape.w/2, halfH=shape.h/2;
  if(dx===0 && dy===0) return {x:cx,y:cy};
  const scale = Math.min(Math.abs(halfW/dx || Infinity), Math.abs(halfH/dy || Infinity));
  return {x:cx+dx*scale, y:cy+dy*scale};
}
function escapeXML(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let lastPropSelId = undefined;
let lastPropSelType = undefined;
function escAttr(str){ return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function updatePropPanel(){
  const panel = document.getElementById('propPanelBody');
  const sel = state.selectedId;
  const shape = sel ? state.shapes.find(s=>s.id===sel) : null;
  const conn = (sel && !shape) ? state.connections.find(c=>c.id===sel) : null;

  if(shape){
    panel.innerHTML = `
      <label class="prop-label">ข้อความ</label>
      <textarea id="propLabelInput" class="prop-input" rows="2">${escAttr(shape.label)}</textarea>
      <label class="prop-label">ขนาดตัวอักษร</label>
      <div class="prop-btn-row" id="propFontRow">
        ${[['เล็ก',11],['กลาง',13],['ใหญ่',16]].map(([name,size])=>`<button type="button" class="prop-btn ${(shape.fontSize||13)===size?'active':''}" data-fontsize="${size}">${name}</button>`).join('')}
      </div>
      <p class="prop-hint">💡 ดับเบิลคลิกที่ symbol หรือกดปุ่ม ✎ ก็แก้ไขข้อความได้เช่นกัน</p>
    `;
    const labelInput = document.getElementById('propLabelInput');
    labelInput.addEventListener('input', (e)=>{ shape.label = e.target.value; render(); });
    labelInput.addEventListener('blur', ()=> pushHistory());
    panel.querySelectorAll('[data-fontsize]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ pushHistory(); shape.fontSize = parseInt(btn.dataset.fontsize,10); render(); updatePropPanel(); });
    });
  } else if(conn){
    const curArrow = conn.arrowSide || 'end';
    const curThick = conn.strokeWidth || 2;
    panel.innerHTML = `
      <label class="prop-label">ข้อความ Data Flow</label>
      <input id="propConnLabelInput" class="prop-input" type="text" value="${escAttr(conn.label)}">
      <label class="prop-label">ความหนาเส้น</label>
      <div class="prop-btn-row" id="propThickRow">
        ${[['บาง',1.5],['กลาง',2],['หนา',3.5]].map(([name,w])=>`<button type="button" class="prop-btn ${curThick===w?'active':''}" data-thick="${w}">${name}</button>`).join('')}
      </div>
      <label class="prop-label">หัวลูกศร</label>
      <div class="prop-btn-row" id="propArrowRow">
        ${[['start','←'],['both','↔'],['end','→'],['none','—']].map(([val,sym])=>`<button type="button" class="prop-btn ${curArrow===val?'active':''}" data-arrow="${val}">${sym}</button>`).join('')}
      </div>
    `;
    const connLabelInput = document.getElementById('propConnLabelInput');
    connLabelInput.addEventListener('input', (e)=>{ conn.label = e.target.value; render(); });
    connLabelInput.addEventListener('blur', ()=> pushHistory());
    panel.querySelectorAll('[data-thick]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ pushHistory(); conn.strokeWidth = parseFloat(btn.dataset.thick); render(); updatePropPanel(); });
    });
    panel.querySelectorAll('[data-arrow]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ pushHistory(); conn.arrowSide = btn.dataset.arrow; render(); updatePropPanel(); });
    });
  } else {
    panel.innerHTML = '<p class="prop-empty">เลือก Symbol หรือเส้น Data Flow เพื่อแก้ไขคุณสมบัติ</p>';
  }
}
function render(){
  let html = state.connections.map(c=>{
    if(draggingEndpointConn && draggingEndpointConn.conn.id===c.id){
      const fixedShape = state.shapes.find(s=>s.id === (draggingEndpointConn.end==='from'?c.toId:c.fromId));
      const fixedSide = draggingEndpointConn.end==='from' ? c.toSide : c.fromSide;
      const fixedFrac = draggingEndpointConn.end==='from' ? c.toFrac : c.fromFrac;
      if(fixedShape){
        const fp = sideFracPoint(fixedShape, fixedSide||'right', fixedFrac);
        const cp = draggingEndpointConn.cur || fp;
        return `<line x1="${fp.x}" y1="${fp.y}" x2="${cp.x}" y2="${cp.y}" class="new-conn-preview"/>`;
      }
    }
    return connSVG(c, state.shapes);
  }).join('') + state.shapes.map(s=>shapeSVG(s)).join('');
  if(newConnDrag){
    const from = state.shapes.find(s=>s.id===newConnDrag.fromId);
    if(from){
      const p0 = sideFracPoint(from, newConnDrag.fromSide, newConnDrag.fromFrac);
      html += `<line x1="${p0.x}" y1="${p0.y}" x2="${newConnDrag.cur.x}" y2="${newConnDrag.cur.y}" class="new-conn-preview" marker-end="url(#arrow)"/>`;
    }
  }
  layer.innerHTML = html;
  document.getElementById('hintCount').textContent = state.hintsLeft;
  document.getElementById('hintBtn').style.opacity = state.hintsLeft>0 ? 1 : .5;
  if(state.selectedId !== lastPropSelId){
    lastPropSelId = state.selectedId;
    updatePropPanel();
  }
  scheduleDfdSave();
}

/* ============ HINT ENGINE (student aid only, no answer wording revealed) ============ */
document.getElementById('hintBtn').addEventListener('click', ()=>{
  if(state.hintsLeft<=0 || app.examEnded) return;
  state.hintsLeft--;
  showToast(generateExactHint());
  render();
});
function generateExactHint(){
  const answer = currentLevelData();
  const labelOf = id => state.shapes.find(s=>s.id===id)?.label?.trim() || '';
  const expectedEntities = answer.shapes.filter(s=>s.type==='entity');
  const expectedProcesses = answer.shapes.filter(s=>s.type==='process');
  const expectedStores = answer.shapes.filter(s=>s.type==='store');

  const missingEntity = expectedEntities.find(expected =>
    !state.shapes.some(shape => shape.type==='entity' && shape.label.trim()===expected.label.trim()));
  if(missingEntity) return `เพิ่ม Entity: “${missingEntity.label}”`;

  const missingProcess = expectedProcesses.find(expected =>
    !state.shapes.some(shape => shape.type==='process' && shape.num===expected.num && shape.label.trim()===expected.label.trim()));
  if(missingProcess) return `เพิ่ม Process ${missingProcess.num}: “${missingProcess.label}”`;

  const missingStore = expectedStores.find(expected =>
    !state.shapes.some(shape => shape.type==='store' && shape.num===expected.num && shape.label.trim()===expected.label.trim()));
  if(missingStore) return `เพิ่ม Data Store ${missingStore.num}: “${missingStore.label}”`;

  const missingFlow = answer.connections.find(expected =>
    !state.connections.some(flow => labelOf(flow.fromId)===expected.keyFrom && labelOf(flow.toId)===expected.keyTo));
  if(missingFlow) return `เชื่อม Data Flow: “${missingFlow.keyFrom}” → “${missingFlow.keyTo}” แล้วตั้งชื่อเส้นว่า “${missingFlow.label}”`;

  return 'องค์ประกอบและเส้นทางข้อมูลครบตามคำตอบแล้ว';
}
function generateHint(){
  const processes = state.shapes.filter(s=>s.type==='process');
  const entities = state.shapes.filter(s=>s.type==='entity');
  const stores = state.shapes.filter(s=>s.type==='store');
  const q = currentQuestion();
  const lvl = currentLevelData();
  const expectedProcesses = lvl.shapes.filter(s=>s.type==='process');
  const expectedStores = lvl.shapes.filter(s=>s.type==='store');

  /* 1) Missing / mismatched Entity — the most common real issue (e.g. student typed
     "member" instead of "สมาชิก"). Since matching is done on the Thai keyword that
     already appears in the problem statement, we can safely name exactly which
     keyword is not found and explain why, without leaking anything beyond the
     problem text the student already has in the side panel. */
  const missingEntities = q.entities.filter(k=>!entities.some(e=>e.label.includes(k)));
  if(missingEntities.length){
    const missing = missingEntities[0];
    return `💡 ระบบยังไม่พบ Entity ที่มีคำว่า "${missing}" อยู่ในชื่อ (ระบบตรวจจากข้อความภาษาไทยตรงตัวตามที่ปรากฏในโจทย์) — ถ้าตั้งชื่อเป็นภาษาอังกฤษ ย่อคำ หรือสะกด/เว้นวรรคต่างไปจากโจทย์ ระบบจะไม่นับว่าเป็น Entity เดียวกัน ลองแก้ไขชื่อ Entity ให้มีคำว่า "${missing}" ปรากฏอยู่ในข้อความ`;
  }

  /* 2) Process presence / count */
  if(processes.length===0){
    return app.level===0
      ? '💡 ยังไม่มี Process — เริ่มจากวาง Process หลัก (1 กล่อง) ไว้ตรงกลางก่อน'
      : '💡 ยังไม่มี Process ในไดอะแกรม ลองเพิ่ม Process ย่อยตามที่โจทย์ต้องการ';
  }
  if(app.level===0 && stores.length>0){
    return '💡 Context Diagram (Level 0) ไม่ควรมี Data Store ปรากฏอยู่ ลองพิจารณาลบออก เพราะ Level 0 มองระบบเป็นกล่องเดียว';
  }
  if(processes.length < expectedProcesses.length){
    return `💡 จำนวน Process ยังดูน้อยไป (ตอนนี้มี ${processes.length} Process) ลองพิจารณาว่ายังต้องแตก Process ย่อยเพิ่มอีกหรือไม่ ตาม Requirement ที่ให้ไว้`;
  }

  /* 3) Data Store expectation for Level 1/2 */
  if(app.level>0 && expectedStores.length>0 && stores.length===0){
    return '💡 โจทย์ระดับนี้น่าจะต้องมี Data Store เพื่อเก็บข้อมูลระหว่าง Process ลองพิจารณาว่าควรมี Data Store เก็บข้อมูลอะไรบ้าง';
  }

  /* 4) Process numbering convention */
  if(app.level===0 && !processes.every(p=>p.num==='0')){
    return '💡 Process หลักใน Level 0 ควรใช้เลข 0 กำกับ (Context Process)';
  }
  if(app.level>0 && !processes.every(p=>/^\d+(\.\d+)?$/.test(p.num||''))){
    return '💡 ตรวจสอบการตั้งเลข Process ให้อยู่ในรูปแบบตัวเลข เช่น 1.0, 2.0 หรือ 1.1, 1.2 ให้ครบทุก Process';
  }

  /* 5) Miracle / Black hole — point at the specific offending process */
  const noInput = processes.find(p=>!state.connections.some(c=>c.toId===p.id));
  if(noInput) return `💡 Process "${noInput.label}" ยังไม่มี Data Flow ไหลเข้า (Miracle) ลองตรวจสอบว่าต้องรับข้อมูลมาจากที่ใดบ้าง`;
  const noOutput = processes.find(p=>!state.connections.some(c=>c.fromId===p.id));
  if(noOutput) return `💡 Process "${noOutput.label}" ยังไม่มี Data Flow ไหลออก (Black Hole) ลองตรวจสอบว่าต้องส่งข้อมูลไปที่ใดบ้าง`;

  /* 6) Unlabeled flows */
  const unlabeled = state.connections.find(c=>!c.label || !c.label.trim());
  if(unlabeled) return '💡 มีเส้น Data Flow ที่ยังไม่ได้ตั้งชื่อ ลองดับเบิลคลิกที่เส้น (หรือกดปุ่ม ✎) เพื่อใส่ชื่อ Data Flow ให้ครบทุกเส้น';

  /* 7) Entity <-> Entity or Entity <-> Store direct connections (structure violation) */
  const entityIds = new Set(entities.map(s=>s.id));
  const storeIds = new Set(stores.map(s=>s.id));
  const badConn = state.connections.find(c=>
    (entityIds.has(c.fromId) && entityIds.has(c.toId)) ||
    (entityIds.has(c.fromId) && storeIds.has(c.toId)) ||
    (storeIds.has(c.fromId) && entityIds.has(c.toId)) ||
    (storeIds.has(c.fromId) && storeIds.has(c.toId))
  );
  if(badConn) return '💡 มี Data Flow ที่เชื่อมตรงระหว่าง Entity กับ Entity หรือ Entity กับ Data Store โดยไม่ผ่าน Process ซึ่งไม่ถูกต้องตามหลัก DFD ลองตรวจสอบเส้นเหล่านี้';

  return '💡 ลองตรวจสอบทิศทางและชื่อของ Data Flow ทุกเส้นระหว่าง Entity, Process และ Data Store อีกครั้งว่าครบตามที่โจทย์ต้องการหรือยัง';
}
function showToast(msg){
  const toast = document.getElementById('hintToast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.add('hidden'), 5000);
}

/* ============ SUBMIT LEVEL (score only — no answer key shown; best score is kept, resubmitting edits the same diagram) ============ */
document.getElementById('submitBtn').addEventListener('click', ()=>{
  if(confirm('ยืนยันส่งคำตอบ Level นี้? ระบบจะเก็บ "คะแนนสูงสุด" ที่เคยทำได้ในระดับนี้ไว้เสมอ')) submitLevel();
});
function submitLevel(){
  const result = gradeDiagram(state.shapes, state.connections);
  const latestSnapshot = {
    shapes: JSON.parse(JSON.stringify(state.shapes)),
    connections: JSON.parse(JSON.stringify(state.connections))
  };
  const existing = app.attempts[app.level];
  const isNewBest = !existing || result.total > existing.best.result.total;
  const bestSoFar = existing ? existing.best.result.total : null;

  app.attempts[app.level] = {
    // "best" keeps the highest-scoring attempt (used for the PDF export)
    best: isNewBest ? {result, shapes: latestSnapshot.shapes, connections: latestSnapshot.connections} : existing.best,
    // "latest" is always the most recent canvas state, so retrying resumes editing
    // the same diagram instead of starting over from a blank canvas
    latest: latestSnapshot
  };
  saveDfdSession();
  showLevelResultModal(result, isNewBest, isNewBest ? result.total : bestSoFar);
}
function showLevelResultModal(result, isNewBest, bestTotal){
  document.getElementById('modalLevelLabel').textContent = 'ผลคะแนน ' + LEVEL_TITLES[app.level];
  document.getElementById('modalScore').style.display = 'none';
  const noteEl = document.getElementById('modalBestNote');
  if(bestTotal!=null){
    noteEl.classList.remove('hidden');
    if(isNewBest){
      noteEl.classList.add('is-new');
      noteEl.textContent = '🎉 คะแนนสูงสุดใหม่ของ Level นี้!';
    } else {
      noteEl.classList.remove('is-new');
      noteEl.textContent = `🏆 คะแนนสูงสุดที่เคยทำได้ใน Level นี้: ${bestTotal}/100 (ระบบจะเก็บคะแนนที่สูงที่สุดไว้ใช้ตอนออก PDF)`;
    }
  } else {
    noteEl.classList.add('hidden');
  }
  const labels = {structure:'Structure',dataflow:'Data Flow',process:'Process',datastore:'Data Store',entity:'Entity',naming:'Naming'};
  document.getElementById('modalBreakdown').innerHTML = Object.entries(result.breakdown).map(([k,v])=>
    `<div class="modal-bd-item">${labels[k]}<b>${v.score}/${v.max}</b></div>`).join('');
  document.getElementById('modalBestNote').classList.remove('hidden');
  document.getElementById('modalBestNote').classList.remove('is-new');
  document.getElementById('modalBestNote').textContent = 'บันทึกคำตอบแล้ว คะแนนจะประกาศโดยผู้สอน';
  document.getElementById('modalBreakdown').innerHTML = '';
  document.getElementById('levelResultModal').classList.remove('hidden');
}
document.getElementById('modalBackBtn').addEventListener('click', ()=>{
  document.getElementById('levelResultModal').classList.add('hidden');
  showHub();
});
document.getElementById('modalRetryBtn').addEventListener('click', ()=>{
  document.getElementById('levelResultModal').classList.add('hidden');
  enterLevel(app.level); // resumes editing from the just-submitted diagram
});

/* ============ GRADING ENGINE (generalized for any level; answer key never surfaced to student) ============ */
function gradeDiagram(shapes, connections){
  const answerKey = currentLevelData();
  const q = currentQuestion();
  const processes = shapes.filter(s=>s.type==='process');
  const entities = shapes.filter(s=>s.type==='entity');
  const stores = shapes.filter(s=>s.type==='store');
  const expectedProcesses = answerKey.shapes.filter(s=>s.type==='process');
  const expectedStores = answerKey.shapes.filter(s=>s.type==='store');
  const expectedEntityKeys = answerKey.shapes.filter(s=>s.type==='entity').map(s=>s.label);
  const expectedConns = answerKey.connections;

  /* Process (20): 5 for having the right count, 15 for actually having flows in & out.
     Placing symbols with no connections at all should not earn meaningful Process credit. */
  let processScore = 0;
  if(processes.length === expectedProcesses.length) processScore += 5;
  else if(processes.length > 0) processScore += 2;
  let inOutOk = 0;
  processes.forEach(p=>{
    const expected = expectedProcesses.find(item => item.num && item.num === p.num);
    const needsIn = !expected || expectedConns.some(c => c.to === expected.id);
    const needsOut = !expected || expectedConns.some(c => c.from === expected.id);
    const hasIn = connections.some(c=>c.toId===p.id);
    const hasOut = connections.some(c=>c.fromId===p.id);
    if((!needsIn || hasIn) && (!needsOut || hasOut)) inOutOk++;
  });
  processScore += processes.length ? Math.round((inOutOk/processes.length)*15) : 0;

  /* Entity (10) — unchanged, based on matching required keywords in the label text */
  const matchedKeywords = expectedEntityKeys.filter(k => entities.some(e=>e.label.includes(k)));
  const entityScore = Math.round((matchedKeywords.length/expectedEntityKeys.length)*10);

  /* Data Store (10) — unchanged */
  let storeScore;
  if(shapes.length === 0){
    storeScore = 0;
  } else if(expectedStores.length === 0){
    storeScore = stores.length===0 ? 10 : Math.max(0, 10 - stores.length*5);
  } else {
    const diff = Math.abs(stores.length - expectedStores.length);
    storeScore = Math.max(0, 10 - diff*5);
  }

  /* Structure (30): now REQUIRES actual Data Flow lines to earn any points at all.
     - 0 lines drawn anywhere -> 0 points, no matter how many symbols are placed.
     - Otherwise: up to 15 pts for drawing roughly the expected number of flows,
       and up to 15 pts for those flows respecting valid DFD connection rules
       (no Entity-Entity, Entity-Store, or Store-Store direct connections). */
  const entityIds = new Set(entities.map(s=>s.id));
  const storeIds = new Set(stores.map(s=>s.id));
  let violations = 0;
  connections.forEach(c=>{
    if(entityIds.has(c.fromId) && entityIds.has(c.toId)) violations++;
    if((entityIds.has(c.fromId)&&storeIds.has(c.toId)) || (storeIds.has(c.fromId)&&entityIds.has(c.toId))) violations++;
    if(storeIds.has(c.fromId) && storeIds.has(c.toId)) violations++;
  });
  let structureScore;
  if(connections.length === 0){
    structureScore = 0;
  } else {
    const coverage = expectedConns.length ? Math.min(1, connections.length/expectedConns.length) : 1;
    const coverageScore = Math.round(coverage*15);
    const validityScore = Math.max(0, 15 - violations*7);
    structureScore = Math.min(30, coverageScore + validityScore);
  }

  /* Data Flow (25) — unchanged; already naturally 0 with no matching connections */
  const labelOf = (id)=>{
    const sh = shapes.find(s=>s.id===id);
    if(!sh) return '';
    if(sh.type==='process') return sh.num || sh.label;
    if(sh.type==='store') return sh.num || sh.label;
    return expectedEntityKeys.find(k=>sh.label.includes(k)) || sh.label;
  };
  let flowScore = 0;
  const perFlow = 25/expectedConns.length;
  expectedConns.forEach(exp=>{
    const match = connections.find(c=> labelOf(c.fromId)===exp.keyFrom && labelOf(c.toId)===exp.keyTo);
    const reverseMatch = !match && connections.find(c=> labelOf(c.fromId)===exp.keyTo && labelOf(c.toId)===exp.keyFrom);
    if(match) flowScore += perFlow;
    else if(reverseMatch) flowScore += perFlow*0.5;
  });
  flowScore = Math.round(flowScore);

  /* Naming (5) — unchanged, naturally low when nothing is connected/labeled */
  let namingScore = 0;
  const properlyNumbered = processes.filter(p=> app.level===0 ? p.num==='0' : /^\d+(\.\d+)?$/.test(p.num||''));
  namingScore += processes.length ? Math.round((properlyNumbered.length/processes.length)*3) : 0;
  const namedProperly = shapes.filter(s=>s.label && !['Entity','Process','Data Store'].includes(s.label)).length;
  namingScore += Math.min(2, shapes.length ? Math.round((namedProperly/shapes.length)*2) : 0);
  namingScore = Math.min(5, namingScore);

  const total = Math.min(100, Math.round(processScore+entityScore+storeScore+structureScore+flowScore+namingScore));

  return {
    total,
    breakdown:{
      structure:{score:structureScore, max:30},
      dataflow:{score:flowScore, max:25},
      process:{score:processScore, max:20},
      datastore:{score:storeScore, max:10},
      entity:{score:entityScore, max:10},
      naming:{score:namingScore, max:5}
    }
  };
}

/* ============ EXPORT RENDERING (inline styles, for PDF — light theme fixed colors) ============ */
const EXP = {ink:'#0F172A', blue:'#2563EB', sub:'#64748B', surface:'#FFFFFF'};
function exportShapeSVG(s){
  const cx=s.x+s.w/2, cy=s.y+s.h/2;
  let shapeEl='', idLabel='';
  if(s.type==='process'){
    const r=Math.min(28, s.h/2.6);
    shapeEl = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${r}" style="fill:${EXP.surface};stroke:${EXP.ink};stroke-width:2.4"/>
      <line x1="${s.x}" y1="${s.y+s.h*0.42}" x2="${s.x+s.w}" y2="${s.y+s.h*0.42}" style="stroke:${EXP.ink};stroke-width:2.4"/>`;
    if(s.num) idLabel = `<text x="${cx}" y="${s.y+s.h*0.21}" style="font-family:Sarabun,sans-serif;font-size:12px;font-weight:600;fill:${EXP.blue};text-anchor:middle;">${escapeXML(s.num)}</text>`;
  } else if(s.type==='entity'){
    shapeEl = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" style="fill:${EXP.surface};stroke:${EXP.ink};stroke-width:2.6"/>`;
  } else {
    shapeEl = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" style="fill:${EXP.surface};stroke:${EXP.ink};stroke-width:2.4"/>
      <line x1="${s.x+14}" y1="${s.y}" x2="${s.x+14}" y2="${s.y+s.h}" style="stroke:${EXP.ink};stroke-width:2.6"/>`;
    if(s.num) idLabel = `<text x="${s.x+7}" y="${s.y+14}" style="font-family:Sarabun,sans-serif;font-size:10px;font-weight:600;fill:${EXP.blue};">${escapeXML(s.num)}</text>`;
  }
  const labelY = s.type==='process'? cy+s.h*0.08 : cy;
  const lines = s.label.split('\n');
  const fs = s.fontSize || 13;
  const labelEl = lines.map((line,i)=>`<text x="${cx}" y="${labelY+(i-(lines.length-1)/2)*(fs+2)}" style="font-family:Sarabun,sans-serif;font-size:${fs}px;fill:${EXP.ink};text-anchor:middle;dominant-baseline:middle;">${escapeXML(line)}</text>`).join('');
  return shapeEl+idLabel+labelEl;
}
function exportConnSVG(c, shapes){
  const r = connPoints(c, shapes);
  if(!r) return '';
  const pathD = 'M'+r.points.map(p=>`${p.x},${p.y}`).join(' L');
  const arrowSide = c.arrowSide || 'end';
  const markerAttrs =
    (arrowSide==='end'||arrowSide==='both' ? ` marker-end="url(#exportArrow)"` : '') +
    (arrowSide==='start'||arrowSide==='both' ? ` marker-start="url(#exportArrow)"` : '');
  let labelEl = '';
  if(c.label){
    const approxW = Math.max(28, c.label.length*7.2+14);
    const anchor = r.horizontal ? 'middle' : 'start';
    const lx = r.horizontal ? r.labelMid.x : r.labelMid.x+10;
    const ly = r.horizontal ? r.labelMid.y-10 : r.labelMid.y+4;
    const rectX = anchor==='middle' ? lx-approxW/2 : lx-6;
    labelEl = `<rect x="${rectX}" y="${ly-13}" width="${approxW}" height="17" rx="4" style="fill:${EXP.surface};"/>
      <text x="${lx}" y="${ly}" style="font-family:Sarabun,sans-serif;font-size:11.5px;fill:${EXP.blue};text-anchor:${anchor};">${escapeXML(c.label)}</text>`;
  }
  return `<path d="${pathD}" style="stroke:${EXP.sub};stroke-width:${c.strokeWidth||2};fill:none;"${markerAttrs}/>${labelEl}`;
}
function buildExportSvgString(shapes, connections){
  const body = connections.map(c=>exportConnSVG(c,shapes)).join('') + shapes.map(s=>exportShapeSVG(s)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" width="1000" height="650">
    <rect width="1000" height="650" fill="${EXP.surface}"/>
    <defs><marker id="exportArrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L7,3 L0,6 Z" fill="${EXP.sub}"/></marker></defs>
    ${body}
  </svg>`;
}
function svgStringToPngDataUrl(svgString, w, h){
  return new Promise((resolve,reject)=>{
    const blob = new Blob([svgString], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = w*2; canvas.height = h*2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.scale(2,2);
      ctx.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ============ FINAL PDF (student submission, no scores shown) ============ */
async function generateFinalPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;
  doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text('DFD Exam Submission', margin, y); y+=30;
  doc.setFont('helvetica','normal'); doc.setFontSize(12);
  doc.text('Student: ' + (app.studentName||'-'), margin, y); y+=18;
  doc.text('Question set: ' + (currentQuestion()?.title||'-') + '  (' + (currentQuestion()?.tagline||'') + ')', margin, y); y+=18;
  doc.text('Date: ' + new Date().toLocaleString('th-TH'), margin, y); y+=26;

  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('Submitted diagrams', margin, y); y+=18;
  doc.setFont('helvetica','normal'); doc.setFontSize(11);
  [0,1,2].forEach(lv=>{
    const att = app.attempts[lv];
    doc.text(`${LEVEL_TITLES[lv]}: ` + (att ? 'Submitted' : 'Not submitted'), margin+10, y);
    y+=16;
  });

  for(const lv of [0,1,2]){
    const att = app.attempts[lv];
    doc.addPage();
    let yy = margin;
    doc.setFont('helvetica','bold'); doc.setFontSize(16);
    doc.text(`${LEVEL_TITLES[lv]}`, margin, yy); yy+=24;
    doc.setFontSize(12);
    doc.text(`Student: ${app.studentName}`, margin, yy); yy+=20;
    if(!att){
      doc.setFont('helvetica','normal'); doc.setFontSize(12);
      doc.text('No diagram was submitted for this level.', margin, yy);
      continue;
    }
    try{
      const diagram = att.latest || att.best;
      const svgStr = buildExportSvgString(diagram.shapes, diagram.connections);
      const pngUrl = await svgStringToPngDataUrl(svgStr, 1000, 650);
      const imgW = pageW - margin*2;
      const imgH = imgW * (650/1000);
      doc.addImage(pngUrl, 'PNG', margin, yy, imgW, imgH);
    }catch(e){ /* diagram render failed silently — score still recorded */ }
  }
  return doc;
}

/* ============ END OF EXAM ============ */
let finalSubmissionInProgress=false;
function setSubmissionBusy(active,message='กำลังส่งข้อสอบ...'){
  let overlay=document.getElementById('submitOverlay');
  if(active){
    if(!overlay){overlay=document.createElement('div');overlay.id='submitOverlay';overlay.className='submit-overlay';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','assertive');overlay.innerHTML='<div class="submit-overlay-card"><i class="submit-spinner"></i><b data-submit-message></b><span>กรุณารอสักครู่ และอย่าปิดหน้านี้</span></div>';document.body.appendChild(overlay);}
    overlay.querySelector('[data-submit-message]').textContent=message;
  }else overlay?.remove();
  const button=document.getElementById('endExamBtn');
  if(button){if(active&&!button.dataset.originalText)button.dataset.originalText=button.textContent;button.disabled=active;button.textContent=active?'⏳ กำลังส่งข้อสอบ...':(button.dataset.originalText||button.textContent);}
}
function forceTimeUp(){
  if(app.level!==null && document.getElementById('levelResultModal').classList.contains('hidden')){
    submitLevel();
  }
  finalizeExam(true);
}
async function finalizeExam(auto){
  if(finalSubmissionInProgress) return;
  finalSubmissionInProgress=true;
  setSubmissionBusy(true,auto?'กำลังบันทึกคำตอบอัตโนมัติ...':'กำลังส่งข้อสอบ...');
  app.examEnded = true;
  clearInterval(app.globalTimerHandle);
  try { await window.submitObjectAnalysisResult(); }
  catch (error) { alert(error.message); app.examEnded = false; finalSubmissionInProgress=false; setSubmissionBusy(false); saveDfdSession(); return; }
  clearDfdSession();
  fetch('/api/exam-drafts/object_analysis_design_dfd',{method:'DELETE',headers:{'x-student-token':app.studentToken}}).catch(()=>{});
  examScreen.classList.add('hidden');
  setSubmissionBusy(false);
  finalScreen.classList.remove('hidden');
  document.getElementById('redownloadBtn').style.display = 'none';
  document.getElementById('finalHeadline').textContent = auto ? 'หมดเวลาสอบ' : 'ส่งข้อสอบเรียบร้อยแล้ว';
  document.getElementById('finalSummaryText').textContent = auto
    ? 'ครบเวลา 60 นาทีแล้ว ระบบปิดการทำข้อสอบและสร้างไฟล์ PDF ให้อัตโนมัติ (ใช้คะแนนสูงสุดที่ทำได้ในแต่ละ Level)'
    : 'ระบบได้บันทึกคะแนนสูงสุดของทุก Level ที่ทำไว้ และสร้างไฟล์ PDF ให้ดาวน์โหลดเพื่อส่งอาจารย์';
  const list = document.getElementById('finalList');
  list.innerHTML = [0,1,2].map(lv => `<div class="final-row"><span>${LEVEL_TITLES[lv]}</span><b>${app.attempts[lv] ? 'ส่งแล้ว' : 'ยังไม่ได้ทำ'}</b></div>`).join('');
  try{
    window.__examDoc = await generateFinalPDF();
    document.getElementById('redownloadBtn').style.display = '';
  }catch(e){ console.error('PDF generation failed', e); }
}
document.getElementById('redownloadBtn').addEventListener('click', ()=>{
  if(window.__examDoc) window.__examDoc.save(`DFD_คำตอบ_${(app.studentName||'student').replace(/\s+/g,'_')}.pdf`);
  else alert('กำลังสร้างไฟล์ PDF กรุณาลองอีกครั้ง');
});
document.getElementById('restartAllBtn').addEventListener('click', ()=>{
  location.href='/?continue=1';
});

let submittedToBackend = false;
async function submitObjectAnalysisResult(){
  if(submittedToBackend) return;
  const levels = [0,1,2].map(level => {
    const attempt = app.attempts[level];
    return { level, score: attempt ? attempt.best.result.total : 0, shapes: attempt ? attempt.latest.shapes : [], connections: attempt ? attempt.latest.connections : [] };
  });
  const response = await fetch('/api/object-analysis-results', { method:'POST', headers:{'Content-Type':'application/json','x-student-token':app.studentToken}, body:JSON.stringify({ levels, tabSwitches: app.tabSwitches, fullscreenExitAttempts: app.fullscreenExitAttempts, reloadCount: app.reloadCount, integrityEvents: app.integrityEvents }) });
  if(!response.ok){ const body = await response.json().catch(()=>({})); throw new Error(body.message || 'ไม่สามารถบันทึกคำตอบได้'); }
  submittedToBackend = true;
}
window.startObjectAnalysisExam = async function(student){
  app.studentToken = sessionStorage.getItem('examStudentToken') || '';
  let access;
  try {
    const claim=await fetch('/api/exam-drafts/object_analysis_design_dfd/claim',{method:'POST',headers:{'Content-Type':'application/json','x-student-token':app.studentToken},body:JSON.stringify({deviceId:DFD_DEVICE_ID})});
    if(!claim.ok){const body=await claim.json().catch(()=>({}));throw new Error(body.message||'กำลังทำข้อสอบบนอุปกรณ์อื่น');}
    const response = await fetch('/api/object-analysis/access', { headers:{'x-student-token':app.studentToken} });
    const body = await response.json().catch(()=>({}));
    access = body;
    if(!response.ok) throw new Error(body.message || 'ไม่สามารถตรวจสอบสิทธิ์เข้าสอบได้');
  } catch(error) {
    if(document.fullscreenElement) document.exitFullscreen?.().catch(()=>{});
    alert(error.message || 'ไม่สามารถตรวจสอบสิทธิ์เข้าสอบได้ กรุณาลองใหม่อีกครั้ง');
    return false;
  }
  app.studentId = student.studentId; app.studentName = student.firstName + ' ' + student.lastName; app.classRoom = student.classRoom; app.serverExamEndTime = Date.parse(access.examEndTime);
  document.getElementById('startScreen').classList.add('hidden');
  QUESTIONS.coffee.title = 'การวิเคราะห์และออกแบบเชิงวัตถุ: Data Flow Diagram';
  QUESTIONS.coffee.tagline = 'Object Analysis & Design';
  app.questionKey = 'coffee'; requestDfdFullscreen(); beginCountdown();
  return true;
};
window.submitObjectAnalysisResult = submitObjectAnalysisResult;
window.requestDfdFullscreen = requestDfdFullscreen;

function attemptResumeDfdSession(){
  let saved;
  try { saved = JSON.parse(localStorage.getItem(DFD_SESSION_KEY) || 'null'); } catch(e) { return false; }
  if(!saved?.studentId || saved.questionKey!=='coffee') return false;
  const remaining = Math.max(0, Math.round((Number(saved.examEndTime || 0)-Date.now())/1000));
  if(!remaining){ clearDfdSession(); return false; }

  QUESTIONS.coffee.title = 'การวิเคราะห์และออกแบบเชิงวัตถุ: Data Flow Diagram';
  QUESTIONS.coffee.tagline = 'Object Analysis & Design';
  app.studentId=saved.studentId; app.studentName=saved.studentName||''; app.classRoom=saved.classRoom||''; app.studentToken=sessionStorage.getItem('examStudentToken')||'';
  app.questionKey='coffee'; app.attempts=saved.attempts||{0:null,1:null,2:null}; app.examEndTime=saved.examEndTime;
  app.timeLeft=remaining; app.tabSwitches=saved.tabSwitches||0; app.tabWarningAcknowledged=saved.tabWarningAcknowledged||0; app.fullscreenExitAttempts=saved.fullscreenExitAttempts||0; app.reloadCount=(saved.reloadCount||0)+1; app.examEnded=false;
  app.integrityEvents=Array.isArray(saved.integrityEvents)?saved.integrityEvents:[]; recordDfdIntegrityEvent('reload');
  [startScreen, selectScreen, nameScreen, countdownOverlay, document.getElementById('sharedLoginScreen'), document.getElementById('sharedPinSetupScreen'), document.getElementById('sharedPinVerifyScreen')].forEach(el=>el?.classList.add('hidden'));
  examScreen.classList.remove('hidden');
  document.getElementById('nameTag').textContent = '👤 ' + app.studentName;
  document.getElementById('hubQTitle').textContent = 'โจทย์: ' + currentQuestion().title;
  document.getElementById('hubQTagline').textContent = currentQuestion().tagline;
  document.getElementById('tabSwitchTag').textContent = 'สลับแท็บ: '+app.tabSwitches+' ครั้ง';
  if(app.tabSwitches>0) document.getElementById('tabSwitchTag').classList.add('badge-warn');
  updateDfdFullscreenTag();
  updateGlobalTimerDisplay();

  if(saved.level===0 || saved.level===1 || saved.level===2){
    enterLevel(saved.level);
    state = { shapes:[], connections:[], tool:'select', selectedId:null, history:[], future:[], zoom:1, panX:0, panY:0, hintsLeft:3, ...(saved.canvasState||{}) };
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn=>btn.classList.toggle('active', btn.dataset.tool===state.tool));
    applyZoom(); render();
  } else showHub();
  runDfdTimer();
  saveDfdSession();
  return true;
}
const resumedDfdSession=attemptResumeDfdSession();
if(resumedDfdSession) document.documentElement.classList.remove('restoring-session');
else if(app.studentToken){
  fetch('/api/student/session',{headers:{'x-student-token':app.studentToken}})
    .then(response=>response.ok?response.json():Promise.reject())
    .then(async result=>{
      const claim=await fetch('/api/exam-drafts/object_analysis_design_dfd/claim',{method:'POST',headers:{'Content-Type':'application/json','x-student-token':app.studentToken},body:JSON.stringify({deviceId:DFD_DEVICE_ID})}); if(!claim.ok) throw new Error('กำลังทำข้อสอบบนอุปกรณ์อื่น');
      const response=await fetch('/api/exam-drafts/object_analysis_design_dfd',{headers:{'x-student-token':app.studentToken}}); const data=response.ok?await response.json():{};
      if(data.draft?.examEndTime&&new Date(data.draft.examEndTime)>new Date()){
        localStorage.setItem(DFD_SESSION_KEY,JSON.stringify({...data.draft,studentId:result.student.studentId,studentName:result.student.firstName+' '+result.student.lastName,classRoom:result.student.classRoom,questionKey:'coffee'}));
        attemptResumeDfdSession(); document.documentElement.classList.remove('restoring-session'); return;
      }
      document.documentElement.classList.remove('restoring-session'); return window.startObjectAnalysisExam?.(result.student);
    })
    .catch(()=>{sessionStorage.removeItem('examStudentToken');document.documentElement.classList.remove('restoring-session');});
}else document.documentElement.classList.remove('restoring-session');

})();
