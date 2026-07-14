# Fitness Nation EOS — Old (Replit) vs New (rebuild) Parity Audit

Date: 14 Jul 2026. Old app: fitness-nation-eos.replit.app. New app: this repo.

Legend: ✅ matches · ⚠️ different (works, but not the same) · ❌ missing in new

## UPDATE — functional gaps now fixed (14 Jul)

Every missing FUNCTION has been added so the new site matches the old:

- Meeting: single 1-10 rating slider with banded caption (was invented per-person boxes).
- Issues: Add is now the same modal (Title, Description, Category, Priority, Assignee); Resolved section now has the "All Months" month filter.
- To-Dos: added the Quarterly Calendar (quarter months, today highlighted), the Month filter (All Months / Jan-Dec), and the Sort dropdown (Due Date / Person / Title / Status), plus a quarter picker.
- History: added the per-meeting Actions column — Edit (rating, cascading, notes) and Delete.
- Dashboard: added the "Next L10: <date>" line and switched the 2nd KPI to the combined "Total Members" (DD + PIF).

- Rocks: reverted from the Kanban back to the old single drag-to-reorder grid of priority cards (status badge, progress number + slider, owner, status dropdown).

One remaining difference is layout-only (same functions, different arrangement):
- Issues shows To Discuss / In Progress / Resolved stacked (old was two columns side by side). All issue actions exist in both. Say the word if you want it reverted too.

---


## Summary of gaps

| Page | Status | What differs |
|------|--------|--------------|
| Dashboard | ⚠️ | New is missing the "Next L10: <date>" line; new shows "PIF Members" where old shows combined "Total Members" |
| Scorecard | ✅ | Per-category tables, Owner/Target/Actual/Status/Trend, Export CSV — all present |
| Rocks | ⚠️ | Old = single reorderable list; new = 4-column drag-and-drop Kanban (deliberate change) |
| Issues | ⚠️ | Add now fixed (modal). Old = two columns (To Discuss \| In Progress) + Resolved with a month filter; new = three stacked sections, no month filter |
| To-Dos | ❌ | New is missing: Quarterly Calendar, the Month filter, and the Sort dropdown (Due Date / Person / Title / Status) |
| Meeting | ✅ | Rating now fixed to the single 1-10 slider; agenda, timer, sections all present |
| Weekly Update | ✅ | Update Actuals / Set Targets tabs, category groups, auto metrics, save — all present |
| Quarter Setup | ✅ | Start/Target inputs, owner select, weekly target preview, Plan Exists — all present (group labels differ slightly) |
| History | ⚠️ | New is missing the per-meeting Actions (edit/delete); old is week-scoped, new lists all meetings and adds a Data Sync Log |

## Detail

### Dashboard
- ✅ On Track / Off Track health, 12 KPI cards, Rocks/Issues/To-Dos panels, 3 trend charts.
- ❌ "Next L10: <date>" indicator under the header.
- ⚠️ Second KPI: old shows "Total Members" (DD + PIF combined); new shows "PIF Members".

### Rocks
- ✅ Add / edit / delete, progress %, owner, status, drag.
- ⚠️ Old is one list you drag to reorder; new groups rocks into four status columns (Kanban). Both let you change status and progress.

### Issues
- ✅ Add (now a modal matching old), edit, delete, status flow (Start / Resolve / Drop / Reopen), priority, category, assignee.
- ⚠️ Old lays To Discuss and In Progress side by side; new stacks them.
- ❌ Old Resolved section has an "All Months" filter; new only has Hide/Show.

### To-Dos  (biggest gap)
- ✅ Add, complete (checkbox), edit, delete, Completion Rate card, per-member bars, overdue/ due-this-week pills.
- ❌ Quarterly Calendar (Jul/Aug/Sep grid with today highlighted).
- ❌ Month filter ("All Months" + Jan-Dec).
- ❌ Sort dropdown (Due Date / Person / Title / Status).

### History
- ✅ Meetings Completed, Average Rating, Minutes per Meeting cards; meetings table with Week/Date/Status/Rating/Cascading/Notes.
- ❌ "Actions" column with per-meeting edit + delete icons.
- ⚠️ Old is scoped to the selected week; new lists all meetings and adds a Data Sync Log panel (an addition, not a loss).

### Already fixed this session
- Meeting: single 1-10 rating slider with banded caption, shown on the Rating step (was invented per-person boxes).
- Issues: Add is now a modal (Title, Description, Category, Priority, Assignee, Create Issue) — fixes the "can't type / can't add" problem.
