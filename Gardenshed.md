Greatuncle: The "Garden Shed" Backup System

1. The Concept: Hybrid Resiliency

The "Garden Shed" is the utility section of Greatuncle where the user manages the "Seedling" of their 150-person community. It supports both high-speed digital transfers and low-tech physical permanence.

2. Digital Export (The "Data Clipboard")

Action: "Copy Digital Seedling."

UI: A text area populated with either a Base64 string or a human-readable JSON block of all contacts and settings.

Benefit: Allows the user to save a .txt file or note for instant "Cut & Paste" restoration.

3. Physical Export (The "Paper Ledger")

Action: "Print Physical Ledger."

UI: Generates a PDF.

Content: * Human-readable list of the 150 (Name, Phone, Birthday).

Machine-readable QR codes containing the compressed JSON data.

Benefit: Relationship data survives even if all personal electronics fail.

4. The Unified Import Logic

The "Restore" feature is smart. The user clicks "Import" and is given choices:

Paste Text: A box where they paste the Seedling string (either format).

Scan Paper: Activates the camera to read the QR code from the Ledger.

5. Maintenance: The "Stale Seedling" Timer

The app tracks last_export_timestamp (covering both paper and digital).

Nudge: "Your backup is X days old. You have added people to your community since your last 'Seedling' was saved.".