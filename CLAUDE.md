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
cp .env.example .env.local      # ואז להזין ANTHROPIC_API_KEY (וגם OPENAI_API_KEY אם צריך) בקובץ
npm run dev                     # מריץ על http://localhost:3000
```
בלי `ANTHROPIC_API_KEY` תקין ב-`.env.local`, הדשבורד יעלה אבל שיחות עם סוכנים יחזירו שגיאה ברורה (לא קריסה). `OPENAI_API_KEY` נדרש **רק** אם יש סוכן עם `provider: openai` בפרונטמאטר שלו (ברירת המחדל היא `anthropic`) — ראו "שני ספקי מודל" למטה.

## הרצה דרך Docker (פריסה לשרת)
```bash
cp .env.example .env             # להזין ANTHROPIC_API_KEY (וגם OPENAI_API_KEY אם צריך); אופציונלי: APP_PORT
docker compose up -d --build     # בונה ומריץ, זמין ב-http://<host>:3000 (או APP_PORT)
```
`context/` ו-`outputs/` מחוברים כ-volumes (ראו `docker-compose.yml`) כדי שתיק העסק, יומן הזיכרון והתוצרים שנכתבים בזמן ריצה ישרדו ריסטארט/עדכון של הקונטיינר. **אין שכבת הרשאה באפליקציה עצמה** — אם חושפים אותה על IP:PORT ציבורי, יש לחסום גישה ברמת הפיירוול למי שצריך גישה בפועל.

## מפת תיקיות
```
context/                # הזיכרון — תיק עסק (סטטי) + יומן דינאמי (append-only)
skills/                 # 39 קבצי סוכן: onboarding, quality_assurance, leads/*, marketing/*, branding/*
outputs/                # תוצרים שנשמרים מהדשבורד (קמפיינים / נכסי מיתוג)
lib/agents/             # registry.ts (parsing+validation), router.ts (ניתוב היררכי + דיספאץ' לפי provider), types.ts
lib/anthropic/          # קליינט Anthropic API
lib/openai/             # קליינט OpenAI API (Responses API) — משמש סוכנים עם provider: openai
lib/omniroute/          # קליינט OmniRoute (Chat Completions API) — משמש סוכנים עם provider: omniroute
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
provider: anthropic     # anthropic (ברירת מחדל) | openai | omniroute — קובע איזה API/SDK ישמש לסוכן הזה
model: claude-sonnet-5   # מזהה המודל אצל אותו provider; ניתן לדריסה לכל סוכן
```

**בחירת מודל לפי תפקיד**: ברירת המחדל היא `claude-sonnet-5` (כתיבה יצירתית/תוכן — רוב 35 הסוכנים). שני מנהלי הצוות (גיא, ריי) על `claude-haiku-4-5-20251001` — תפקידם הוא רק החלטת ניתוב מובנית (tool-use), אז מודל מהיר וזול מספיק ומשפר את זמן התגובה בתחילת כל שיחה. ערן (QA גלובלי) ותומר (עקביות מיתוגית) על `claude-opus-5` — תפקידם ביקורתי/השוואתי ולא בציר החם, אז שווה את זמן/עלות המודל החזק יותר לטובת דיוק הבדיקה.

## שלושה ספקי מודל (Anthropic + OpenAI + OmniRoute)
כל סוכן בוחר ספק דרך שדה `provider` בפרונטמאטר (`anthropic` בברירת מחדל, `openai`, או `omniroute`). `lib/agents/router.ts` מנתב כל קריאה — גם ניתוב ההיררכיה (`routeToAgent`) וגם תשובת המומחה בסטרימינג (`streamAgentReply`) — לפי `provider` של הסוכן הרלוונטי:
- `provider: anthropic` (ברירת מחדל) → `lib/anthropic/client.ts`, Messages API, `model` הוא מזהה Claude (למשל `claude-sonnet-5`).
- `provider: openai` → `lib/openai/client.ts`, Responses API (`client.responses.create`), `model` הוא מזהה OpenAI (למשל `gpt-5.1`, `gpt-5.6-terra`).
- `provider: omniroute` → `lib/omniroute/client.ts`, Chat Completions API (`client.chat.completions.create` — לא Responses API; זה ה-endpoint היחיד שמאומת כנתמך אצל OmniRoute), `model` הוא `"auto"` (ברירת מחדל, ניתוב אוטומטי של OmniRoute עצמו) או מזהה קומבו ספציפי שהוגדר בדשבורד של OmniRoute.

**כדי "לפרוס מחדש" סוכן על ספק אחר**: לשנות בקובץ ה-`skills/*.md` שלו את `provider` ואת `model` יחד למזהה המתאים לספק החדש — אין ברירת מחדל בין ספקים למודל. אין צורך בשינוי קוד נוסף.

**מפתחות/הגדרות**: `ANTHROPIC_API_KEY` נדרש תמיד (גם מנהלי הצוות דורשים אותו כברירת מחדל). `OPENAI_API_KEY` נדרש רק אם סוכן בפועל (או מנהל צוות) עם `provider: openai` מעורב בבקשה. `OMNIROUTE_BASE_URL` (ו-`OMNIROUTE_API_KEY` אופציונלי) נדרש רק אם סוכן עם `provider: omniroute` מעורב — כולם ב-`.env.local` (dev) או `.env` (Docker), ראו `.env.example`. `app/api/chat/route.ts` בודק מראש (לפני פתיחת ה-stream) אילו ספקים ה-request הזה עלול להגיע אליהם ומחזיר שגיאת JSON ברורה אם ההגדרה הרלוונטית חסרה.

### OmniRoute — שער ריבוי-ספקים חינמי (self-hosted)
[OmniRoute](https://github.com/diegosouzapw/OmniRoute) הוא שער MIT/open-source, ללא עלות מעבר לעלויות ה-API הישירות של הספקים שמאחוריו (340+ ספקים, כולל שכבה חינמית אצל חלקם) — מתארח עצמאית דרך `docker-compose.yml` (שירות `omniroute`, אימג' `diegosouzapw/omniroute:latest`, פורט `20128`, קבוע ל-volume `omniroute-data`).

**סדר עדיפות המודלים (fallback chain) לא מוגדר בקוד של המערכת הזו** — הוא מוגדר ב-**Dashboard** של OmniRoute עצמו (`http://localhost:20128` אחרי שהשירות רץ), דרך "Combo" עם אסטרטגיית `priority`: רשימה מסודרת של מודלים ש-OmniRoute מנסה אחד אחרי השני. ה-`model` בפרונטמאטר של הסוכן אז מצביע על שם ה-Combo שהוגדר שם.

**סטטוס נוכחי**: השירות טרם הוקם/הופעל בפועל. כשתרצו להתחיל להגדיר את סדר המודלים בפועל (איזה Combo, איזה סדר עדיפות) — זו החלטה שממתינה לכם, לא הוחלטה מראש.

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
