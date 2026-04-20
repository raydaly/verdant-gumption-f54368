# Greatuncle Import Guide

This guide covers every way to bring contacts into Greatuncle, from the simplest link-click to advanced AI-assisted conversion.

---

## Option 1: Accept an Invitation Link (Easiest)

Someone who cares about you sends a message like this:

```
I'm using Greatuncle to stay connected. Click the link below, or copy this whole 
message and paste it into the app if the link is broken.

--- START GREATUNCLE LINK ---
https://greatuncle.app/#invite=zABC123...
--- END GREATUNCLE LINK ---
```

**If the link works**: Just click it. The app opens and imports automatically.

**If the link was cut off** (common in SMS or WhatsApp): 
1. Copy the entire message — from `--- START GREATUNCLE LINK ---` to `--- END GREATUNCLE LINK ---`.
2. Open Greatuncle and go to the **Backup** tab.
3. Paste the copied text into the large text box.
4. The app will find and extract the data automatically.

---

## Option 2: Restore from a Backup File

If you previously saved a Greatuncle `.json` backup file:

1. Go to the **Backup** tab.
2. If you have an existing circle, tap **"Choose Seedling file to import"**.
3. Select your `.json` file.

**Alternatively**, open the file in any text editor, select all, copy, and paste it into the text box on the Backup tab. The app will recognize it as a full backup and offer you a **Merge** or **Overwrite** choice.

---

## Option 3: Paste a Backup as Text (Mobile-Friendly)

If you stored your backup as text in Apple Notes, Google Keep, or Notion:

1. Open your backup note and copy all the text.
2. Open Greatuncle → **Backup** tab.
3. Paste into the text box.

The Universal Doorway accepts the raw JSON even if it's surrounded by other text, as long as the JSON structure is intact.

---

## Option 4: AI-Assisted Conversion (Advanced)

If your contacts are in a format Greatuncle doesn't natively understand — a **CSV export from Google Contacts**, an **Apple vCard**, a **spreadsheet**, or even a **handwritten list** — you can use an AI assistant to convert them.

**Smart Detection**: If you paste a CSV or VCard into the Greatuncle text box, the app will automatically recognize it and provide a copy-ready AI prompt to help you convert it.

> [!WARNING]
> **Privacy Notice**: This method sends your contact data to a third-party AI service (ChatGPT, Claude, Gemini, etc.). Only use this with data you are comfortable sharing outside your device. Never use this for sensitive medical, financial, or private data.

### Step 1: Choose your AI assistant
Any of these work well:
- [ChatGPT](https://chat.openai.com) (OpenAI)
- [Claude](https://claude.ai) (Anthropic)
- [Gemini](https://gemini.google.com) (Google)

### Step 2: Copy this prompt

```
I have a list of contacts I want to import into an app called Greatuncle.
Please convert them into a valid JSON array using only these fields:

  n   = Full name (required)
  ph  = Phone number (optional, keep formatting as-is)
  em  = Email address (optional)
  ad  = Street address (optional, single line: "123 Main St, Springfield, IL")
  zp  = ZIP / postal code (optional)
  bd  = Birthday in YYYY-MM-DD format (optional, omit if unknown)
  av  = Anniversary in YYYY-MM-DD format (optional, omit if unknown)

Rules:
- Output a JSON array and NOTHING ELSE. No explanation, no markdown, no code fences.
- Omit any key whose value is empty or unknown.
- If a name has separate First/Last columns, combine them into a single "n" field.
- If a birthday has no year, use 1900 as a placeholder year (e.g., 1900-07-04).
- Do not include any fields not listed above.

Here is my contact data:
[PASTE YOUR CSV, VCARD, OR LIST HERE]
```

### Step 3: Paste the AI's output into Greatuncle
1. Copy the entire JSON array the AI produces.
2. Open Greatuncle → **Backup** tab.
3. Paste into the text box.
4. The app will detect it and show you a preview of the contacts before importing.

### Tips for better results
- **Google Contacts CSV**: Export from contacts.google.com → "Export" → "Google CSV". Works great.
- **Apple Contacts vCard**: Select all in Contacts.app → File → Export → Export vCard.
- **Spreadsheet**: Copy just the rows and header from your spreadsheet and paste directly.
- **If the AI output is wrong**: Add to the prompt: *"The previous output was incorrect. Please fix: [describe the issue]."*

---

## Option 5: The Contact Convertor Tool (For Complex Cases)

For very large exports or unusual formats, the dedicated **[Contact Convertor](/tools/contact_convertor.html)** tool provides a column-mapping interface to visually match your CSV fields to Greatuncle fields.

Use this when:
- You have 200+ contacts and want to verify the mapping visually.
- The AI method produced incorrect field assignments.
- Your export has unusual or non-standard column names.

---

## The Universal Doorway — What It Recognises

| Input | Detection | Action |
|---|---|---|
| Greatuncle URL with `#invite=` | Hash fragment | Imports automatically |
| Text with `--- START GREATUNCLE LINK ---` | Delimiter extraction | Extracts and imports |
| Raw Base64 invite code | String pattern | Decodes and imports |
| Seedling JSON backup | JSON structure | Offers Merge or Overwrite |
| AI-converted JSON array | JSON array | Imports as new contacts |
| CSV (pasted directly) | Header detection | Offers AI Prompt + Convertor |
| VCard (pasted directly) | `BEGIN:VCARD` | Offers AI Prompt + Convertor |

---

*Your data stays strictly on your device. No cloud. No accounts. No tracking.*
