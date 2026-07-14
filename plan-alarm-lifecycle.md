# Plan: the alarm lifecycle — lowering it, and not losing it

**Status:** items 1 and 2 **implemented (2026-07-14)**. Items 3 and 4 are **not started**.

Follows on from `plan-identity-guardian.md`, which built the app→console loop. That plan let the
app *raise* an alarm. It did not let anyone lower it, and it dropped the alarm entirely when the
phone had no signal — which is the exact condition this app exists for.

---

## 0. The three holes this closes

`plan-identity-guardian.md` shipped a working SOS→console→guardian loop. Driving it end to end
surfaced three gaps that are not features so much as missing halves of what was already built:

1. **The alarm could not be lowered.** A case stayed `NEW` forever. The duty officer kept an open
   emergency on their board, and — via `/api/me/guardians` — every person who trusts the user kept
   seeing them as ສຸກເສີນ, indefinitely, long after they were fine.
2. **An offline alarm was lost permanently.** `SosServer` correctly reported `skippedOffline` and
   let SMS carry the emergency. But nothing retried. A traveller with no data could press SOS, get
   an SMS to their family, walk back into coverage an hour later — and the embassy would never learn
   anything had happened.
3. **Nobody is notified.** The Guardian tab is pull-to-refresh only. It is a passive directory: if
   someone who lists you presses SOS, the app that owns the entire relationship stays silent.

---

## 1. "I'm safe" — resolve your own case ✅ done

**Console** — `src/app/api/me/case/route.ts`

- `GET` → the caller's own still-open case, or null.
- `POST` → resolve it; writes a `resolve` timeline event so the officer sees who stood it down.

Both scope by the **verified phone claim** and never by an id from the request, so there is no case
here a caller could ask for but does not own. No IDOR surface.

**App** — `services/case_service.dart`, banner in `screens/home_screen.dart`

Banner renders above the SOS button (standing down a running alarm outranks raising another) and
only when a case is open. Confirmed by dialog, and cleared from the screen **only once the console
confirms** — an optimistic all-clear that never left the phone would leave the duty officer still
searching while the user believes they have told everyone otherwise.

### 1a. Duress: two locks on the same door

`DURESS` cases are excluded from `/api/me/case` in **both** directions, and `CaseService` refuses to
call it at all in decoy mode. Either alone would do; both are there because the failure is
unrecoverable.

- **The device must not be able to clear a duress case.** The device is the thing the attacker is
  holding. An "I'm safe" button reachable by the coercer is a button that *undoes the silent alarm*.
  Only a human duty officer resolves a duress case, from the console.
- **The device must not *show* one either.** The promise is that the phone looks identical whether
  or not the silent alarm fired. A banner reading "your emergency is still open" is a tell, and a
  tell read over the victim's shoulder is the whole vulnerability.

The outbox flush (below) is deliberately **not** gated on decoy — a queued duress alert must still
get out, and it is a silent network call the attacker cannot observe.

---

## 2. Offline SOS outbox ✅ done

`models/pending_sos.dart`, `services/sos_outbox.dart`; enqueue in `SosService.triggerSos`.

- Queued in the **OS keystore**, not shared preferences. A pending entry is the GPS fix of a person
  in trouble plus a duress flag — the most sensitive thing this app writes outside the passport
  vault.
- Only **transient** failures are queued (`skippedOffline`, `failed`). `noProfile` and
  `notConfigured` will not fix themselves on retry; queueing them would be a silent forever-loop.
- An entry is removed **only once the console accepts it**. Anything that fails stays queued.
- Flushed from `main()` (not awaited — an undelivered emergency must not hold up the first frame,
  and must not depend on the user unlocking) and again on every `HomeScreen._refresh`, which is the
  cheapest reliable proxy for "the user is active and may have walked back into coverage".
- Capped at 10, oldest dropped. Old alerts are still worth delivering — an unanswered emergency does
  not stop mattering because time passed — but the queue must not grow without bound on a phone that
  never regains signal.

### 2a. `occurredAt` — a delayed alarm must not read as a live one

The payload carries the time the emergency **happened**, not the time it was finally delivered. The
gap can be hours.

`Case.createdAt` still means "when the console learned of it": the inbox is ordered newest-first, and
back-dating a delayed case would file it *below* cases the officer has already worked, which is
precisely how a delayed emergency gets missed entirely. Instead the delay is stated on the
**timeline**, where it is actually read: `(ສົ່ງຊ້າ N ນາທີ — ຕອນນັ້ນບໍ່ມີສັນຍານ; ຕຳແໜ່ງນີ້ແມ່ນຕອນ …)`.

A two-hour-old GPS fix presented as a live one sends the rescue to where the person used to be. This
must never be silent.

---

## 3. Push notification to guardians ⬜ not started

The real payoff of the guardian graph. Supabase Realtime on `cases` → FCM push to every phone whose
number appears in that citizen's `trusted_contacts`.

**Blocked on you:** needs a Firebase project + `google-services.json`. Not code-blocked otherwise.

---

## 4. Passport MRZ OCR ⬜ not started

`ProfileScreen` makes the user **type** their passport number, and that number is the join key to
`Citizen.passportNo`, which is `@unique`. A typo does not merely annoy: it files an emergency case
under a passport number that does not exist, or collides with a real one belonging to someone else.
`plan-identity-guardian.md` §10 already flags this.

The passport's **MRZ** (the `<<<<<` lines; TD3, 2×44 chars) encodes passport number, name,
nationality, DOB, sex, expiry — **with check digits**, so the read can be *verified*. Hand-typing
never can. This is a correctness fix, not a convenience feature. It also fills `Citizen.dob` and
`Citizen.nationality`, which the schema has and we currently leave empty.

**Hard constraint: on-device only.** `google_mlkit_text_recognition` + `mrz_parser`. A cloud OCR API
would upload the passport plaintext to a third party — exactly what `CryptoService` and the "never
persisted in plaintext" guarantee exist to prevent. Run OCR on the in-memory bytes *before*
encryption; the passport is still only ever written encrypted.

Free bonus: the expiry date. An expiry warning costs one comparison and is genuinely useful to a
traveller.

---

## 5. Still out of scope

- `CryptoService`, `PassportStore`, the encryption model. Untouched.
- Phase-2 live tracking (`plan.md` §6).
- The open P1 items in `SafeZone_Remaining_Work.md`. The **lockout throttle** in particular is still
  open and still matters most.
