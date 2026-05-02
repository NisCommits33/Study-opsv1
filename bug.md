# Study Ops — Bugs & Improvements

## 🐞 Bugs
*   **[RESOLVED] Ingestion JSON Parsing Error**: AI sometimes returned conversational text around the JSON block, causing `JSON.parse` to fail.
    *   *Status:* Fixed by implementing native JSON mode and robust extraction.

## 🚀 Improvements
*   **Native AI JSON Mode**: Forced AI providers (Groq/OpenAI) to return data in a strict `json_object` format.
*   **Increased Context Window**: Expanded AI response limit to 4096 tokens to support long-form documentation generation.
*   **Bilingual Documentation Pipeline**: Robust handling of English/Nepali documentation formatting with GitBook-style Markdown.
