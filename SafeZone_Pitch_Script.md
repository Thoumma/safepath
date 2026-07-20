# SafeZone — 7-minute hackathon pitch script

**Theme:** preventing human trafficking
**Format:** live demo, 7:00 hard stop
**Roles:** **A = Speaker** (talks, never touches the laptop) · **B = Driver** (clicks, never talks)
If you present solo, see *Solo mode* at the end.

> **How to use this file.** The left column is what you **SAY** — written to be
> spoken, not read. The right column is what the audience **SEES**. Rehearse
> until the clicks land under the sentences; a demo where the words and the
> screen disagree reads as a broken product even when it works.

---

## Time budget (keep this visible on the driver's screen)

| Block | Clock | Runs |
|---|---|---|
| 1. The hook | 0:00 – 0:50 | 50s |
| 2. What we built | 0:50 – 1:20 | 30s |
| 3. Demo A — the bystander | 1:20 – 2:05 | 45s |
| 4. Demo B — the traveller | 2:05 – 3:05 | 60s |
| 5. Demo C — the duress password | 3:05 – 4:05 | 60s |
| 6. Demo D — the response console | 4:05 – 5:10 | 65s |
| 7. Why this is hard | 5:10 – 5:55 | 45s |
| 8. Impact + what's next | 5:55 – 6:35 | 40s |
| 9. Close | 6:35 – 7:00 | 25s |

**If you are running late, cut block 7 first, then block 3.** Never cut Demo C —
it is the moment that wins the room.

---

## 1 · THE HOOK — 0:00 → 0:50

> **SHOW:** the public site `/data`, scrolled to the country table where Laos
> is marked *no data*. Nothing else on screen. No slide.

**A says:**

> "This is the official global dataset on human trafficking. Every country
> reports its detected victims to the UN.
>
> *(beat — point at the row)*
>
> Laos reports nothing. Look — 'no data'.
>
> But 'no data' does not mean 'no trafficking'. It means nobody counted.
>
> Every year, thousands of Lao people cross a border for a job that was
> promised to them. Some of those jobs are real. Some are not. And the moment
> a worker arrives, the first thing the employer takes is their passport.
>
> Without a passport you cannot go to the police. You cannot cross back. You
> cannot prove who you are. That single act is how a job becomes captivity.
>
> We built SafeZone for the moment *after* the passport is taken."

**Delivery notes for A:**
- Slow down on "Laos reports nothing." Let it sit for a full second.
- Do not read statistics aloud beyond that one. One number lands; five don't.
- Say "a worker", "a person" — never "a victim". You are talking about people
  who are alive and are going to use this app.

---

## 2 · WHAT WE BUILT — 0:50 → 1:20

> **SHOW:** phone screen mirrored beside the console browser. Both idle on
> their home screens. Say nothing about the tech stack.

**A says:**

> "SafeZone is two things that talk to each other.
>
> A phone app, entirely in Lao, for the person who is abroad.
>
> And a response console for the embassy duty officer who has to help them.
>
> Everything you are about to see is running live. Let me show you three
> people: a stranger who notices something, a worker in trouble, and the
> officer who answers."

---

## 3 · DEMO A — THE BYSTANDER — 1:20 → 2:05

> **SHOW (B drives):**
> 1. Public site home → scroll once to **"spot the signs"**.
> 2. Click **ລາຍງານ / Report**.
> 3. Pick category **ແຮງງານບັງຄັບ (Forced labour)**.
> 4. Type one short line in the description.
> 5. Attach a photo — thumbnail appears.
> 6. **Do not submit yet.** Hover the submit button and hold.

**A says:**

> "Most trafficking is not reported by the person inside it. They can't. It is
> reported by someone who walks past and notices.
>
> So the first thing on our website is not a login. It's how to recognise it —
> someone who never holds their own documents, who can't leave, who is never
> alone when they speak.
>
> And reporting takes thirty seconds. No account. No name. You can attach a
> photo.
>
> That photo is the part we thought hardest about. It never becomes a public
> URL. It goes into private storage, and a duty officer sees it through a link
> that expires. Evidence about a vulnerable person should not be one leaked
> address away from the people who own her."

**B:** submit now. Let the reference number appear on screen.

---

## 4 · DEMO B — THE TRAVELLER — 2:05 → 3:05

> **SHOW (B drives, on the phone):**
> 1. Open SafeZone, unlock with the **real** password.
> 2. Tap the passport card — the stored passport renders.
> 3. Back to home. Point at the big red SOS button.
> 4. Press SOS → confirmation screen → confirm.
> 5. Result screen appears showing the two channels.

**A says:**

> "This is the worker's phone. Before she travelled, she photographed her
> passport into SafeZone.
>
> It is encrypted on the device with a key held in the phone's own secure
> hardware. It is never uploaded. Even we cannot read it. So when the employer
> takes the paper document, she still has proof of who she is.
>
> And this is the SOS.
>
> *(after the confirm)*
>
> Watch what it does. It sends her GPS two ways at once — a text message to
> the people she trusts, and a case straight into the embassy console.
>
> Those two paths cannot cancel each other. If there is no internet, the text
> still goes. If she has no credit, the console still gets it. If there is
> nothing at all, it queues and sends the moment she has signal again.
>
> We designed for a phone that is nearly dead, on a network that nearly works."

**Honesty guard:** the screen says the SMS composer *opened*. If a judge asks,
say plainly: "the message is composed and she taps send — we don't send SMS
silently from a server yet." Do not claim delivery.

---

## 5 · DEMO C — THE DURESS PASSWORD — 3:05 → 4:05

> **This is the centrepiece. Slow down. Do not rush the reveal.**
>
> **SHOW (B drives):**
> 1. Lock the app.
> 2. **A asks the audience:** "If someone is standing over her, forcing her to
>    open her phone — what does she do?"
> 3. B types the **fake** password. The app opens.
> 4. Let it sit. The vault is empty. No passport. No contacts. No warnings.
> 5. **Then** switch to the console and show the new **CRITICAL / DURESS** case.

**A says:**

> "She has two passwords.
>
> The real one opens what you just saw.
>
> This is the second one.
>
> *(B types it — wait for the screen)*
>
> It opens. No error. No lock icon. No 'access denied' — because a warning is
> exactly what gets someone hurt. The vault is simply empty, as if she never
> set it up. Nothing on this screen tells the person holding the phone that
> another password exists.
>
> *(turn to the console)*
>
> But the embassy already knows. That password fired a silent alert with her
> location, and the console raised it to CRITICAL and labelled it DURESS —
> because an officer needs to know the difference between someone who chose to
> call for help and someone who was forced to unlock their phone.
>
> This is the feature we are proudest of, and it is also the one we were most
> careful with. Live location tracking shuts down the instant that password is
> used. The decoy has to protect her whole world — her contacts, her family,
> everyone who depends on her — not just a photograph."

**Delivery notes for A:**
- Do not say "invisible". The alert opens a message composer today. If asked:
  "silent on the server side; the last mile still needs a paid SMS gateway —
  that's our next build."
- The line about *no warning icon* is the one judges remember. Land it.

---

## 6 · DEMO D — THE RESPONSE CONSOLE — 4:05 → 5:10

> **SHOW (B drives, browser):**
> 1. **Inbox** — the case from Demo B sitting at the top with its reference
>    number `SOS-YYYY-MMDD-NNN`.
> 2. Open the case → timeline.
> 3. **ແຜນທີ່ ສົດ / Live map** — red trails (emergencies) + blue trails
>    (journey sharing).
> 4. **ເຄືອຂ່າຍ ຄົນ / People Connect** — then click the top connector chip
>    (the agent linked to 5 travellers).

**A says:**

> "Now the officer's side.
>
> Every alert becomes a numbered case with a timeline — who was told, when,
> what was done. That is what makes this usable by an institution instead of
> an inbox.
>
> *(live map)*
>
> Red is an emergency in progress, and it moves — the phone keeps sending while
> the case is open. Blue is different: that is someone who chose to share their
> journey. A woman crossing a border alone can switch it on so the people she
> trusts can watch her arrive. It is off by default, and one tap deletes the
> whole trail. Protection you cannot switch off is just surveillance.
>
> *(People Connect — click the hub)*
>
> And this is what happens when you put the reports together.
>
> Each person listed the people they trust. This man appears in five different
> travellers' lists — five people who never met, in different provinces, all
> routed through the same recruiter.
>
> No single report shows that. Only the network does."

**Ethical guard — say this line, do not skip it:**

> "To be clear: this is a lead, not an accusation. It tells an officer where to
> ask the next question. We built it to find patterns, not to convict people."

That sentence pre-empts the "isn't this surveillance?" challenge before a judge
can raise it, and it is the honest position.

---

## 7 · WHY THIS IS HARD — 5:10 → 5:55

> **SHOW:** stop clicking. Screen stays on People Connect. All eyes on A.

**A says:**

> "Three decisions took us the longest, and they are the reason this is not a
> weekend prototype.
>
> First — it works offline. The whole app opens, the vault opens, and the alarm
> still reaches a human being with no internet at all.
>
> Second — the failure modes are honest. The app never tells you a message was
> delivered. It tells you it was sent, or queued, or failed, per channel.
> Software that lies about reaching help is worse than no software.
>
> Third — the duress mode has no tell. No hidden icon, no different wording, no
> delay. We wrote automated tests whose only job is to prove that pressing lock
> kills the tracking before the fake password can ever be used. If that test
> fails, the build fails."

---

## 8 · IMPACT + WHAT'S NEXT — 5:55 → 6:35

**A says:**

> "Who this is for: Lao workers crossing into Thailand, Malaysia and the Gulf —
> and the embassy staff who currently learn about a case from a phone call
> relayed through three relatives.
>
> It's built, it's bilingual, and the console is deployed today.
>
> Three things next.
>
> One — a real SMS gateway, so the duress alert never needs a human to press
> send.
>
> Two — the passport verification hook is already written for the Ministry of
> Foreign Affairs; the day they publish the service, we connect it.
>
> Three — a pilot with one embassy and fifty workers, because the number that
> matters is not downloads. It's how fast someone reaches help."

---

## 9 · CLOSE — 6:35 → 7:00

> **SHOW:** back to `/data`, the Laos "no data" row. Same image you opened on.

**A says:**

> "We started here. Laos reports no data.
>
> We can't fix that from a hackathon. But we can make sure that the next person
> who is in trouble has something in her pocket that works when her passport is
> gone, when her phone is being watched, and when there is no signal.
>
> That's SafeZone. Thank you."

*(Stop talking. Do not fill silence. Wait for questions.)*

---

## Pre-flight checklist — run this 20 minutes before

- [ ] `npm run db:seed` — gives you 4 live journeys, 19 SOS trails, and the
      recruiter hub linked to 5 travellers that Demo D depends on.
- [ ] Log the console in **now** and keep the tab open. Sessions expire.
- [ ] Phone: app installed, **real + fake passwords set**, passport image
      already saved, at least one trusted contact added.
- [ ] Put the phone on **Do Not Disturb** and turn the brightness to full.
- [ ] Screen-mirror tested on the venue projector, not just your monitor.
- [ ] Console open on these tabs in this order: Inbox · Live map · People
      Connect · Data.
- [ ] Zoom the browser to **125%** — judges are 5 metres away.
- [ ] Use **light mode** on the projector. Dark UI disappears on cheap beamers.
- [ ] Have a **second phone** as the trusted contact so the SMS actually
      appears somewhere visible.

### If the wifi dies

Screenshots are already in `software_result/mobile/01…15`. Put them in a
folder on the desktop named `FALLBACK`. If the network drops, say:

> "The network here is doing exactly what a border town does — so let me show
> you the captures."

Then keep talking at the same pace. A presenter who is unbothered by a failure
looks more credible, not less.

---

## Questions judges will ask — and the honest answer

**"Isn't the fake password just security theatre? Can't they force both out of her?"**
> Yes, under enough pressure. It's not magic — it buys the one thing that
> matters, which is that the alert leaves the phone before anyone realises an
> alert exists.

**"How is this different from a panic button app?"**
> Two independent channels that can't cancel each other, an offline queue, the
> duress mode, and an institutional console on the other end. A panic button
> with nobody answering is a placebo.

**"What stops someone abusing People Connect to map innocent people?"**
> It only ever shows contacts people voluntarily entered, it's embassy-only —
> partner organisations can't open it — and we treat a cluster as a lead, not
> evidence.

**"Is the passport safe if the phone is stolen?"**
> Encrypted with AES-256, key in the phone's hardware keystore, never uploaded.
> Our known gap: the key isn't yet tied to the password, and that's written
> down in our roadmap rather than hidden.

**"Who pays for it?"**
> Embassy or NGO deployment, plus the donation page already built into the
> site. The app is free to the worker forever — a safety tool with a price tag
> excludes exactly the people who need it.

**"What's not finished?"**
> Server-side SMS, phone verification needs a provider switched on, and we need
> a real-device test matrix. It's in `SafeZone_Remaining_Work.md` — we track
> what's broken as carefully as what works.

---

## Solo mode

Doing it alone costs you about 40 seconds in transitions. Adjust:

- Cut **Demo A** entirely (the bystander flow). Mention it in one sentence
  during block 2: *"There's also a 30-second anonymous report form for
  bystanders — that's how most cases actually start."*
- Set every screen up **before** you start talking, and use `Alt+Tab` between
  two windows only. Never navigate menus while speaking.
- Practise the Demo C password entry until you can type it without looking.
  Fumbling that password kills the tension in the best moment you have.

---

## The three sentences to memorise word-for-word

If you forget everything else, these three carry the pitch:

1. **"'No data' does not mean 'no trafficking'. It means nobody counted."**
2. **"It opens. No error, no warning — because a warning is exactly what gets
   someone hurt."**
3. **"This man appears in five different travellers' contact lists. No single
   report shows that. Only the network does."**
