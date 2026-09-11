# LightVerse — v1 Brief & Objection Handling

*A tight description of what LightVerse is, who it's for, why it's built this way, and how to answer the pushback you'll get. Distilled from a full stress-test of the plan.*

---

## The one-liner

**LightVerse is a scripture-memorization service that lives in your text messages — it texts you a verse each morning with words progressively blanked out, you reply to recall it, and it uses spaced repetition to bring old verses back before you forget them. No app to download, no password, no page to remember to open.**

If you have ten more seconds: *Every other memorization app makes you open an app. LightVerse meets you where you already are — your texts.*

---

## What it actually is

The atomic loop: each morning a scheduler decides whether to send you the next step of a verse you're learning, or resurface an older verse that's due for review. The message shows the verse with some words hidden; you reply with the full verse; word-level checking tells you exactly what you missed; your step advances, your streak grows.

The critical reframe from v0: **LightVerse is a *remembering* app, not a *learning* app.** v0 taught a verse over seven days, marked it "complete," and never showed it again — which delivers the *feeling* of memorizing without the *result*, because memory fades without spaced review. v1's headline feature is the review engine that makes verses actually stick for years. That single change is the difference between a tool people finish and abandon, and a permanent daily companion.

---

## Who it's for

**Solo adults. In v1, deliberately not children, families, or groups.**

The specific person: a busy adult who genuinely wants scripture in their heart but will *never* reliably open another app. They've tried the free apps and bounced off — not because the apps were bad, but because "remember to open it" is the thing they fail at. For them, "it just texts me" isn't a feature, it's the whole reason it works.

Families, children, and church groups are real and valuable — but they want a *different* product (parent-managed, web-based, no phones for kids) with a different buyer. They are a deliberate **v2**, written down and set down. (Technical note: v1 models an account as a *profile that has a phone number*, not a profile that *is* a phone number — so families later is an added feature, not an auth rewrite.)

---

## The wedge (why this exists when the market is crowded)

The market is saturated with good, mostly-free memorization apps: Remember Me (free, nonprofit-backed, 300+ translations), Versify (free forever), the Bible Memory App (2M+ users), Verses (~$5–10/*year*). Several are backed by ministries that never need to charge.

**You cannot win a features war against a free nonprofit, or a price war against free.** Spaced repetition, gamification, family accounts, unlimited verses — all commodity, all already free somewhere.

The one thing *none* of them do: **live in your text messages.** Every competitor is an app you open. LightVerse's entire defensible position is the SMS-native, zero-app, meets-you-where-you-are channel. That's the moat — and it's the same thing that used to look like the cost problem. **SMS is not the liability; it's the only differentiated ground you stand on.**

---

## The business model

- **Trial-to-paid. No permanent free tier.** A time-boxed trial gives a real taste, then converts to paid or ends.
- **The trial is sized by the "wow," not a round number.** The magic moment — "I nearly forgot this verse weeks later and the review caught me" — is intrinsically a few weeks out. The trial (≈4–5 weeks) is engineered so at least one review *save* happens *before* it ends. A trial that expires the day before the product proves itself doesn't convert.
- **Price floor is set by Twilio, not by willingness-to-pay.** SMS costs roughly £2.50–6/user/month to serve. That forces a floor around **£4.99**, with £5.99–6.99 worth testing for real margin. Someone paying purely for convenience is buying convenience, not price — likely less price-sensitive than average.
- **£1.99 is not a price, it's a loss** — below cost to serve. The low end of the audience is real but unservable over SMS; they're who an eventual free push on-ramp keeps warm, not people to lose money on monthly.
- **Early on, thin margin is acceptable** to buy retention and word-of-mouth — *with a tripwire*: at ~100 paying users, or a set monthly Twilio spend, the margin conversation reopens automatically. "For now" has a defined end, or it becomes the cost bomb wearing a friendly mask.

---

## v1 scope (ship in weeks, not months)

The single biggest risk to LightVerse isn't a competitor — it's that a capable developer gold-plates v1 into a multi-month rebuild, loses momentum, and lets it go stale *again*. The discipline is to ship something crude and alive.

**Must ship — this *is* v1:**
- The **spaced-review engine**: a crude fixed-interval ladder (1 / 3 / 7 / 30 / 90 days) and a daily scheduler that picks "next step of a new verse" or "a review that's due." This one thing is the entire learn→remember thesis.

**Ship because it's nearly free while you're in there:**
- Consolidate the two conflicting cloze implementations into one (needed for correctness anyway).
- Strip every emoji and tighten copy — emoji force SMS into 70-char segments; removing them roughly halves cost per message, for free.

**Ship only if quick (else v1.1):**
- Word-level feedback that names missed words, with per-word fuzz so typos aren't scored as forgetting.

**Fake it, don't build it:**
- Billing. A Stripe payment link + marking accounts paid by hand. Concierge billing beats building subscription automation, trial-expiry logic, and dunning for a handful of users.

**Defer ruthlessly:**
- Custom send-times / per-user timezones (accept UK-only for now — 8am UTC is fine for Britain).
- A "real" SM-2 algorithm (the crude ladder creates the identical wow).
- The push/web free on-ramp, families/groups, abuse controls, and WhatsApp.

**Commit to a timebox, not just a scope.** "v1 ships in N weekends." Scope without a clock is how capable people gold-plate back into staleness.

---

## Roadmap (post-launch, in rough priority)

1. **WhatsApp as the margin fix.** Structurally suited to the loop: only the daily proactive send is charged; the reply and validation response fall in WhatsApp's free 24-hour service window. If the daily verse is classified *utility*, cost drops ~10x vs SMS (~£0.30–0.50/user/month), flipping £4.99 from break-even to ~90% margin. **Caveats:** Meta controls the utility-vs-marketing classification (test it early by submitting one template — costs an afternoon, not a launch); it's a permissioned, approval-gated, quality-rating-policed channel; and it assumes the user has WhatsApp. **Trigger to build: the cost tripwire above, not "now"** — at 9 users the SMS cost saved is pennies while the WhatsApp build costs weeks.
2. **Word-level feedback** (if it slipped from v1).
3. **A proper spaced-repetition algorithm** once the crude ladder is validated.
4. **Families / groups / children** — the deliberate v2 audience.
5. **Free push/web on-ramp** — a thin taste that funnels to SMS, *not* a full app competing with free incumbents on their turf.

*Long-term:* SMS and WhatsApp aren't either/or. SMS is the purest wedge (any phone, zero install, no opt-in); WhatsApp is cheaper but assumes the app. Plausibly SMS becomes the premium "works on literally any phone" tier and WhatsApp a cheaper tier — but that's a two-channel product, and two channels is not v1.

---

## Objection handling

**"It's a crowded market — there are loads of free Bible memory apps."**
Correct, and I don't compete with them on their turf. Every one of them is an app you open. LightVerse is the only one that lives in your texts. I'm not building a better app than Remember Me — I'm reaching the person who will never open Remember Me.

**"Why would anyone pay monthly when Remember Me is free and Verses is ~$10 a year?"**
They're not paying for memorization — they can get that free. They're paying for *delivery that actually reaches them*: no app, no install, no "remember to open it." For the person who has repeatedly failed to stick with app-based tools, that convenience is the difference between doing it and not. If that's not worth it to someone, they're not my customer — and that's fine.

**"SMS is expensive. How is this even viable?"**
It's viable *because* it's priced accordingly — the subscription is set above the cost to serve, not guessed at. SMS cost is also the reason the price floor is where it is, and the reason the cheap channels (WhatsApp, push) are on the roadmap to widen margins at volume. The cost is designed into the model, not discovered later.

**"What stops Remember Me or the Bible Memory App just adding SMS next quarter?"**
Honestly — not much technically. The bet is on *speed and focus*: owning "SMS-native, done really well, for the people app-based incumbents structurally ignore" before a free player bolts on a half-hearted version. It's a real risk, not a solved one. The mitigation is moving fast and being the one product built entirely around this, rather than treating it as a checkbox.

**"Why not just build an app like everyone else?"**
Because "everyone else" is the red ocean — free, mature, better-resourced, nonprofit-backed. Building app #15 is competing where I'm weakest. The no-app channel is the one square of ground nobody's standing on.

**"Isn't this just flashcards? Does spaced review actually work?"**
Spaced repetition and the forgetting curve are well-established — a verse learned in a week is largely gone in a month without review at widening intervals. The whole point of v1 is that it's a *remembering* system, not a one-pass *learning* trick. That's exactly the gap in most casual approaches.

**"£4.99 a month is a lot for a Bible app."**
It reflects the true cost of guaranteed, no-app delivery to your phone every day. It's not competing on price with free apps — it's a different value proposition (convenience and reliability), for a person who values that. Price-shoppers aren't the target.

**"What about kids and families? That seems like a bigger market."**
Agreed it's valuable, and it's on the roadmap as v2. But it's a genuinely different product — parent-managed, web-based, different buyer — and trying to serve it in v1 would dissolve the one sharp thing that makes LightVerse work. Narrow and deep first.

**"You've only got 9 users. Doesn't that tell you something?"**
It tells me it's early and unproven — which is exactly the right stage to be redesigning at, because changes cost nothing and break nobody. Two of those nine are consistent daily users, and both said they'd pay. That validates the core loop can hook someone. It doesn't yet validate the business — which is why the next step is charging real money, not building more.

**"Isn't the whole thing just a cron job and Twilio? Not very defensible."**
The technology isn't the moat and I don't pretend it is. The moat is being the focused product that owns a specific channel and a specific under-served person, executed fast. Thin, yes — which is why speed matters.

---

## What's still unproven (be honest about this)

Keeping these visible is what keeps the plan honest:

- **Conversion rate is unknown.** The trial model lives or dies on it, and 9 users can't reveal it. The £4.99 trial is effectively a ~£5 customer-acquisition cost per trial user — great if they convert and stay, pure loss if they don't.
- **Willingness-to-pay evidence is the weakest grade.** Two stated yeses from friends who like you and probably don't know the free alternatives. A *cleared card* is worth ten verbal yeses.
- **The moat is thin.** No technical barrier stops an incumbent adding SMS. The whole bet is speed and focus.
- **The price floor sits ~10x above the market's free-to-$10/year anchor.** The entire business compresses to: *can you convince a specific person that no-app convenience is worth ~£60/year?* Real, but narrow.

---

## The critical path (do this before writing more code)

1. **Charge the £4.99 friend for real, this week.** A cleared payment is the single highest-signal test available.
2. **Find five strangers** — people who don't know you and don't know Remember Me is free — and see if they'll pay £5.99. That test, not more building, tells you if this is a business.
3. **Submit one WhatsApp template** to a BSP and see whether Meta classifies the daily verse as utility or marketing. An afternoon; decides whether the margin case is real.
4. **Then** build the crude v1 (review engine + cloze consolidation + emoji strip + manual billing), timeboxed.

---

*The biggest threat to LightVerse is not competition or cost. It's letting it go stale a second time. Ship something crude and alive, charge real money early, and let five paying strangers — not more features — tell you whether to keep going.*
