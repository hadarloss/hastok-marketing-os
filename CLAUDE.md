@AGENTS.md

# 🚀 AI Team Workspace — CLAUDE.md

מסמך זה הוא נקודת הכניסה למי (או מה) שעובד על הריפו הזה — בין אם זה Claude Code/Codex ישירות מהטרמינל, ובין אם זה מפתח/ת אנושי/ת. הוא מסביר את המבנה, איך הניתוב עובד, ואילו החלטות סטו מהספק המקורי.

## מה זה הפרויקט
"AI Team Workspace" עבור עסק דובר עברית: 37 סוכני AI מתמחים (17 שיווק + 18 מיתוג + 2 גלובליים), מנוהלים תחת שני מנהלי צוות (גיא לשיווק, ריי למיתוג), עם זיכרון עסקי משותף ודינאמי. יש שני אופנים לעבוד מול המערכת:
1. **ישירות מה-CLI** — פותחים סוכן ספציפי (קובץ md תחת `skills/`) כפרסונת מערכת ועובדים איתו בטרמינל.
2. **דרך הדשבורד** — `npm run dev` ואז `http://localhost:3000`, אפליקציית Next.js שמפעילה את אותם קבצי סוכן בפועל מול Claude API, עם ניתוב היררכי, סטרימינג, וממשק גרפי מלא בעברית (RTL).

## Quickstart
```bash
npm install                     # פעם ראשונה בלבד
cp .env.example .env.local      # ואז להזין ANTHROPIC_API_KEY אמיתי בקובץ
npm run dev                     # מריץ על http://localhost:3000
```
בלי `ANTHROPIC_API_KEY` תקין ב-`.env.local`, הדשבורד יעלה אבל שיחות עם סוכנים יחזירו שגיאה ברורה (לא קריסה).

## הרצה דרך Docker (פריסה לשרת)
```bash
cp .env.example .env             # להזין ANTHROPIC_API_KEY, APP_USERNAME, APP_PASSWORD אמיתיים
docker compose up -d --build     # בונה ומריץ app + caddy
```
`context/` ו-`outputs/` מחוברים כ-volumes (ראו `docker-compose.yml`) כדי שתיק העסק, יומן הזיכרון והתוצרים שנכתבים בזמן ריצה ישרדו ריסטארט/עדכון של הקונטיינר.

**הרשאה**: [proxy.ts](proxy.ts) שומר על כל האתר (כולל ה-API) לפי `APP_USERNAME`/`APP_PASSWORD` ב-`.env`, דרך עמוד התחברות משלנו (`/login`) ועוגיית session חתומה — **לא** HTTP Basic Auth הדפדפני, כי הפרומפט הנייטיבי שלו לא עובד באופן עקבי בדפדפנים/webviews בנייד. אם `APP_USERNAME`/`APP_PASSWORD` ריקים, השער מדלג על עצמו (כדי לא לנעול פיתוח מקומי בלי `.env`). כניסה: `/login`. יציאה: כפתור "יציאה" בתחתית הסיידבר (קורא ל-`POST /api/auth/logout`). עוגיית ה-session חתומה כנגד `APP_PASSWORD` ([lib/auth/session.ts](lib/auth/session.ts)) — שינוי הסיסמה מנתק אוטומטית את כל מי שכבר מחובר.

**HTTPS**: `docker-compose.yml` כולל שירות `caddy` (reverse proxy) שמנפיק ומחדש תעודת HTTPS אמיתית אוטומטית דרך Let's Encrypt — קונטיינר ה-`app` עצמו כבר לא חשוף ישירות לאינטרנט (`expose` בלבד, לא `ports`), רק Caddy על 80/443. הדומיין מוגדר ב-[Caddyfile](Caddyfile); כרגע זה `139-59-145-176.sslip.io` (שירות DNS חינמי שממפה כל כתובת IP לשם דומיין תואם — `<ip-עם-מקפים>.sslip.io`), כי אין עדיין דומיין אמיתי. **כשיהיה דומיין אמיתי**: להחליף את השורה הראשונה ב-`Caddyfile` לשם הדומיין (ולוודא שה-DNS שלו מצביע ל-IP של השרת), ואז `docker compose up -d` — Caddy יטפל בתעודה החדשה לבד.

## מפת תיקיות
```
context/                # הזיכרון — תיק עסק (סטטי) + יומן דינאמי (append-only)
skills/                 # 39 קבצי סוכן: onboarding, quality_assurance, leads/*, marketing/*, branding/*
outputs/                # תוצרים שנשמרים מהדשבורד (קמפיינים / נכסי מיתוג)
lib/agents/             # registry.ts (parsing+validation), router.ts (ניתוב היררכי), types.ts
lib/anthropic/          # קליינט ה-API
lib/fs/                 # קריאה/כתיבה ל-context/ ו-outputs/
app/                    # עמודי הדשבורד + app/api/* (route handlers)
components/              # רכיבי UI (chat, layout, shadcn primitives)
```

## איך הניתוב ההיררכי עובד
1. משתמש בוחר צוות (שיווק/מיתוג) ומקליד הודעה — פונה קודם למנהל הצוות (גיא/ריי).
2. המנהל, דרך Anthropic tool-use (`route_to_agent`), בוחר את המומחה המתאים מתוך רשימת הסוכנים בצוותו (הרשימה נבנית דינאמית מ-`lib/agents/registry.ts`, לא מקודדת בפרומפט של המנהל עצמו).
3. ה-UI מציג breadcrumb ניתוב (את/ה → מנהל → מומחה), ואז זורם המענה בפועל מפרסונת המומחה שנבחר.
4. המשך שיחה עם אותו מומחה לא מנתב מחדש — רק נושא חדש/החלפת סוכן מפעילים ניתוב נוסף.
5. אפשר גם לדלג על המנהל ולדבר ישירות עם מומחה ספציפי מהסיידבר.
6. ערן (`quality_assurance.md`) אינו בציר האוטומטי — הוא סוכן נגיש ישירות לבדיקת איכות של טיוטה מוכנה, משני הצוותים.

## סכמת Frontmatter של סוכן (כל קובץ תחת skills/)
```yaml
id: agent_id            # ייחודי, תואם שם הקובץ
name: "שם בעברית"
role: "תיאור תפקיד קצר"
team: marketing | branding | core
reports_to: agent_id_of_lead | null
kind: lead | specialist | core
icon: "אימוג'י"
description: "תיאור קצר לכרטיס בחירה ולפרומפט הניתוב של המנהל"
output_types: [type1, type2]
order: number
model: claude-sonnet-5   # ניתן לדריסה לכל סוכן
```

**בחירת מודל לפי תפקיד**: ברירת המחדל היא `claude-sonnet-5` (כתיבה יצירתית/תוכן — רוב 35 הסוכנים). שני מנהלי הצוות (גיא, ריי) על `claude-haiku-4-5-20251001` — תפקידם הוא רק החלטת ניתוב מובנית (tool-use), אז מודל מהיר וזול מספיק ומשפר את זמן התגובה בתחילת כל שיחה. ערן (QA גלובלי) ותומר (עקביות מיתוגית) על `claude-opus-5` — תפקידם ביקורתי/השוואתי ולא בציר החם, אז שווה את זמן/עלות המודל החזק יותר לטובת דיוק הבדיקה.

## תיקוני ספק שבוצעו (Known spec deviations)
מסמך ה-`PROJECT_SPEC.md` המקורי הכיל שתי אי-התאמות; שתיהן טופלו וקבועות מכאן ואילך:

1. **שיווק — 16 קבצים מול "17 סוכני שיווק" בטקסט.** נוסף סוכן שבע-עשרה: `skills/marketing/eden_marketing_analytics.md` (עדן — אנליטיקס ודוחות ביצועים), שממלא פער שלא היה מכוסה (מדידת ביצועים לעומת מחקר שוק/תחרות של אסף).
2. **התנגשות שם: `eran_consistency.md` (מיתוג) מול `quality_assurance.md` (ערן, QA גלובלי).** סוכן העקביות המיתוגית שונה ל-`skills/branding/tomer_consistency.md` (תומר). "ערן" נשאר שם ה-QA הגלובלי היחיד במערכת, כדי למנוע בלבול בממשק ובניתוב.

**אם מוסיפים סוכן חדש**: יש לוודא `id` ייחודי, `reports_to` תקין (מנהל צוות קיים או `null`), ושם עברי שלא מתנגש עם סוכן קיים.

## פרוטוקול Handoff (ניתוב בפועל)
כשמנהל צוות מנתב בקשה, נוצרת רשומה (לא קובץ md — אובייקט runtime שנשמר ליד פלט אם נשמר תוצר):
```yaml
task_id, from_agent, to_agent, status(queued|in_progress|done|blocked|revised),
deliverable_type, output_path, requested_by, created_at, updated_at, notes
```

## יומן זיכרון דינאמי
`context/MEMORY_LOG.md` הוא append-only. כל סוכן (או המשתמש דרך מסך "זיכרון" בדשבורד) יכול להוסיף רשומה מסוג `correction` / `new_rule` / `preference` / `note`. סוכנים קוראים אותו לפני מענה כדי להתאים את עצמם להעדפות שנצברו.
