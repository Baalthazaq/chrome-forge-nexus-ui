## Timestop: In-Game Calendar System

This plan builds Timestop into a fully functional in-game calendar with a custom 364+1 day year, personal events, admin-managed universal events, and subscription billing integration tied to game ticks.

---

### The Calendar System

**Year structure:**

- 13 months of 28 days each (364 days), plus 1 special standalone day called the "Day of Frippery" (always a Sunday)
- Each month starts on Sunday and ends on Saturday (28 days = exactly 4 weeks, so every month has the same layout)
- Day of Frippery sits between the months Trade and Light. It is the middle day of the year. 

**Seasons and Months (in order):**


| #   | Season | Month       | Key Holidays                                        |
| --- | ------ | ----------- | --------------------------------------------------- |
| 1   | Shield | Oath        | Day of First Promise (1st)                          |
| 2   | Shield | Stern       | Days of Confession (All month)                      |
| 3   | Shield | Engineer    | Day of the Mind (28th)                               |
| 4   | Shield | Miner       | Day of the Body (1st)                               |
| 5   | Shield | Retribution | Day of No Mask (11th), Day of Shield and Axe (28th) |
| 6   | Axe    | Shackles    | Day of Shame (21st)                                 |
| 7   | Axe    | Trade       | Day of Therin (25th)                                |
| 8   | -      | Frippery    | Lie Day (standalone day)                            |
| 9   | Axe    | Light       | Truth Day (1st)                                     |
| 10  | Axe    | Navigator   | Finder's Day (any)                                  |
| 11  | Hammer | Tryst       | Baubledays (unofficial, any)                        |
| 12  | Hammer | Destiny     | Days of Ease (All month)                            |
| 13  | Hammer | Groveling   | Grovellerday (4th)                                  |
| 14  | Hammer | Negotiation | Therin's Reckondays (25th-28th)                     |


**Day of Frippery** is displayed as a 14th month, but with 27 out of 28 days blank, so effectively Sunday occurs twice in a row, but it does not distrub the layout. 

---

### Status: ✅ IMPLEMENTED

**Database:** `game_calendar` and `calendar_events` tables created with RLS. Holidays seeded.

**Edge Function:** `advance-day` deployed — advances game date, triggers billing (daily/weekly/monthly/yearly).

**Player UI:** `/timestop` — calendar grid with month nav, event dots, personal event CRUD, holiday display.

**Admin UI:** `/admin/timestop` — shared calendar, advance day with billing preview, universal event management.

**Calendar Utility:** `src/lib/gameCalendar.ts` — month/season data, date formatting, billing trigger logic.

---

### NPC stuff

Remains scoped for Doppleganger admin as requested — not part of this implementation.
