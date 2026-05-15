# **WEB LOVE — MASTER PRODUCT & SYSTEM BLUEPRINT**

Tài liệu tổng hợp chuyên sâu cho:

* Startup planning  
* Software architecture  
* Product strategy  
* PRD  
* SRS  
* UI/UX  
* AI architecture  
* Gamification system  
* SaaS business model  
* Emotional retention design

Dựa trên:

* Bộ UI 12 màn hình  
* Tài liệu chức năng Web Love.docx  
* Emotional product analysis

---

# **PHẦN 1 — PRODUCT VISION**

# **1.1 Product Vision**

## **Tầm nhìn**

Web Love không chỉ là một ứng dụng couple.

Đây là:

“Operating System for Modern Relationships”

Một không gian số riêng tư giúp:

* lưu giữ ký ức  
* nuôi dưỡng cảm xúc  
* tăng kết nối  
* giảm xung đột  
* xây dựng hành trình tình yêu lâu dài

---

# **1.2 Product Core**

## **3 trụ cột sản phẩm**

| Trụ cột | Ý nghĩa |
| ----- | ----- |
| Memory | lưu giữ ký ức |
| Emotion | chăm sóc cảm xúc |
| Bonding | tăng tương tác |

---

# **1.3 Target Users**

## **Primary Users**

* Couple Gen Z  
* tuổi 18–30  
* yêu xa  
* thích aesthetic  
* dùng TikTok/Instagram nhiều  
* thích emotional products

## **Secondary Users**

* newly married couples  
* long-distance relationships  
* anniversary-focused couples

---

# **PHẦN 2 — SYSTEM ARCHITECTURE CHUYÊN SÂU**

# **2.1 High Level Architecture**

## **Frontend Layer**

### **Web Client**

Tech:

* Next.js  
* TypeScript  
* TailwindCSS  
* Framer Motion  
* Zustand  
* React Query

### **Mobile-first Strategy**

* Responsive-first  
* PWA support  
* Future React Native app

---

## **API Gateway**

Responsibilities:

* Authentication  
* Rate limiting  
* API routing  
* JWT validation  
* Request logging

Tech:

* NestJS Gateway  
* NGINX

---

## **Backend Services**

### **Auth Service**

* login  
* signup  
* pair code  
* OAuth

### **Couple Service**

* couple profile  
* shared state  
* relationship metadata

### **Timeline Service**

* memories  
* media  
* comments  
* reactions

### **Mood Service**

* mood tracking  
* emotional analytics  
* relationship health

### **AI Insight Service**

* pattern analysis  
* emotional recommendation  
* recap generation

### **Notification Service**

* push notifications  
* reminders  
* anniversary alerts

### **Mission Service**

* XP  
* badges  
* rewards  
* penalties

### **Realtime Service**

Socket.IO:

* game sync  
* typing  
* reactions  
* realtime interactions

---

## **Database Layer**

### **PostgreSQL**

Structured relational data.

### **Redis**

* cache  
* sessions  
* websocket state  
* matchmaking  
* game timers

### **Object Storage**

* AWS S3  
* Cloudinary

---

## **AI Layer**

### **AI Stack**

* OpenAI GPT  
* Embedding DB  
* Sentiment Analysis  
* Recommendation Engine

---

# **2.2 Event-Driven Architecture**

## **Event Examples**

### **MoodSubmitted**

Triggers:

* AI analysis  
* couple health update  
* recommendation generation

### **TimelineCreated**

Triggers:

* stats update  
* anniversary reminder setup

### **CapsuleOpened**

Triggers:

* emotional animation  
* push notification  
* memory unlock event

---

# **2.3 Scalability Strategy**

## **Horizontal scaling**

* stateless backend  
* websocket clustering  
* CDN media delivery

## **Future scale concerns**

* media-heavy platform  
* AI token cost  
* realtime sync load

---

# **PHẦN 3 — ERD DATABASE ĐẦY ĐỦ**

# **3.1 Core Entities**

## **users**

| field | type |
| ----- | ----- |
| id | uuid |
| email | varchar |
| password\_hash | varchar |
| display\_name | varchar |
| avatar\_url | text |
| created\_at | timestamp |

---

## **couples**

| field | type |
| ----- | ----- |
| id | uuid |
| couple\_name | varchar |
| anniversary\_date | date |
| theme\_config | json |
| created\_at | timestamp |

---

## **couple\_members**

| field | type |
| ----- | ----- |
| id | uuid |
| couple\_id | uuid |
| user\_id | uuid |
| role | enum |

---

## **timeline\_events**

| field | type |
| ----- | ----- |
| id | uuid |
| couple\_id | uuid |
| title | varchar |
| description | text |
| event\_date | timestamp |
| location | varchar |
| created\_by | uuid |
| created\_at | timestamp |

---

## **timeline\_media**

| field | type |
| ----- | ----- |
| id | uuid |
| event\_id | uuid |
| media\_url | text |
| media\_type | enum |

---

## **comments**

| field | type |
| ----- | ----- |
| id | uuid |
| event\_id | uuid |
| user\_id | uuid |
| content | text |

---

## **reactions**

| field | type |
| ----- | ----- |
| id | uuid |
| user\_id | uuid |
| target\_type | enum |
| target\_id | uuid |
| reaction\_type | enum |

---

## **moods**

| field | type |
| ----- | ----- |
| id | uuid |
| user\_id | uuid |
| couple\_id | uuid |
| mood\_type | enum |
| mood\_score | int |
| note | text |
| created\_at | timestamp |

---

## **memory\_capsules**

| field | type |
| ----- | ----- |
| id | uuid |
| couple\_id | uuid |
| sender\_id | uuid |
| content | text |
| open\_at | timestamp |
| is\_opened | boolean |

---

## **missions**

| field | type |
| ----- | ----- |
| id | uuid |
| title | varchar |
| description | text |
| xp\_reward | int |
| penalty | text |

---

## **mission\_progress**

| field | type |
| ----- | ----- |
| id | uuid |
| mission\_id | uuid |
| couple\_id | uuid |
| progress | int |
| completed | boolean |

---

## **badges**

| field | type |
| ----- | ----- |
| id | uuid |
| name | varchar |
| description | text |
| icon | text |

---

## **blogs**

| field | type |
| ----- | ----- |
| id | uuid |
| user\_id | uuid |
| visibility | enum |
| title | varchar |
| content | text |
| voice\_url | text |

---

## **wishlist\_items**

| field | type |
| ----- | ----- |
| id | uuid |
| user\_id | uuid |
| product\_name | varchar |
| price | decimal |
| image\_url | text |
| product\_link | text |

---

## **game\_sessions**

| field | type |
| ----- | ----- |
| id | uuid |
| couple\_id | uuid |
| winner\_id | uuid |
| started\_at | timestamp |

---

# **PHẦN 4 — API DESIGN**

# **4.1 Auth APIs**

## **POST /auth/signup**

Create account.

## **POST /auth/login**

Return JWT.

## **POST /auth/pair**

Connect couple accounts.

---

# **4.2 Timeline APIs**

## **GET /timeline**

Get all timeline events.

## **POST /timeline**

Create event.

## **GET /timeline/:id**

Get event detail.

## **POST /timeline/:id/comment**

Add comment.

---

# **4.3 Mood APIs**

## **POST /moods**

Submit mood.

## **GET /moods/history**

Mood history.

## **GET /relationship-health**

Aggregated emotional state.

---

# **4.4 Capsule APIs**

## **POST /capsules**

Create capsule.

## **GET /capsules**

List capsules.

## **POST /capsules/:id/open**

Open capsule.

---

# **4.5 Mission APIs**

## **GET /missions/daily**

Daily missions.

## **POST /missions/:id/complete**

Complete mission.

---

# **4.6 AI APIs**

## **GET /ai/insights**

Get AI insights.

## **GET /ai/monthly-recap**

Monthly emotional recap.

---

# **PHẦN 5 — ROLE & PERMISSION SYSTEM**

# **5.1 Roles**

## **User**

Permissions:

* create memories  
* submit moods  
* write blogs  
* play games

## **Couple Shared Context**

Shared access:

* timeline  
* stats  
* couple space

## **Admin**

* moderation  
* analytics  
* abuse detection

---

# **5.2 Privacy Levels**

## **Public**

Visible to all.

## **Couple-only**

Visible only to partner.

## **Private**

Visible only to owner.

---

# **PHẦN 6 — USER FLOW TOÀN HỆ THỐNG**

# **6.1 Onboarding Flow**

1. Signup  
2. Choose aesthetic theme  
3. Invite partner  
4. Pair account  
5. Add anniversary date  
6. Create first memory  
7. Daily mood onboarding  
8. Unlock dashboard

---

# **6.2 Daily Usage Flow**

1. Open app  
2. See dashboard  
3. Submit mood  
4. Check memories  
5. Complete mission  
6. Read AI insight  
7. Interact with partner

---

# **6.3 Emotional Loop**

Trigger → Interaction → Emotion → Reward → Attachment

Example:

* anniversary reminder  
* timeline revisit  
* nostalgia  
* emotional reward  
* stronger retention

---

# **PHẦN 7 — INFORMATION ARCHITECTURE**

# **7.1 Main Navigation**

## **Home**

* dashboard  
* stats  
* reminders

## **Timeline**

* memories  
* events  
* on this day

## **Love Hub**

* capsule  
* missions  
* games

## **Gifts**

* wishlist  
* suggestions

## **Profile**

* settings  
* customization  
* privacy

---

# **PHẦN 8 — FEATURE PRIORITY ROADMAP**

# **Phase 1 — MVP**

Critical:

* auth  
* pair system  
* timeline  
* stats  
* mood tracking  
* notifications

---

# **Phase 2**

* memory capsule  
* missions  
* wishlist  
* blogs

---

# **Phase 3**

* AI insight  
* realtime game  
* AI recap  
* advanced personalization

---

# **Phase 4**

* couple pet  
* AI love coach  
* spotify integration  
* auto video generation

---

# **PHẦN 9 — PRD CHUẨN STARTUP**

# **9.1 Product Goals**

## **Business Goals**

* emotional retention  
* high DAU  
* couple habit formation  
* premium conversion

## **User Goals**

* feel emotionally connected  
* preserve memories  
* reduce relationship distance

---

# **9.2 Success Metrics**

## **KPI**

* DAU/MAU  
* streak retention  
* memory creation rate  
* daily mood submissions  
* capsule open rate  
* premium conversion

---

# **9.3 North Star Metric**

Weekly Shared Emotional Interactions

Bao gồm:

* mood updates  
* memories  
* reactions  
* missions  
* games

---

# **PHẦN 10 — SRS CHUẨN ĐỒ ÁN**

# **10.1 Functional Requirements**

## **FR-01 Authentication**

System shall allow users to create accounts.

## **FR-02 Pairing**

System shall allow two users to create a couple space.

## **FR-03 Timeline**

System shall allow users to create timeline memories.

## **FR-04 Mood Tracking**

System shall store daily emotional states.

## **FR-05 AI Insight**

System shall analyze emotional patterns.

---

# **10.2 Non-functional Requirements**

## **Performance**

* API response \< 300ms

## **Security**

* JWT authentication  
* encrypted media

## **Scalability**

* horizontal scaling

## **Availability**

* uptime 99.9%

---

# **PHẦN 11 — UI/UX CRITIQUE TỪNG MÀN HÌNH**

# **11.1 Love Health Screen**

## **Điểm mạnh**

* emotional tone rất tốt  
* spacing đẹp  
* support language nhẹ nhàng

## **Cải thiện**

* thêm animation mood pulse  
* thêm trend chart mini  
* thêm journal quick input

---

# **11.2 Relationship Stats**

## **Điểm mạnh**

* visual hierarchy tốt  
* emotional center rõ

## **Cải thiện**

* thêm animated counter  
* monthly recap preview  
* deeper analytics

---

# **11.3 Memory Capsule**

## **Điểm mạnh**

* strongest emotional feature

## **Cải thiện**

* cinematic opening  
* background music  
* AI nostalgia narration

---

# **11.4 Timeline**

## **Điểm mạnh**

* scrapbook feeling

## **Cải thiện**

* timeline filters  
* map memories  
* drag interactions

---

# **11.5 Home Dashboard**

## **Điểm mạnh**

* clean emotional dashboard

## **Cải thiện**

* dynamic weather theme  
* contextual greetings  
* AI summary widget

---

# **11.6 Settings**

## **Điểm mạnh**

* simple structure

## **Cải thiện**

* couple personalization studio  
* theme preview live

---

# **11.7 AI Insight**

## **Điểm mạnh**

* mascot reduces AI coldness

## **Cải thiện**

* conversational AI coach  
* timeline-based insights  
* emotional forecast

---

# **11.8 Date Ideas**

## **Điểm mạnh**

* contextual recommendation

## **Cải thiện**

* live maps  
* save favorite dates  
* date wheel randomizer

---

# **11.9 Mini Game**

## **Điểm mạnh**

* bonding interaction mạnh

## **Cải thiện**

* more game modes  
* realtime reactions  
* voice chat integration

---

# **11.10 Blog**

## **Điểm mạnh**

* emotional journaling

## **Cải thiện**

* AI mood tags  
* voice transcription  
* background ambience

---

# **11.11 Wishlist**

## **Điểm mạnh**

* ecommerce-ready

## **Cải thiện**

* AI gift suggestion  
* auto anniversary bundles

---

# **11.12 Mission System**

## **Điểm mạnh**

* strong retention feature

## **Cải thiện**

* seasonal events  
* shared level animation  
* cooperative missions

---

# **PHẦN 12 — DESIGN SYSTEM ĐẦY ĐỦ**

# **12.1 Color Palette**

## **Primary**

* Pink Pastel  
* Lavender  
* Cream White

## **Accent**

* Soft Red  
* Rose Pink

---

# **12.2 Typography**

## **Fonts**

* Poppins  
* Inter

## **Heading**

* bold rounded

## **Body**

* medium soft

---

# **12.3 Components**

## **Buttons**

* rounded-full  
* gradient  
* soft shadow

## **Cards**

* glassmorphism  
* blur  
* pastel border

## **Inputs**

* soft border  
* floating label

---

# **12.4 Motion System**

## **Interaction Motion**

| Action | Motion |
| ----- | ----- |
| Tap | scale down |
| Open modal | fade \+ spring |
| Success | glow pulse |
| Memory open | cinematic zoom |

---

# **PHẦN 13 — AI ARCHITECTURE CHO LOVE INSIGHT**

# **13.1 AI Inputs**

* mood history  
* interaction frequency  
* mission completion  
* timeline activity  
* message patterns  
* date activity

---

# **13.2 AI Pipeline**

## **Step 1**

Collect behavioral data.

## **Step 2**

Sentiment analysis.

## **Step 3**

Pattern detection.

## **Step 4**

Insight generation.

## **Step 5**

Recommendation generation.

---

# **13.3 AI Features**

## **Monthly Recap**

AI creates:

* emotional summary  
* highlights  
* relationship trends

## **Love Coach**

AI suggests:

* communication timing  
* date ideas  
* emotional support

---

# **PHẦN 14 — REALTIME ARCHITECTURE CHO MINI GAME**

# **14.1 Realtime Stack**

* Socket.IO  
* Redis pub/sub  
* WebRTC optional

---

# **14.2 Game Sync Flow**

1. create room  
2. join room  
3. sync timer  
4. sync drawing data  
5. validate answer  
6. update score

---

# **14.3 Drawing Engine**

Canvas events:

* stroke  
* color  
* erase  
* clear

Broadcast realtime.

---

# **PHẦN 15 — SAAS / BUSINESS MODEL**

# **15.1 Freemium Model**

## **Free Tier**

* timeline  
* moods  
* basic missions  
* limited capsules

## **Premium**

* unlimited storage  
* AI insights advanced  
* AI recap videos  
* premium themes  
* advanced analytics

---

# **15.2 Monetization**

## **Subscription**

Monthly premium.

## **Couple Themes**

Sell aesthetic packs.

## **Gift Affiliate**

Commission from gift partners.

## **AI Video Memories**

Premium export.

---

# **PHẦN 16 — COMPETITIVE ANALYSIS**

# **16.1 Compared Apps**

| App | Weakness |
| ----- | ----- |
| Between | thiếu AI emotional layer |
| Agapé | UX chưa immersive |
| Paired | thiên psychology |
| Notion | không emotional |
| Messenger | không memory-focused |

---

# **16.2 Web Love Advantage**

## **Strong emotional design**

## **AI emotional insights**

## **Memory-first experience**

## **Gamified bonding**

## **Beautiful aesthetic identity**

---

# **PHẦN 17 — RETENTION LOOP & GAMIFICATION LOOP**

# **17.1 Retention Loop**

Trigger → Interaction → Emotion → Reward → Return

Example:

* anniversary reminder  
* open timeline  
* nostalgia  
* emotional reward  
* revisit app

---

# **17.2 Gamification Loop**

Mission → XP → Badge → Unlock → Motivation

---

# **17.3 Emotional Loop**

Memory → Reflection → Attachment → More Memories

Đây là loop mạnh nhất.

---

# **PHẦN 18 — ONBOARDING FLOW CHO EMOTIONAL APP**

# **18.1 Goal**

Onboarding phải tạo:

* intimacy  
* excitement  
* personalization  
* emotional attachment

---

# **18.2 Flow**

## **Step 1**

Choose relationship aesthetic.

## **Step 2**

Enter anniversary date.

## **Step 3**

Invite partner.

## **Step 4**

Choose nickname.

## **Step 5**

Create first memory.

## **Step 6**

Write first capsule.

## **Step 7**

Complete first mission.

---

# **18.3 Emotional Design**

During onboarding:

* soft animations  
* personalized greetings  
* floating hearts  
* emotional wording

Example:

“Hãy bắt đầu lưu giữ những ngày đẹp nhất của tụi mình 💕”

---

# **PHẦN 19 — FUTURE EXPANSION**

# **Future Features**

* Couple pet  
* Shared room  
* Spotify integration  
* AI-generated love story  
* Couple map  
* Auto anniversary movie  
* Shared bucket list  
* Smart conflict assistant

---

# **PHẦN 20 — KẾT LUẬN**

Web Love có tiềm năng trở thành:

* emotional super app cho couples  
* memory ecosystem  
* AI relationship companion

Điểm mạnh lớn nhất:

* emotional UX rất đúng  
* aesthetic identity rõ  
* retention dựa trên ký ức thật  
* gamification nhẹ nhàng  
* AI có chiều sâu cảm xúc

Nếu build đúng hướng, Web Love có thể trở thành:

“Spotify Wrapped \+ Notion \+ AI Companion \+ Couple Diary trong một hệ sinh thái tình yêu.”

