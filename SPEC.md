# Agent SoW Specification

**Version:** 0.15.0-draft
**Status:** Working Draft
**Date:** 2026-08-10

A **statement of work** (SoW) is the legal agreement businesses sign when
they hire a service firm: it lists the work, what each side provides, the
deliverables, the price, and the end date. An **Agent SoW** is that same
agreement, adapted for two parties whose software agents do recurring work
together. It states who the parties are, what work is in scope, what each
side furnishes and delivers, at what price and volume, for how long, and what
happens when things change, end, or go wrong.

The defining feature of this specification is not the clause list, which any
consulting contract has. It is the **enforcement gradient**: every clause in an
Agent SoW is labeled with what a machine can actually do about it. A clause is
*enforced* (violations are refused mechanically), *evidence* (a signed,
tamper-evident record exists), or *recorded* (a promise whose breach is
punished by reputation, not code). A document that claims more enforcement
than its runtime delivers is not conformant.

This specification is transport-neutral. It was developed alongside the
AgentMesh protocol and borrows its task lifecycle from the A2A Task model, but
nothing here requires a particular network, message bus, or vendor.

---

## 1. Motivation

Agent-to-agent work that matters is recurring: the same two parties,
repeatedly, over months, exchanging work under standing expectations.
Businesses govern that shape with a statement of work. Software agents can go
one step further: a large subset of SoW clauses can be enforced by the
runtime itself, refused at the door rather than litigated after the fact.

The controls that exist for agent traffic today are per-message: identity
checks, rate limits, size caps, applied to every message as if it came from a
stranger. Those protect a machine; they say nothing about a relationship. The
Agent SoW exists to make the enforceable part of a working relationship
explicit, and to be honest about the rest.

## 2. Conformance language and terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

- **Engagement**: one instance of an Agent SoW between two parties.
- **Template SoW**: a complete document with no signatures. It carries no
  force. When it is sent to a specific counterparty for consideration it is
  also called a **SoW proposal**.
- **Standing proposal SoW**: a template signed by the selling party only,
  with the counterparty seat left blank, published so that a qualified
  counterparty can countersign it. The normal source of catalog listings
  (§12).
- **Directed standing proposal**: a standing proposal that names the one
  party entitled to countersign it (§12.1.1). The seat is still blank; the
  named party is a term of the offer, inside the selling owner's signature.
  It is an offer to that party rather than to the market, it produces no
  public listing, and it lapses.
- **Agreed**: countersigned by both owners but before the start instant.
- **Active**: countersigned and at or past the start instant; the only state
  in which runtimes apply the engagement.
- **Provider**: the party whose agent performs the work (the seller).
- **Client**: the party whose agent requests the work (the buyer).
- **Owner**: the accountable principal behind an agent, typically a person or
  organization. Owners sign; agents work.
- **Agent**: a software actor identified by a public key, acting for an owner.
- **Node**: the runtime that hosts an agent and enforces the engagement's
  enforceable clauses on that agent's behalf.
- **Task**: one unit of work under an engagement, with a lifecycle of at least
  `submitted`, `working`, `input_required`, `completed`, `failed`, `canceled`.
  Under a time and materials arrangement a task may also end `exhausted`
  (§5.5.5).
- **Pricing arrangement**: the basis on which an engagement prices work:
  `fixed_fee`, `time_and_materials`, or `no_charge` (§5.5). Every engagement
  declares one.
- **Meter**: a named quantity a runtime counts and bills. Tokens consumed,
  tool calls made, items processed, and elapsed time are meters. A meter
  counts in its own natural grain; the schedule line that prices it states
  how many of those counts make one billable unit (§5.5.2).
- **Artifact**: a named deliverable attached to a completed task, distinct
  from conversational messages.
- **Clearing**: a settlement function trusted by both parties to move value
  and, where supported, to reverse it.

## 3. The enforcement gradient

Every clause in an engagement carries exactly one grade:

| Grade | Meaning | Test |
|---|---|---|
| `enforced` | A conforming runtime refuses violations mechanically, before or during the work. | Violation produces a typed refusal, not a grievance. |
| `evidence` | A signed, tamper-evident record of the relevant facts exists and is exportable. | A dispute is read from records, not reconstructed from memory. |
| `recorded` | A promise stated in the signed document that no runtime can verify. | Breach is establishable only outside the system, and punishable by reputation. |

Rules:

1. A clause MUST NOT be graded `enforced` unless both runtimes involved
   actually implement the refusal behavior. Grading is a claim about the
   deployment, not an aspiration.
2. Publishers of engagement documents MUST render the grade wherever the
   clause is rendered. Hiding the gradient defeats the specification's
   purpose.
3. A runtime that cannot enforce a clause it receives as `enforced` MUST
   refuse the engagement proposal rather than silently downgrade it.

The gradient exists because the alternative, uniform pretend-enforcement, is
how every "smart contract for AI agents" pitch fails. Buyers deserve to know
which protections are code, which are receipts, and which are promises.

## 4. Document model

### 4.1 Encoding and identity

An engagement is a JSON document. The canonical form is JCS (RFC 8785)
canonical JSON. The document identifier is:

```
sow_<crockford32(sha256(canonical bytes of version 1, minus id and signatures))[0..16]>
```

1. **The hashed bytes exclude `id` and `signatures`.** An implementation MUST
   remove both members from the version-1 document, canonicalize what remains
   under JCS, and hash that. `id` is excluded because the document carries the
   identifier derived from it: bytes that contain `id` cannot be assembled
   until the identifier is known, and the derivation would not terminate.
   `signatures` is excluded because the signatures are made over a document
   the identifier already names. These two exclusions are not the same as the
   signed bytes of §6, which remove `signatures` only and still include `id`.
   The hashed bytes and the signed bytes are two different byte strings in the
   same document. An implementation that hashes the signed bytes derives the
   wrong identifier, and an implementation that signs the hashed bytes signs
   the wrong document.
2. **`crockford32` is Crockford base32, lowercased.** The alphabet is
   `0123456789abcdefghjkmnpqrstvwxyz`, which omits `i`, `l`, `o`, and `u`. An
   implementation MUST emit lowercase, MUST NOT pad, MUST NOT insert hyphens,
   and MUST NOT use Crockford's check symbol. The digest is encoded five bits
   per character, most significant bit first, and the first 16 characters are
   taken, which are the first 80 bits of the digest. Crockford's decoding
   aliases, `o` for `0` and `i` or `l` for `1`, are a reader's convenience and
   MUST NOT appear in an emitted identifier. RFC 4648 base32 is not the
   encoding here and MUST NOT be substituted: its alphabet has no `0`, `1`,
   `8`, or `9`.
3. Two implementations following these rules derive the same identifier from
   the same document. An implementation that derives a different one is not
   conformant.

The identifier is stable across amendments; each amendment increments an
integer `version` starting at 1.

#### 4.1.1 Minting and re-derivation

An identifier is minted once. The implementation that creates the version-1
document derives the identifier there, writes it into `id`, and does not
derive it again. From that moment the identifier is a handle, and other
documents hold it by value: a settlement record names the engagement it
settles, a review names what it judges, a catalog listing names the standing
proposal it was derived from, an RFP award names the response it selects, and
an approval record names the act it authorized. Amending an engagement to
version N+1 under §5.8 leaves the identifier alone, which is what stability
across amendments means above.

An implementation MUST derive an identifier once, when it mints the
version-1 document. Storing, amending, rendering, exporting, or verifying a
document MUST NOT re-derive its identifier.

A verifier MUST NOT reject a document because its identifier does not equal
what §4.1 would derive from that document's version-1 bytes. The derivation
rule binds the implementation that mints an identifier. It does not bind the
reader of a document minted earlier, possibly under an earlier revision of
this specification. Point 3 of §4.1 is a test a minting implementation
applies to the documents it mints, and it is not a test a reader applies to
the documents it receives.

Documents minted before this revision carry identifiers derived under a
superseded reading of §4.1. Those identifiers remain valid and remain the
names of their documents. That is the reason re-derivation is not a
conformance test. A specification that made it one would invalidate every
identifier minted under its own earlier text, and would break every reference
to those identifiers held by parties who did not mint them and cannot repair
them.

There is a check a reader may legitimately want, and it is narrower than it
looks. Where a reader holds a version-1 document and knows it was minted
under §4.1 as this revision states it, re-deriving the identifier and
comparing detects accidental damage: a truncated file, a re-encoded string, a
record stored against the wrong document. Implementations MAY run that check
as a diagnostic. A minting implementation SHOULD run it on its own output
before the document is signed and published, which is the last moment a wrong
identifier is cheap to fix; afterwards the identifier is inside bytes other
parties hold and signed, and the correction is no longer local.

Four things the check does not establish, listed because an implementation
that has it working may be tempted to rely on it for more:

1. It says nothing about a document at version 2 or higher. The identifier
   commits to the version-1 bytes. An amendment is a full replacement (§5.8)
   and may change every clause a reader cares about, and the identifier is
   unchanged by all of it.
2. A mismatch does not establish that a document was altered. The reader
   cannot tell an altered document from one minted correctly under an earlier
   reading of §4.1, and in a deployment with any history the second is the
   likely case.
3. It is not a tamper check. A party that alters a document can mint a fresh
   identifier over the altered bytes, so the check finds accidents and not
   adversaries.
4. Eighty bits of a truncated digest is sized to be read, typed, and quoted
   inside another document. It is not sized to resist a search for a
   colliding document.

The content commitment a reader can rely on is the signature of §6. It covers
the whole canonical document, including `id`, at the version being read, and
it is made by a key the reader can attribute to an owner. An identifier that
does not re-derive is not evidence of anything. A signature that does not
verify is.

### 4.2 Top-level shape

```json
{
  "sow": "v1",
  "id": "sow_k7m2q4x9w3e6r8t1",
  "version": 1,
  "starts_at": "2026-08-04T00:00:00Z",  // §5.7: first-order, not a clause field
  "ends_at": "2027-02-01T00:00:00Z",    // §5.7
  "parties": { ... },        // §5.1
  "scope": { ... },          // §5.2
  "inputs": [ ... ],         // §5.3
  "deliverables": [ ... ],   // §5.4
  "price": { ... },          // §5.5
  "volume": { ... },         // §5.6
  "change_control": { ... }, // §5.8
  "termination": { ... },    // §5.9
  "disputes": { ... },       // §5.10
  "confidentiality": { ... },// §5.11
  "signatures": [ ... ]      // §6
}
```

All clause objects carry a `grade` field. Where a clause naturally splits
across grades (confidentiality is the canonical case), it is expressed as
multiple sub-clauses, each singly graded.

### 4.3 Contract language

The signed document is structured data; the sentences a person reads are the
contract language, and they MUST be covered by the signature or what a
reader sees could change after signing. Every document therefore embeds,
inside the signed bytes, a descriptor of the language it was written under:

```json
"language": { "id": "agent-sow-standard-language", "version": 1,
              "sha256": "<hash of that version's template text>" }
```

Renderers MUST render a document using the language version it names. A
renderer that does not know that version MUST say so and show the signed
fields verbatim rather than newer words. Changing any sentence of a language
version is a new version; the hash makes a silent same-version edit
detectable. Documents MAY inherit clause VALUES from a provider's standard
terms (recorded in a `derived_from` provenance field), but the document
stays self-contained: values and language are both fixed at signing time.

## 5. Clauses

### 5.1 Parties

Identifies both sides: for each, the agent's public key, an optional
human-readable handle, the owner's identity, and the party's role
(`provider` or `client`).

```json
"parties": {
  "provider": { "agent": "<public key>", "handle": "Granite.books@stonework.example",
                "owner": "Stonework Analytics" },
  "client":   { "agent": "<public key>", "handle": "Petrel.mari@harborandline.example",
                "owner": "Harbor & Line Outfitters" },
  "grade": "evidence"
}
```

A party MAY additionally carry an `organization` reference beside its owner,
naming the organization on whose behalf that seat engages (§6.2).

Grade: `evidence`. Identity verification is the transport's job; the
engagement records who was verified. A runtime SHOULD refuse to apply an
engagement to traffic whose transport identity does not match the named agent
key, and SHOULD NOT follow a handle whose underlying key has changed without
owner confirmation.

### 5.2 Scope

The work covered, as a list of the provider's published offering identifiers,
plus worked examples. Examples are normative interpretive aids: a request is
in scope if it is materially similar to an `in_scope` example and covered by a
listed offering.

```json
"scope": {
  "offerings": ["reconcile-statement", "flag-exceptions"],
  "examples": {
    "in_scope": ["Reconcile the July statement against our ledger export."],
    "out_of_scope": ["Prepare our quarterly tax filing."]
  },
  "grade": "enforced"
}
```

Grade: `enforced`. A conforming provider node MUST refuse, with a typed
refusal, any request under the engagement that names an offering not listed.
Requests are matched on offering, not on prose; the examples guide humans and
agents drafting requests, and dispute readers after the fact.

### 5.3 Inputs

What the client furnishes, in what form, and when (`per_task` or `standing`).

```json
"inputs": [
  { "name": "bank-statement", "media_type": "text/csv", "when": "per_task" },
  { "name": "receipts",       "kind": "shared_resource", "access": "read", "when": "standing" }
],
"grade": "enforced"
```

Grade: `enforced`. A task arriving without a required `per_task` input MUST
NOT fail and MUST NOT be silently attempted; it moves to `input_required`
carrying a problem report (§14) that names what is missing. Standing shared
resources are pointers governed by the engagement's confidentiality clause; a
provider MUST NOT copy, crawl, or retain them beyond task execution.

An input that was furnished can still be wrong, and an input that was fine
can stop being fine: the file does not open, the format is not what the
clause named, the link's permission was revoked in month two. Problem
reports are therefore not an admission-time feature. They may be raised at
intake, during the work, or on a later task when a standing input has gone
stale, always in the same form (§14).

### 5.4 Deliverables

Two kinds. **Per-task deliverables** are named artifacts the provider
attaches to each completed task. **Interim deliverables** are engagement-level
obligations with dates: things the provider owes on a schedule, whether or
not the client asked that day. Each interim deliverable carries either a
single `due` instant or a `recurrence`.

```json
"deliverables": {
  "per_task": [
    { "name": "reconciliation-report", "media_type": "application/pdf" },
    { "name": "exceptions", "media_type": "application/json" }
  ],
  "interim": [
    { "name": "month-end-close-summary", "media_type": "application/pdf",
      "recurrence": { "every": "month", "due_by_day": 5 } },
    { "name": "chart-of-accounts-review", "media_type": "application/pdf",
      "due": "2026-11-01T00:00:00Z" }
  ],
  "grade": "enforced"
}
```

Grade: `enforced` for form, with a sharp boundary: **form is machine-judged,
quality is not**. A task response claiming completion without every named
per-task artifact in its declared media type MUST be treated as a failed task
by both runtimes. Due dates on interim deliverables are `evidence`: both
runtimes MUST detect and record a missed due instant, and a miss counts as a
failed obligation for §5.9 and §5.10, but no runtime can force the work into
existence. Whether any deliverable is good is a matter for §5.10 and for
reputation.

### 5.4.1 Rights in a delivered artifact

Most engagements are a service: the provider does work, the client reads the
output, and nobody has to say who owns what because nothing outlives the task.
Some are not. When the client is commissioning a thing to keep and operate — a
model, a corpus, a configured agent, a codebase — the artifact outlives the
engagement, and the parties can sign a delivery while disagreeing completely
about whether the provider may sell the same thing to a competitor next week.

`rights` says what the client gets beyond receipt of the bytes. It attaches to
a deliverable (§5.4), per-task or interim.

```json
"rights": {
  "exclusivity": "exclusive",
  "modify": true,
  "redistribute": false,
  "self_operable": true,
  "grade": "recorded"
}
```

**`exclusivity`** is where nearly every dispute in this shape actually lives,
and the three values price very differently:

| Value | Meaning |
|---|---|
| `non_exclusive` | The client gets a copy. So may anybody else, including a competitor, including the same artifact unchanged. |
| `exclusive` | The provider will not deliver this artifact to another client. The provider still holds it and may keep using it themselves. |
| `work_for_hire` | The client holds it outright. The provider retains no copy, no use, and nothing to resell. |

A deliverable the client keeps, under a proposal that states no exclusivity, is
being quoted without the one fact that most determines its price. Providers
SHOULD state it and clients SHOULD refuse a quote that does not.

**`modify`** and **`redistribute`** are separate because they are separately
valuable: a client may need to adapt an artifact to their own systems without
any right to pass it on.

**`self_operable`** is a **declared property, not a requirement**. True means
the client can run the artifact without the provider's continued service; false
means they cannot. Both are legitimate — a delivered model that needs the
provider's runtime is a real arrangement, and so is a container the client runs
alone — but which one it is decides whether a purchase is a purchase or a
rental wearing a purchase's clothes, and the client is entitled to know before
signing rather than after the provider's service lapses. This specification
does not require self-operability and does not judge a `false`; it requires
that the answer be on the record.

**Absence.** No `rights` clause means nothing about rights was agreed. It MUST
NOT be read as a default licence: an unstated right is not a granted right, the
same way §5.4 treats an unnamed deliverable as one nobody owes. A client
intending to keep and operate an artifact should treat a missing clause as the
negotiation not having happened.

Grade: `recorded`. No runtime can stop a provider reselling something, and a
specification claiming otherwise would be the pretend-enforcement §3 exists to
refuse. What the clause buys is that both parties signed the same sentence
about it, which is what a dispute is read from.

### 5.4.2 Acceptance

"Done" is contested unless it was defined in advance, and it is contested more
here than in ordinary procurement because the work is frequently probabilistic:
two honest parties can disagree about whether an agent's output is good without
either of them lying. §5.4 draws the line that form is machine-judged and
quality is not, and that line is right. `acceptance` is how the parties move a
specific, agreed slice of quality onto the judgeable side, by naming the test
before the work starts.

```json
"acceptance": {
  "test_set": {
    "digest": "sha256:9f2c…",
    "ref": "mesh:artifacts:01J8Z…",
    "withheld": true
  },
  "measure": "invoices correctly flagged as overbilled",
  "threshold": { "min_fraction": 0.95 },
  "deemed_accepted_after_days": 10,
  "grade": "evidence"
}
```

**The test set is committed by digest and MAY be withheld.** This is the part
worth the machinery. A published test set is simultaneously a specification and
a training target: a provider can build to pass exactly those cases and deliver
something that clears the bar and fails on everything else. But a test set the
client keeps entirely private can be swapped after the client has seen the
work, which is the mirror-image cheat. Committing the digest in the signed
document and revealing the bytes at acceptance closes both: the provider cannot
see the cases, and the client cannot change them, because anyone can hash what
was finally produced and compare it to what both parties signed.

`withheld: true` means the bytes are not published at signing and the digest
stands alone until acceptance. `ref` MAY be absent while withheld, and MUST
resolve to bytes matching `digest` when the client asserts a result.

**A result is a statement about work, and declares what it rested on.** An
acceptance result computed from a test set MUST carry that set's digest in
`rests_on` (AgentMesh SPEC.md §5.6, or the equivalent in whatever carries the
result). A result whose test set has since changed is stale, which is a
different fact from wrong, and the distinction matters exactly here: a provider
whose passing result was computed against the agreed bytes has not become a
liar because the client later assembled a different set.

**`deemed_accepted_after_days`** bounds the other failure: a client who simply
never answers. When present, silence past the window is acceptance. When
absent, **silence is not acceptance** — the default refuses to invent an
agreement neither party stated.

Grade: `evidence`. The commitment is in the signed bytes and the result is
exportable, so a dispute is read rather than reconstructed. It is deliberately
NOT `enforced`: running the test is somebody's claim unless a third party both
parties trust runs it, and this specification does not pretend to have one.
What it changes is that the argument is now about a number both sides agreed to
in advance, instead of about the meaning of the word "good".

### 5.5 Price and metering

Every engagement MUST declare exactly one **pricing arrangement**, in the
price clause's `arrangement` field. Three are defined: `fixed_fee`, where work
is priced per task at a published rate (§5.5.1); `time_and_materials`, where
work is priced as a rate schedule over declared meters (§5.5.2); and
`no_charge`, where the provider charges nothing (§5.5.7). There is no
undeclared default. A price clause naming no arrangement is a validation
error, and a runtime MUST refuse an engagement proposal that carries one.

Under `fixed_fee` and `time_and_materials`, every billable unit of work MUST
be rated at the engagement's price and produce a settlement record both
parties hold. A `no_charge` engagement has no billable units: it rates
nothing and produces no settlement record.

Two kinds of amount inside a price are not the provider's own charge, and
both are stated on their own line rather than blended into a total: a
**pass-through line**, which is a cost the provider bought elsewhere and
bills at cost (§5.5.6), and an **operator fee**, which is a cut taken by a
party that stands between the client and the provider (§5.5.8).

#### 5.5.1 Fixed fee

Rates per offering, the settlement currency, and an optional spend ceiling
per period. The price of a task is known before the task runs.

```json
"price": {
  "arrangement": "fixed_fee",
  "currency": "XCR",
  "rates": [
    { "offering": "reconcile-statement", "per_task": 2500000 },
    { "offering": "flag-exceptions",     "per_task": 400000 }
  ],
  "ceiling": { "amount": 40000000, "period": "month" },
  "grade": "enforced"
}
```

Where the clause states a `ceiling`, the ceiling bounds what the client pays
in the period, including any operator fee inside the price (§5.5.8). An
operator fee is not charged on top of the ceiling. The provider's rated work
runs to the ceiling less the fees taken on it, and a task whose price plus
the fee on that price would carry the period's spend past the ceiling is
refused with a quote, which is the refusal this subsection already grades
`enforced`. Nothing else changes. The engagement does not end, the ceiling is
per period, and the refusal lifts when the next period begins.

This is what makes the committed price of a fixed fee engagement a statement
of the client's real exposure. A ceiling that did not bound what the client
is charged would bound nothing, and an Agent Mandate ceiling check
(https://agentmandate.net) performed against it would be testing a number the
buyer does not pay.

Grade: `enforced` for rating and ceilings (work beyond the ceiling is refused
with a quote); `evidence` for settlement records.

#### 5.5.2 Time and materials

Time and materials is expressed as a **rate schedule over declared meters**,
not as hours and parts. Each line of the schedule names a meter, how many of
that meter's counts make one billable unit, the price of one unit, and a
label for the unit that a person reads. The provider's offering declares
which meters it bills; the engagement prices those meters.

```json
"price": {
  "arrangement": "time_and_materials",
  "currency": "XCR",
  "schedule": [
    { "meter": "tokens_out", "per": 1000, "unit": "1000 tokens", "per_unit": 1500 },
    { "meter": "tool_calls", "per": 1,    "unit": "call",        "per_unit": 2000 },
    { "meter": "items",      "per": 1,    "unit": "invoice",     "per_unit": 40000 },
    { "meter": "elapsed",    "per": 60,   "unit": "minute",      "per_unit": 12000 }
  ],
  "cap": { "amount": 40000000 },
  "reservation": { "window_days": 30 },
  "grade": "enforced"
}
```

`per` is the divisor: the number of raw meter counts that make one billable
unit. It is a positive integer and it defaults to 1, so a line that prices a
meter one count at a time may omit it. `unit` is a **label for people** and
carries no arithmetic. A runtime MUST rate on `per` and MUST NOT parse
`unit`; where the two disagree the arithmetic follows `per`, and a renderer
showing a label that contradicts the divisor is showing the buyer a number
the engagement will not charge.

The distinction is not pedantry. Under this arrangement there is no
deliverable to accept (§5.5.5), so the buyer's only protection is that the
meter is honest and independently checkable. A unit of "1000 tokens" that a
machine cannot convert defeats exactly that protection: the buyer can count
tokens from its own records and still not know what it owes. The divisor
puts the conversion inside the signed bytes, where both parties compute the
same charge from the same counts.

A line rates as `floor(count × per_unit / per)`, in integers. The floor is
deliberate and it favours the buyer: a partial unit never charges a partial
unit's money, and two implementations doing integer arithmetic cannot
disagree by one.

Elapsed time is one meter among several, and most offerings will not price
it. The billable inputs of agent work are things like tokens consumed, tool
and API calls made, and items processed; elapsed time earns a line only for
jobs that genuinely run long, such as a crawl or a watch held open for
hours. Billing wall-clock time alone is a poor proxy for what the work cost,
and it pays a slow agent more than a fast one for the same result, which a
provider can arrange deliberately.

A schedule MUST NOT price a meter the offering does not declare, and a
runtime MUST NOT bill a meter the schedule does not price. Both are
validation errors, not defaults to be filled in.

Grade: `enforced` for rating against the schedule and for the cap (§5.5.3);
`evidence` for the metered counts and the settlement records. A meter that
only the provider can count grades `evidence`, never `enforced`, for the
reason §8.2 gives.

#### 5.5.3 The not-to-exceed cap

A time and materials engagement MUST carry a not-to-exceed `cap`. There is no
uncapped time and materials engagement, and a runtime MUST refuse a proposal
that omits the cap.

Two reasons. Uncapped exposure is what destroys an owner's confidence in
delegating spend at all: a rate schedule with no ceiling asks the buyer to
sign an open account. And an authority check needs a single number to test.
For an Agent Mandate ceiling check (https://agentmandate.net), the committed
price of a time and materials engagement **is** the cap, so a per-engagement
or per-month ceiling has something to compare against before formation
rather than after the spending.

The cap is a not-to-exceed number, not a forecast. Metered usage MUST NOT be
billed past it, and units the provider incurs after the cap is reached are
the provider's to bear.

The cap bounds what the client pays, including any operator fee inside the
price (§5.5.8). An operator fee is not charged on top of the cap. The
provider's rated work runs to the cap less the fee taken on it, and reaching
that limit reaches the cap: §5.5.5 applies unchanged, the engagement
concludes `exhausted`, and units past that point are the provider's to bear.
This is what makes the committed price a statement of the client's real
exposure. A not-to-exceed number that did not bound what the client is
charged would bound nothing, and the Agent Mandate ceiling check would be
testing a number the client does not pay. The reservation of §5.5.4 is for
the cap amount and therefore already covers the whole exposure, fee
included.

#### 5.5.4 Reservation and the window

A time and materials engagement MUST carry a `reservation` with a stated
window, `reservation.window_days`, and a runtime MUST refuse a proposal that
omits it. There is no unreserved time and materials engagement, for the same
structural reason there is no uncapped one: the arrangement is a purchase
order, and a purchase order that commits no funds and names no period has no
defined settlement behaviour at all. Nothing says when billing stops, and
nothing says when the client's money comes back.

Funds are **reserved** when the engagement forms, the way a purchase order
commits a budget before any invoice exists. The reservation is for the cap
amount and carries a stated window, `reservation.window_days`. Billing
occurs inside the window against actual metered usage. At the end of the
window the unused remainder is **released** back to the client.

What that implies is worth stating plainly: reserved funds are not available
for other work while they are held. A cap set far above expected usage is not
free. It is money the client cannot spend elsewhere until the window closes.

The window MUST NOT extend beyond `ends_at`. A runtime MUST NOT admit work
under a released reservation; an engagement whose term outlasts its window
needs a new reservation before more work runs.

Grade: `enforced` where clearing supports holds, `evidence` where it does not
and the reservation is a recorded intent only. This is the honesty rule of
§8.2 applied to reservations, and renderers MUST show whichever grade the
deployment has actually earned.

#### 5.5.5 Reaching the cap

Reaching the cap concludes the work. The engagement moves to `exhausted`: no
further requests are admitted, and the provider's runtime refuses them with a
typed refusal naming the cap. A task in flight when the cap is reached also
ends `exhausted`, with whatever artifacts exist attached, billed no further
than the cap.

`exhausted` sits beside `lapsed` and `terminated` in §7.1 as a way an
engagement ends, and it is not a failure. `lapsed` means the term ran out;
`exhausted` means the cap ran out. A runtime MUST NOT record an exhausted
engagement or task as failed.

Time and materials buys best effort, not guaranteed deliverables. There is
therefore no acceptance or rejection of a deliverable under this arrangement,
and the deliverable-form check of §5.4 has nothing to judge where the
engagement names no per-task artifacts. That is a real loss for the buyer and
it should be said rather than papered over: the buyer's protection shifts
from acceptance to the integrity of the meter. For that reason, billed units
SHOULD be ones a buyer can verify independently, such as tokens, calls, or
items processed, rather than self-declared effort.

An engagement that ends `exhausted` is recorded as a fact and is not scored,
the same way terminations are recorded unscored. Buyer reviews (§15) remain
the scoring signal. The rules are at https://agentreputations.com.

#### 5.5.6 Pass-through lines

When a provider bills for something it bought elsewhere, including from
another agent on the mesh, that schedule line MUST be marked
`"pass_through": true`, and every settlement record for the line MUST
reference the upstream receipt that evidences the cost.

```json
{ "meter": "vendor_lookups", "unit": "lookup", "per_unit": 9000,
  "pass_through": true }
```

A pass-through line MUST NOT be priced above the upstream cost. A provider
that wants a margin on resold work prices that work as its own metered line
instead. This is the honest meaning of "materials": at cost, with proof.

The proof is usually free. An agent that hires another agent to do part of
the job has already produced a receipt chain by doing so, because the
upstream engagement settles and issues its own record. The receipt the buyer
is owed is one the provider already holds.

#### 5.5.7 No charge

`no_charge` declares that the provider charges nothing for the work. Every
engagement declares an arrangement, so work done for nothing needs one it can
declare honestly. The alternative is a `fixed_fee` clause with a rate of
zero, which puts the decision in a magic value: a reader cannot tell a price
the provider set deliberately from a price nobody filled in. A declared
`no_charge` arrangement states that the provider chose to charge nothing.

```json
"price": {
  "arrangement": "no_charge",
  "grade": "enforced"
}
```

The clause carries the arrangement and its grade and nothing else. A
`no_charge` price clause MUST NOT carry `currency`, `rates`, `schedule`,
`cap`, `reservation`, `ceiling`, or any other price field. A clause that
carries one is malformed, and a runtime MUST refuse an engagement proposal
that carries one. There is no rate to state, no ceiling to test, and no cap
to reserve against.

Nothing settles. A runtime MUST NOT rate work under a `no_charge`
engagement, MUST NOT draw from the client's balance, MUST NOT produce a
settlement record, and MUST NOT call clearing. A client node MUST refuse a
settlement record that cites a `no_charge` engagement. This is written as a
prohibition rather than left to implementations because the alternative
design produces a settlement record of zero for every task, and those records
carry no information while sitting in both accounts' books beside the records
that do.

Grade: `enforced`. The test is the one §3 asks for: a charge under a
`no_charge` engagement is refused mechanically by the client's node, not
argued about afterwards.

Everything else about the engagement is ordinary. It forms under §12.1,
produces the same task and evidence records, may be amended under §5.8 and
terminated under §5.9, and lapses at `ends_at`. Scope, inputs, deliverables,
volume, term, and confidentiality apply unchanged, and the deliverable-form
check of §5.4 judges its artifacts exactly as it judges paid ones. It may be
reviewed under §15, and those reviews carry the weight any review carries, so
an agent that works for nothing still earns a reputation from the work.

One clause changes effect. The `refund_on_failed_task` posture (§5.10) has
nothing to reverse, because nothing was settled. A failed task is still
recorded as failed and still counts as a failed obligation for §5.9 and §15.
The `none` and `escalate_to_owners` postures are unaffected.

Authority is unaffected. A party MAY carry an `organization` and an approval
record MAY carry a `mandate` (§6.2), and formation or amendment MAY require
person approval (§6.1) where the document says so. An engagement that charges
nothing can still commit a party to scope, confidentiality, and a term, so
the approval rules apply to it exactly as they apply to a priced engagement.
For an Agent Mandate ceiling check (https://agentmandate.net), the committed
price of a `no_charge` engagement is zero and any ceiling covers it; the
powers check is unchanged.

**Amending between arrangements.** An amendment MAY change the arrangement,
under §5.8 like any other clause change: a full replacement at the next
version, signed by both owners. The change is prospective. Work admitted
under the previous version stays priced and evidenced under that version,
which §5.8 already requires by re-deriving settlement instruments at
approval. Amending to `no_charge` does not refund work already billed, and
amending away from `no_charge` does not bill work already delivered for
nothing.

Reservations follow the price clause of the version in force. An amendment
into `time_and_materials` opens a reservation for the new cap at approval,
and a runtime that cannot place that reservation MUST refuse the amendment
rather than admit work against a cap holding no funds (§5.5.4). An amendment
out of `time_and_materials`, to either other arrangement, releases the open
reservation at approval, and the held remainder returns to the client then
rather than at the end of the window it was written for.

#### 5.5.8 Operator fees

An **operator** is a party that stands between the client and the provider
when money moves: it hosts one or both agents, builds the quote, settles the
charge, or does more than one of those. An **operator fee** is the operator's
own charge on the transaction, taken out of what the client pays. It is not
the provider's price, and it is not a cost the provider bought from a
supplier and passed on (§5.5.6).

Wherever a price is quoted or settled, any operator fee inside that price
MUST be disclosed as its own line. The line MUST carry the fee's `amount` in
the settlement currency, the `basis` it was computed from, and the `base` the
basis was applied to.

A `basis` is either a percentage or a fixed charge, and it carries the value
field its `kind` names. A percentage basis is
`{ "kind": "percent", "percent": N }`, a percentage of `base`. A fixed basis
is `{ "kind": "fixed", "fixed": N }`, a charge stated directly in the
settlement currency. A basis MUST carry exactly one value field, the one its
`kind` names, and a client node MUST reject a basis carrying both or neither.

```json
"operator_fee": {
  "operator": "acme-mesh.example",
  "basis": { "kind": "percent", "percent": 10 },
  "base": 2500000,
  "amount": 250000
}
```

```json
"operator_fee": {
  "operator": "acme-mesh.example",
  "basis": { "kind": "fixed", "fixed": 62500 },
  "base": 2500000,
  "amount": 62500
}
```

The shape is the pass-through line of §5.5.6 with a different party taking
the cut. There the party is the provider's supplier and the line is capped at
the upstream cost; here the party is the operator and the line is a margin
the operator is entitled to charge. In both cases a buyer reads one document
and sees every hand that took money out of what it paid.

**The total is the provider's lines plus the fee.** A quoted or settled total
MUST equal the sum of the provider's own lines and the operator fee inside
it, and the total less the fee is the provider's net. This follows from the
line having the shape of a §5.5.6 pass-through line, since a pass-through
line is part of the total, and it is stated outright because it is the one
piece of arithmetic every implementation of this subsection has to agree on.
The fee is not deducted from the provider's price. The provider is paid its
lines and the client pays those lines plus the fee.

`base` is required and it is not decoration. A percentage is not checkable
until the buyer knows what it was applied to, and an operator charging ten
percent of the provider's price and an operator charging ten percent of the
total the buyer pays quote different numbers from the same percentage. A
client node MUST NOT infer the base.

`percent` MUST be a non-negative integer, and a client node MUST reject a
fractional one. A fraction inside signed bytes is a floating point value that
two implementations have to print identically forever, and it makes the
arithmetic check below inexact. An operator whose rate is finer than a whole
percent states the charge that rate produced as a fixed basis against the
same `base`. That discloses strictly more than the percentage would, because
the buyer reads the charge itself instead of multiplying the base out.

`amount` MUST equal the basis applied to `base`, computed by **flooring** to
a whole unit of the settlement currency. Under a percentage basis, `amount`
MUST equal `floor(base × percent / 100)`. Under a fixed basis nothing is
rounded and `amount` MUST equal `basis.fixed`, whatever `base` is. The line
carries no rounding field and an operator states no rounding rule, because
there is no choice left to state.

Flooring is the direction §5.5.2 already applies to usage rating, so money is
computed one way throughout this specification, and the floor favours the
buyer. Because the rule is single and exact, the check it supports is exact.
A client node MUST reject an `amount` that is not the floored figure, and
there is no tolerance for a difference of one unit or of any other size. A
percentage of a base too small to produce one whole unit produces nothing,
and an operator that intends to charge a whole unit there states a fixed
basis of one unit, which discloses the charge as the charge it is.

**The cap and the ceiling bound what the client pays, fee included.** Under
`time_and_materials` the not-to-exceed cap of §5.5.3 bounds the total the
client pays, and the operator fee is part of that total. A runtime MUST NOT
bill the client, over the engagement, a sum of provider lines and operator
fees greater than the cap. The provider's rated work therefore runs to the
cap less the fee taken on it, not to the cap. Reaching that limit is reaching
the cap: the engagement concludes `exhausted` under §5.5.5, a task in flight
ends `exhausted` with whatever artifacts exist attached, and metered units
the provider incurs past that point are the provider's to bear. No new state,
field, or refusal is introduced. The reservation of §5.5.4 is for the cap
amount, so it covers the client's whole exposure, and the number an Agent
Mandate ceiling check tests before formation is the number the client can
actually be charged.

The per-period `ceiling` of §5.5.1 works the same way and for the same
reason. It bounds what the client pays in the period, fee included, the
provider's rated work runs to the ceiling less the fees taken on it, and a
task whose price plus the fee on that price would carry the period's spend
past the ceiling is refused with a quote, which is the refusal §5.5.1 already
grades `enforced`. A bound that did not bound what the client is charged
would bound nothing, whichever arrangement states it.

More than one rated total can satisfy either bound at its boundary. The fee
floors, so a cap of 100 with a ten percent basis is satisfied by a rated
total of 90, and also by 91, whose fee of 9 brings the client's charge to
exactly 100. A client node reading a settlement record cannot distinguish the
two, because both leave the total inside the bound, both close
arithmetically, and nothing obliges a provider to bill everything a bound
admits. Which of them a runtime bills is therefore an agreement between
implementations rather than a requirement of this specification, and two
implementers who both read this subsection correctly can differ by a unit at
the boundary. A conformance suite is where that is settled.

A `no_charge` engagement rates nothing and produces no settlement record
(§5.5.7), so it has no total for a fee to sit inside and carries no operator
fee line.

**Disclosure binds at two moments, and both are required.**

1. **In the quote, before commitment.** A quote MUST carry the operator fee
   line beside the total, so that the client knows what it is agreeing to
   before it agrees. A quote that states a total and carries no operator fee
   line asserts that no operator fee is inside that total.
2. **In the settlement record, afterwards.** Every settlement record for a
   charge that carried an operator fee MUST carry the same line, with the
   amount actually taken and the basis it was computed from, so that the
   arithmetic is checkable after the fact. A settlement record MUST NOT state
   a total that its own lines do not account for.

A client node reading a settlement record MUST check four things: that an
operator fee line is present where the quote carried one; that the record
discloses no operator fee where the quote carried none; that the line's
`amount` follows from its `basis` and `base`; and that the record's total
accounts for every line the record carries. A record failing any of those
checks is a **disputed settlement**, and on one the client node:

- MUST NOT record the charge as settled in its own evidence chain, and MUST
  record the discrepancy instead, holding both the quote and the record it
  compared;
- MUST raise the discrepancy under the engagement's dispute clause (§5.10),
  where it counts as a failed obligation for §5.9 and §5.10;
- MUST NOT repair the record by supplying the missing line or recomputing the
  total, because a record the client rewrote is no longer evidence of what
  the operator claimed;
- MAY continue to admit work under the engagement, since one settlement
  discrepancy is not by itself grounds to stop the work, and SHOULD refuse
  further work under the same operator after a second disputed settlement.

The second check is the mirror of the first. A quote that states a total and
carries no operator fee line asserts that no operator fee is inside that
total, so a record disclosing one contradicts the quote as directly as a
record omitting a line the quote carried. A client node that checked only for
the omission would enforce the quote's assertion in one direction. A client
node that names the failure in its own record SHOULD name the check that
failed: `operator_fee_missing`, `operator_fee_undisclosed`,
`operator_fee_arithmetic`, or `total_unaccounted`.

A settlement record carrying no operator fee line, against a quote that
carried none, is well formed. The absence is an assertion, and it is that
assertion §5.10 tests if it later proves false.

**What disclosure reveals.** Disclosing the operator's fee reveals what the
provider receives, because the total minus the disclosed fee is the
provider's net. There is no version of this rule that discloses the
operator's cut and conceals the provider's net, and an implementer should not
have to work that out alone after building to it. This specification accepts
the trade deliberately, for three reasons.

The buyer is the party with the least information and the most at stake, and
a total that silently contains a third party's margin is a total the buyer
cannot check against anything. Concealment also protects less than it
appears to: an operator that publishes its fee schedule at all has already
made the rate public, and a buyer who reads a quoted total can invert it. In
the deployment this specification was developed alongside, the operator's
markup percentage is served without authentication and the price quoted to a
caller is the retail total, so the provider's net was already recoverable by
arithmetic before this rule existed. What concealment bought was not privacy.
It was the buyer's inability to know the fee was there at all. And every
other document in this family holds that a document says what it means. A
price clause naming a total whose composition it declines to state fails that
standard in the one place it matters most.

A provider unwilling to have its net readable by its clients cannot sell
through an operator that takes a disclosed fee. The remedy is to change the
arrangement, by selling directly or by pricing the work at a total it will
stand behind. The remedy is not to omit the line.

Grade: `enforced` where the operator builds the quote and settles the charge.
Both ends are required. The operator constructs the line at each of them, and
the party the line protects can check it from bytes it already holds, so a
violation produces a mechanical refusal by the client's node rather than a
grievance. Presence and arithmetic are what is enforced.

Grade: `evidence` for the basis itself. A client node can verify that the
disclosed percentage was applied to the disclosed base. It cannot verify that
the disclosed percentage is the rate the operator actually agreed with the
provider, because the client is not party to that agreement. The signed quote
and the signed settlement record are what a dispute is read from.

Grade: `recorded` where a price is quoted and settled peer to peer with no
operator in the path of either. Nothing there refuses an omission. A quote
carrying no operator fee line asserts that no operator fee is inside it, and
where no third party constructed the quote there is no second record to test
that assertion against. A client node can still check that a disclosed line's
arithmetic closes, and MUST, but it cannot detect a line that was never
written. Breach is establishable only outside the system and answerable to
reputation, which is what `recorded` means in §3. Grading the peer-to-peer
case `enforced` would be exactly the laundering of trust as enforcement that
§8.2 forbids.

Grade: `recorded` where an operator is in the path at one end only, having
built the quote without settling the charge, or settled a charge whose quote
it did not build. `enforced` compares a settlement record against the quote
it followed, and an operator that constructed only one of those two documents
left the other to a party under no obligation to write the line. The omission
this subsection exists to catch is still available at that end, and nothing
in the path can refuse it, so an operator at one end only earns the same
grade as no operator at all.

### 5.6 Volume

How much work the client may submit, expressed in at most two windows,
`per_hour` and `per_day`. Engagement volume limits replace the provider
node's general per-stranger limits for this client only. Excess traffic MUST
be refused with a retry time, not held.

```json
"volume": { "per_hour": 2, "per_day": 8, "grade": "enforced" }
```

Grade: `enforced`, at the provider's admission gate, with counters that
survive restarts.

### 5.7 Term and renewal

The start and end of an engagement are **first-order document fields**,
`starts_at` and `ends_at` (§4.2), not fields buried inside a clause. They
answer the activation question directly: a countersigned document has no
force before `starts_at`. Between countersigning and the start instant the
engagement is `agreed`, and neither runtime applies its grants or limits
until the start instant arrives.

Engagements MUST NOT renew automatically. After `ends_at` the engagement
lapses: its grants and limits stop applying and the client reverts to
whatever the provider's general admission policy says. Renewal is an
amendment under §5.8, which may set a new `ends_at`.

An engagement may also end before `ends_at`: by termination (§5.9), or by
reaching its cap under a time and materials arrangement (§5.5.5).

Grade: `enforced`. Both instants are inside the signed bytes; the gate
simply does not apply the engagement outside them.

### 5.8 Change control

Either owner MAY propose an amendment: a **full replacement document** with
`version` incremented by exactly one over the highest agreed version. A
replacement, not a delta, so the signatures always cover the whole of what
governs and there is never a question of what the merged state is. The
parties and the original `starts_at` are fixed; everything else, including
`ends_at` (renewal is just an amendment that extends it), may change.

A proposed amendment carries one signature: the proposing seat's, over the
full replacement bytes (§6). It is a **change request**, and it has no force.
The engagement continues under the current agreed version while the proposal
is open. At most one amendment proposal may be open on an engagement at a
time.

The counterparty resolves it one of four ways:

- **Approval**: the counterparty countersigns the proposed bytes exactly,
  under the approval authority the document states (§6.1). The amendment
  becomes the agreed document; the superseded version remains on record.
  Where the amendment moves price or scope, any settlement instrument
  derived from the engagement MUST be re-derived at approval, so work
  admitted under the old version stays evidenced and priced under the old
  version.
- **Denial**: a signed refusal that MUST carry a reason. An unreasoned
  denial is not a denial; runtimes MUST refuse to record one. The current
  version continues in force.
- **Counter-proposal**: there are no partial approvals. Accepting the scope
  change but not the price change is not an approval of anything; it is a
  different amendment, proposed back the other way after this one is denied
  or withdrawn.
- **Silence**: an unresolved proposal lapses after `review_window_days`.
  Lapse is recorded, and the current version continues in force.

The proposer MAY withdraw an open proposal before it is resolved; withdrawal
is recorded like the other outcomes.

```json
"change_control": {
  "review_window_days": 7,
  "approval": { "formation": "agent", "amendment": "person" },
  "grade": "enforced"
}
```

Grade: `enforced` by the signing rule itself: a runtime MUST NOT apply a
version its own owner has not signed.

### 5.9 Termination

Either owner may terminate: for convenience with the stated notice (in-flight
tasks complete and are paid), or immediately for cause (in-flight tasks are
canceled with a recorded reason). Termination takes effect at the next
message.

```json
"termination": { "convenience_notice_hours": 24, "grade": "enforced" }
```

### 5.10 Disputes

Exactly one posture, chosen from a closed set:

- `none`: settlements are final; disagreement ends the engagement at most.
- `refund_on_failed_task`: a task that fails, including failure by the
  deliverable-form rule of §5.4, is refunded in full through clearing. The
  machine's completion check decides; no quality argument is required.
- `escalate_to_owners`: the owners read the signed record together and settle
  it as people.
- `arbiter`: both parties bind, in this document, an independent agent
  holding the `role-arbiter` contract
  (https://agentroles.ai/arbiter.html) whose verdict on the disputed
  amount both commit in advance to accept.

```json
"disputes": { "posture": "refund_on_failed_task", "grade": "evidence" }
```

Grade: `evidence` for the record (signed task history, exportable audit
trail, settlement receipts); the refund action itself is `enforced` only
where clearing supports reversal (§8.2). Quality judgment is out of scope for
this RUNTIME and always will be: no machine here judges whether work was
good. The `arbiter` posture does not change that; it names who judges, and
what the machinery enforces is only what is mechanical about the naming and
the outcome.

#### 5.10.1 The arbiter posture

The forum is an agent, referenced abstractly by role, because the role is a
published contract any conforming agent can hold, and because the record an
arbiter judges from was built for machine verification: signed documents,
tamper-evident chains, declared inputs, reports that arrived or measurably
did not. The role's own contract requires verification before judgment,
checkable independence, and a bounded verdict; this clause carries what the
parties choose about it.

```json
"disputes": {
  "posture": "arbiter",
  "arbiter": {
    "role": "role-arbiter",
    "agent": "<arbiter agent public key, when bound at formation>",
    "independence_days": 90,
    "deadline_days": 14,
    "fee": "split",
    "fallback": "escalate_to_owners"
  },
  "grade": "evidence"
}
```

- `role` is REQUIRED and names the published role contract the serving agent
  must hold. `agent` is OPTIONAL: bound at formation, both parties signed
  over the specific judge; absent, the parties appoint one when a dispute
  opens, both countersigning the appointment, and failing to appoint within
  `deadline_days` the `fallback` governs.
- `independence_days` is the window for the role's independence rule: the
  arbiter must share no owner with either party and have held no engagement
  with either inside the window. Both are facts a runtime checks, at binding
  and again at verdict.
- `deadline_days` runs from the dispute's opening. A verdict not produced
  inside it is a refusal by silence, the `fallback` governs, and a late
  verdict is void: the role's own contract says a late verdict is not a
  verdict.
- `fee` is `split` (the parties bear the arbiter's price equally) or
  `follows_finding` (each party bears it in proportion to the split found
  against them). The arbiter's price is its own business, declared like any
  offering's.
- `fallback` is one of the OTHER three postures, and MUST NOT be `arbiter`.
  Every arbiter clause states one, because an arbiter can decline, conflict
  out, or fall silent, and a dispute with no working forum must land
  somewhere the parties already agreed to.

The verdict is the role's signed document (tag `agent-arbiter-verdict-v1`):
a split of the disputed amount summing to it exactly, an attribution from
the failure vocabulary, and a hashed basis either party can recompute.
Where clearing honors this clause, executing the split is `enforced`: money
moves on a signature the platform verifies mechanically, even though the
judgment inside it is nobody's to enforce. The verdict and its basis are
`evidence`. Nothing about the arbiter's wisdom is graded at all; that lives
in its own reviews and record, which is what the parties read before naming
it.

#### 5.10.2 What a dispute freezes

Whatever the posture, the money rules are the same, and they exist so a
reservation cannot be held hostage:

1. A dispute is opened against a stated **disputed amount**, no larger than
   what remains unsettled under the engagement, and MUST cite the acceptance
   act (§5.4.2 rejection with reasons) or settlement record it contests.
2. Opening a dispute freezes ONLY the disputed amount. Everything else
   settles and releases under the ordinary rules; work already accepted is
   not re-opened by disputing later work.
3. Silence releases: §5.4.2 already makes silence past a stated acceptance
   window acceptance, and a party that let the window pass cannot then open
   a dispute over form it never rejected.
4. A dispute concluded by verdict, refund, or the owners' recorded
   settlement unfreezes per the outcome. A dispute that reaches no
   conclusion by the posture's own deadline resolves by the posture's
   fallback, and `none`'s fallback is release: finality was the posture both
   parties chose.

Freezing and release are `enforced` where clearing holds the reservation;
the citations and records are `evidence`.

### 5.11 Confidentiality and retention

The canonical split clause. Sub-clauses are graded separately and MUST NOT be
merged:

```json
"confidentiality": {
  "transport": { "sealed": true, "grade": "enforced" },
  "retention": { "max_days": 30, "grade": "enforced" },
  "processors": [
    { "service": "Anthropic API", "domain": "anthropic.com",
      "purpose": "model inference, zero-retention tier" }
  ],
  "promises":  { "no_training": true, "no_third_party_sharing": true,
                 "no_human_reading": true, "grade": "recorded" }
}
```

Sealed transport and retention windows are runtime-checkable. What a party
does with data inside its own walls is not; those promises are `recorded`,
and a conforming renderer MUST NOT present them as enforced.

**`processors` names the services the client's content passes through so the
work can happen**: the model API behind the agent, a transcription service,
any host that can read what it holds. Each entry carries `service` (REQUIRED),
`domain` so a reader knows which service of that name is meant, and `purpose`,
the narrowest true statement of what it is used for. The list is what makes
the promises honest for the way agents are actually built. Nearly every agent
sends content to somebody's model API, so `no_third_party_sharing` quantifies
over everything EXCEPT the declared processors: it is the promise that content
goes nowhere beyond this list, not the fiction that it goes nowhere at all.
Content transiting an undeclared service breaks the clause even while every
promise boolean is true. Declaring a processor is neither endorsement nor a
transfer of obligation; what a processor does is governed by its own terms,
and the client is owed the name so it can go read them.

**Absence carries the weak meaning throughout.** A promise left out of
`promises` is a promise not made, and a reader MUST NOT infer it. An empty
`processors` list is itself a statement: content leaves the provider for
nowhere. Omitting the member entirely states nothing, and a reader MUST NOT
mistake silence for either answer.

Like reporting (§5.12), this clause casts a pre-admission shadow. A provider
MAY advertise the confidentiality terms it is prepared to bind (the promises,
the retention ceiling, the processor list) on a storefront or listing,
self-declared and graded `recorded` there, so a client can compare providers
before anything forms. The comparison is deterministic without anyone reading
prose: every required promise must be declared, a declared retention window
must be no longer than the required ceiling, and every declared processor must
be acceptable to the requirement. What binds is this clause; where an
advertisement and the signed document disagree, the signed document wins.

### 5.12 Reporting

Work that runs for a day, or a month, is work the client cannot see. Everything
else in this specification reports at the end of something: a task completes or
fails, an engagement lapses or is terminated, a review is written afterwards.
All of it arrives when it is already too late to act. `reporting` is the clause
that says what arrives while there is still time.

```json
"reporting": {
  "level": "check_ins",
  "every": "P1W",
  "additions": ["a named contact for anything blocking"],
  "grade": "evidence"
}
```

**Three levels, ordered, and the order is the point.**

| Level | What the provider owes |
|---|---|
| `records_only` | Nothing beyond the mechanical record: task states, deliveries, spend. The honest default for short or cheap work. |
| `on_change` | A report whenever the expectation moves: the projection slips, the work is blocked, a risk appears or clears. No calendar. |
| `check_ins` | The above, plus a report on a cadence, carrying evidence of movement, spend against the cap, and any open risks. |

They are ordinal so that two parties can be compared without reading two
paragraphs, and so that "does this meet what was asked for" is an integer
comparison rather than an argument. A provider offering `check_ins` against a
requirement of `on_change` has exceeded it, not violated it: the test is **meets
or exceeds**, never equals.

**Why a calendar exists at all, given `on_change`.** An agent that is quietly
stuck reports nothing under a change-triggered rule, because from where it
stands nothing has changed: its expectation is stable and wrong. Silent
non-progress is the characteristic failure of long-running work, and it is
exactly the one an event-driven scheme cannot see. Hence `check_ins`.

**Why a check-in is not a ping.** If a periodic report were a state word, a
stuck provider would emit "on track" forever and the clause would be a liveness
probe with extra syllables. A `check_ins` report MUST carry what was completed
since the previous one, what remains, and what it is waiting on. A provider
with nothing to point at cannot produce that convincingly, which is what makes
absence of progress legible without anyone having to detect it.

**Cadence follows the money, not the calendar.** Where the engagement has a cap
(section 5.5), `every` SHOULD be shorter than the time in which the provider
could spend what remains of it. Weekly check-ins on an engagement whose whole
cap can burn in a day are decoration: the money is gone before the second
report. Where there is no cap there is no burn to derive anything from, and
`every` is simply what the parties agreed. Stated as SHOULD because the
derivation rests on a spend rate neither party knows exactly in advance; a
runtime MAY warn when a declared cadence fails the test, and MUST NOT refuse
the engagement over it.

**Risk is contents, not a fourth level.** A client who wants risk reporting
wants check-ins too, and splitting one want across two clauses is how a clause
goes unfilled. At `check_ins`, an open risk MUST name what would dissolve it,
an input, a decision, a limit lifted, because a risk with no remedy is anxiety
rather than information. Risks reuse the failure-attribution vocabulary rather
than inventing a second one, so a risk that materializes becomes the failure it
predicted, attributed the same way, instead of two unreconciled records of one
event.

**Raising a risk is the point of the clause.** A risk raised, recorded and
unanswered moves responsibility, in the open, before the money is spent. That
is the only reason a provider will file honest risks rather than flattering
ones, and it is why this clause is worth more than the status half everyone
asks for first.

**A missed report is a missed obligation**, detected the way section 5.4's
interim deliverables are: both runtimes MUST detect and record a report that
did not arrive within its cadence, and a miss counts for sections 5.9 and 5.10.
No new machinery. A scheduled thing that did not happen is a shape this
specification already has, and a second mechanism for it would be a second
thing to drift.

**How it gets written.** Nothing here requires a form. A party MAY write what
it wants in prose and derive the structured clause from it, and SHOULD show the
derivation back before signing. The rule that matters is that **the declaring
party owns its own structure**: a provider declares the level it offers, a
client declares the level it requires, and neither party's derivation is ever
applied to the other's words. Comparison is over two declared fields. Nothing
that refuses, gates or grades may rest on one party's reading of the other's
prose.

Grade: `evidence`. The cadence and contents are in the signed document, reports
are exportable, and a miss is recorded, so a dispute is read rather than
remembered. Not `enforced`: no runtime can make a provider look honestly at its
own work, and a report's content is a claim like any other. What is mechanical
is whether it arrived.

**Scope.** This clause is about the engagement. A single long-running task
reports progress through the task's own updates in the transport, which is a
different object on a different clock, and this specification does not oblige
one. An engagement's check-ins and a task's progress answer different
questions, and conflating them produces either a chatty engagement or a silent
task.

## 6. Signatures

Owners sign, not agents: an engagement binds principals to obligations that
outlive any one process.

The signed bytes are the ASCII prefix `agent-sow-v1` followed by one newline,
followed by the JCS canonical JSON of the document with the `signatures`
array removed. Each signature record carries the signer's key, role, and
timestamp:

```json
"signatures": [
  { "role": "provider", "key": "<owner public key>",
    "signed_at": "2026-08-04T14:02:11Z", "sig": "<base64>" },
  { "role": "client", "key": "<owner public key>",
    "signed_at": "2026-08-04T16:47:36Z", "sig": "<base64>" }
]
```

A document is **agreed** when both roles have valid signatures over the same
canonical bytes, and **active** once `starts_at` arrives. Each party's node
holds the countersigned copy and enforces from its own copy. There is no
central contract store to trust or to lose.

"Over the same canonical bytes" carries more weight than it looks like it
does. A standing proposal's provider signature covers the template bytes,
with the client seat blank and the start instant null. The moment a client
countersigns, those fields fill in and the bytes change, so the provider's
template signature does not cover the agreed instance. Formation therefore
always ends with a fresh provider signature over the completed document
(§12.1). A pre-signature authenticates the offer; it does not pre-authorize
every formation.

### 6.1 Approval authority

A signature proves control of a key. It does not prove who exercised that
control: a person at a terminal and an autonomous agent with access to the
same key produce identical bytes. For acts that bind a party (the client's
countersign at formation, and either seat's approval of an amendment), the
document states what kind of actor the counterparty is entitled to expect
behind the signature. Three values:

- `agent`: a valid signature by the seat's key suffices. The owner is bound
  by whatever holds the key, which may be unattended software. This is the
  honest name for what an unadorned signature already means.
- `person`: the approval must additionally be confirmed by the account's
  human through a person-grade ceremony. On a platform that completes
  formation server-side, this is enforceable, not aspirational: the runtime
  holds the approval pending until the human confirms with a credential that
  attests user presence and verification (for example a WebAuthn passkey
  ceremony), and the confirmation is recorded beside the signature. A
  pending approval that is never confirmed lapses with the review window.
- `agent_then_person`: both artifacts on the record: the agent's signature
  first (proving key control and intent), the person's confirmation second
  (proving presence). Operationally this is `person` with the agent's
  signature explicitly required to come first; documents that want both
  fingerprints say so with this value.

The declaration lives in the `change_control` clause, one value for
formation and one for amendments:

```json
"approval": { "formation": "agent", "amendment": "person" }
```

Defaults when unstated: formation is `agent` (a published offer at a
published price is a bounded commitment, and requiring a ceremony for every
formation would tax the zero-ceremony principle of §10); amendments default
to `person` (a change to a live engagement is exactly where an
auto-approving agent is a standing target, and a human in the loop is worth
the ceremony).

Honesty bounds the claim: a person-grade ceremony proves that a verified
human was present and confirmed. It does not prove they read the document or
understood it. Runtimes MUST NOT present `person` approval as anything more
than presence and verification, and where formation does not complete on a
platform that can hold it pending, the `person` value grades `evidence`
(the confirmation record exists) rather than `enforced`.

### 6.2 Organizational authority

Two optional fields let a document carry organizational authority, per
section 7 of the Agent Mandate specification (https://agentmandate.net):

- A party MAY carry `"organization": "org_..."` beside its `owner`, naming
  the organization on whose behalf that seat engages.
- An approval record MAY carry `"mandate": "mnd_..."`, naming the mandate
  under which the approving person acted.

Both fields sit inside the signed bytes, so neither can be added, removed, or
altered after signing without breaking the signature. Both are additive: a
document that omits them is conformant, and nothing here changes how
signatures are computed or verified.

What they buy is one step past §6.1. A person-grade approval proves that a
verified human was present and confirmed. With a mandate reference beside it,
the counterparty can also see that the human held current, sufficient,
traceable authority to bind the organization: a mandate that had started and
had not expired or been revoked, whose powers covered the act, whose ceilings
covered the committed price, and whose chain runs up to the organization's
charter. The claim stops there. What a court would say about the
organization's obligation remains outside this system, and a runtime MUST NOT
present a mandate reference as a legal opinion.

A runtime that does not perform the checks of Agent Mandate section 7 MUST
NOT present a document carrying these fields as mandate-verified. The
reference is then `evidence` that a mandate was cited, not `enforced`
authority. Where the platform does perform the check and refuses acts that
fail it, the grade is `enforced`.

## 7. Lifecycle

### 7.1 Document states

The document states, by signature count and time:

```
template SoW          no signatures; no force. Sent to a specific
                      counterparty for consideration, it is a SoW proposal.
standing proposal SoW seller's signature only, counterparty blank;
                      published, waiting for a qualified countersign (§12)
directed standing     seller's signature only, naming the one party
proposal              entitled to countersign; not publicly listed; spent
                      by the formation it completes, and it lapses (§12.1.1)
agreed                both signatures, before starts_at; no force yet
active                both signatures, starts_at reached; the runtimes
                      enforce it
  → amendment proposed  a full replacement vN+1 with one signature is open
                      (§5.8); no force; the current version governs until
                      it is approved, denied, withdrawn, or lapses
  → amended           replaced by a higher version with both signatures
  → exhausted         the not-to-exceed cap was reached (§5.5.5); admission
                      and billing stop, and the engagement ends
  → lapsed            ends_at passed
  → terminated        ended by either owner (§5.9)
```

A document with one signature, whoever signed it, has no force. Runtimes
MUST treat lapse, exhaustion, and termination identically at the gate: the
counterparty reverts to general admission policy. Nothing breaks and nothing
lingers.

### 7.2 The working lifecycle

The document states above describe the paper. The engagement itself moves
through a working lifecycle with two optional bookends around the delivery
the parties came for:

```
validate   (§13)  before signatures: probe the fit, walk away for free
agree      (§7.1) countersign; formation completes per §12.1
deliver           tasks run; checkpoints accumulate; problems are raised
                  and resolved in place (§14)
review     (§15)  at completion: acceptance or rejection, with reasons,
                  on the record
```

Validation and review are OPTIONAL stages. What is not optional, for a
conforming runtime, is honesty about them: an engagement that skipped
validation has no probe record to cite, an engagement that was never
reviewed has no acceptance to advertise, and neither absence may be dressed
up as its presence.

## 8. Enforcement obligations and the asymmetry

### 8.1 Who enforces what

Clauses that protect the provider (scope, volume, price ceilings) are
enforced at the provider's own node, which is also the party they protect.
This is trustworthy: a node guarding its own interests has every incentive to
enforce honestly.

### 8.2 The buyer-side gap

Clauses that protect the client (deliverable form, refunds) are checked by
software the provider runs. A provider checking its own homework is trust,
not enforcement. Therefore:

1. The client's node MUST independently verify deliverable form on receipt
   and record the verdict in its own evidence chain.
2. The `refund_on_failed_task` posture MUST NOT be graded `enforced` unless
   settlement runs through a clearing function that will execute a reversal
   on presentation of the signed failure evidence, without the provider's
   cooperation.
3. Where no such clearing exists, conforming documents grade the refund
   clause `evidence`, and renderers show it that way. This is the honest
   state of most deployments today.

Time and materials is a second instance of the same problem. The units billed
are counted by the provider's runtime, which is the party they pay. A meter
MUST NOT be graded `enforced` unless the client's node can count the same
units from its own records; meters the client cannot independently count are
`evidence` at best. This is why §5.5.5 prefers units a buyer can verify,
tokens and calls and items, over self-declared effort, and why the cap is
mandatory: the cap is the one number the client's own node can enforce
without trusting the count.

The operator fee (§5.5.8) is a third instance, with the gap in a narrower
place. The client's node can check that the disclosed fee follows from its
disclosed basis and base, and that check is genuine enforcement because it
runs on bytes the client holds. It cannot check that the disclosed basis is
the rate the operator actually agreed with the provider, because the client
is not party to that agreement, and it cannot detect a fee that was never
disclosed where no operator built the quote. Those two facts are why §5.5.8
grades the basis `evidence`, and grades `recorded` every case where one
operator did not both build the quote and settle the charge, rather than
extending `enforced` over the whole subsection.

This section exists so the specification cannot be used to launder trust as
enforcement. The asymmetry is real; naming it is the fix available now, and
neutral clearing is the fix available next.

## 9. Precedence

Where an engagement and a node's general policy both speak, for traffic from
the engagement's counterparty, during the term, **the engagement wins on
everything it addresses** (scope, volume, price), and the node's general
policy governs everything it does not. One exception: a node-local explicit
block of the counterparty's key always wins, because the local owner's last
word on safety cannot be signed away.

## 10. Security considerations

- **Key change**: an engagement names agent keys. A handle re-homed to a new
  key MUST NOT inherit the engagement without both owners' confirmation.
- **Replay and staleness**: signatures cover a versioned document; runtimes
  MUST reject a lower version than the highest countersigned version they
  hold.
- **Ceremony fatigue**: implementations SHOULD keep a zero-ceremony path.
  Casual traffic must never require an engagement; an SoW is for money and
  commitments, not a toll on saying hello.
- **Legal standing**: a signed document naming parties, work, and payment may
  constitute a contract in some jurisdictions regardless of what this
  specification calls it. Deployments SHOULD make their intended legal
  status explicit to their users. This specification takes no position.

## 11. Relationship to other work

The task lifecycle and artifact model align with the A2A protocol's Task and
AgentCard: `input_required` is A2A's mid-task discovery of missing inputs,
turned into an up-front declared clause; declared media types per skill
become declared media types per deliverable; skill examples become scope
examples. The AgentMesh protocol provides a reference enforcement
environment: signed envelopes, admission gates, metering, sealed transport,
tamper-evident audit chains, and a clearing service. Other runtimes can
conform by meeting the obligations in §3 and §8 with their own machinery.

## 12. Standing proposals and derived listings

### 12.1 The standing proposal

A **standing proposal SoW** is a template the selling owner has signed with
the counterparty left blank: every clause complete, the deal open. It is the
document a provider maintains once per offering rather than negotiating per
client.

A standing proposal MUST only name offerings the provider's agent actually
publishes in its own capability manifest. A clause that references a
capability the agent does not carry is a validation error, not an offer.

**Formation.** A client's countersign of a standing proposal is a request to
form, not formation itself. It produces the completed instance: client seat
filled, `starts_at` set, the client's signature over those bytes. The
provider's runtime then completes formation by adding the provider instance
signature (§6), and only the fully signed instance is `agreed`. Where the
offer's approval authority for formation is `person` or `agent_then_person`
(§6.1), completion additionally waits for the client account's human
confirmation, and an unconfirmed request to form lapses with the review
window.

That completion step is a gate, and the rules that keep it a gate rather
than a veto:

1. A standing proposal MAY state **qualifications**: conditions a
   counterparty must meet for its countersign to be accepted. A passed
   validation probe (§13) is an admissible qualification; so are account
   standing and capability requirements. Qualifications live in the signed
   document, where a prospective client reads them before spending anything.
2. The provider's runtime MUST complete formation for a counterparty that
   meets the stated qualifications, and MUST refuse formation for one that
   does not, naming the unmet qualification in a typed refusal.
3. Refusing a counterparty for a reason the document does not state is
   itself an event the runtime MUST record. A published offer that gets
   silently vetoed on unstated grounds is not a standing offer, and
   reputation systems read these records.
4. A qualification the counterparty asserts about itself, and that no
   runtime can check, is `evidence`. It MUST NOT be graded or rendered as
   `enforced`. What the runtime can do is refuse a countersign that omits
   the assertion, and hold the signed assertion afterwards; the record is
   evidence that the party asserted the thing, not proof that the thing is
   true. Jurisdiction of establishment and sanctions status are exactly
   this case, and they are the two a seller is most likely to grade wrong.
   §3 rule 1 already forbids grading a refusal a runtime does not perform.

A qualification does not discharge an obligation that belongs to the
operator. Where an operator is merchant of record (§5.5.8), sanctions
screening, customer identification, and tax status are that operator's
obligations to the authorities that impose them, and a seller's document
cannot satisfy them by stating a condition and a buyer cannot satisfy them
by asserting it is met. Those checks belong at account admission, before a
party can transact at all, and at settlement, where the money moves. A
standing proposal MUST NOT be written as though a qualification performed
them, and a runtime MUST NOT treat a met qualification as a completed
screen.

Withdrawing the standing proposal remains the provider's remedy when the
offer itself is wrong: prospective only, archived, and it withdraws the
offer from everyone rather than one party. On a directed proposal (§12.1.1),
everyone is the one party the offer names.

#### 12.1.1 The named counterparty

A standing proposal MAY name the one party entitled to countersign it. A
proposal that does is a **directed standing proposal**: an offer to that
party, not to the market.

The name sits in the parties clause, beside the seats rather than in one,
and it is singly graded as §4.2 requires of a clause that splits across
grades:

```json
"parties": {
  "provider": { "agent": "<public key>", "handle": "Granite.books@stonework.example",
                "owner": "Stonework Analytics" },
  "client": null,
  "offered_to": { "agent": "<public key>",
                  "handle": "Petrel.mari@harborandline.example",
                  "owner": "Harbor & Line Outfitters",
                  "expires_at": "2026-09-20T00:00:00Z",
                  "grade": "enforced" },
  "grade": "evidence"
}
```

`offered_to` names exactly one party, and a document naming more than one is
a validation error a runtime MUST refuse. A list of permitted signers is an
access control list rather than an offer, and it admits a race formation has
no rule for: two named parties countersign the same bytes, and only one of
them can form.

Naming a counterparty does not fill the client seat. The seat stays blank,
`starts_at` stays null, and formation remains the two-step gate above: the
countersign is a request to form, and the provider's runtime completes
formation with a fresh signature over the completed bytes. §6 is unchanged,
and so is the reason it gives, that a pre-signature authenticates the offer
without pre-authorizing every formation.

`offered_to` is inside the signed bytes, because the signed bytes are the
canonical document less `signatures` (§6). The restriction is therefore a
term of the offer the selling owner signed, and it cannot be added, removed,
or altered afterwards without breaking that signature. It is not a policy a
platform lays over a document that does not carry it. A platform that wants
the restriction MUST put it in the bytes before the provider signs, and a
platform that adds it afterwards has produced a document whose signature
does not verify.

Only the named party may countersign, and the test is against the filled
seat. A runtime completing formation MUST refuse unless the completed
instance's `parties.client.agent` equals `offered_to.agent`, and the refusal
MUST be typed and MUST name the restriction. The match is on the agent key.
`handle` and `owner` are labels for people, and §5.1's rule about a handle
whose underlying key has changed applies here for the same reason: a handle
pointed at a new key names a different party.

What binds the signature on the client seat to the party that seat names is
not narrowed here. It is the binding formation already relies on for every
standing proposal: §5.1 grades the parties clause `evidence` and leaves
identity verification to the transport. A deployment whose transport does
not verify the countersigning party's identity gains nothing from
`offered_to` and MUST NOT grade it `enforced`.

A directed proposal is spent by the formation it completes. An open standing
proposal is not consumed by being countersigned, and one document forms as
many engagements as it draws counterparties; a directed proposal is one
offer to one party, and a runtime MUST refuse a second formation under the
same directed document.

Directedness MUST NOT be expressed as a qualification. Qualifications are
conditions a runtime tests about a counterparty; who the offer is for is a
fact about the offer, and a surface deciding whether it may list a document
has to read that fact without interpreting prose.

**Lapse.** A directed offer does not outlive its occasion. It ends, and a
runtime MUST refuse formation under it, at the first of:

1. `offered_to.expires_at`, where the offer states one.
2. The close of the occasion the offer names, where it names one outside
   this specification. A response to a solicitation is the case this was
   written for: the offer answers a particular ask, and the specification
   that defines the ask states when the ask closes. Agent RFP
   (https://agentrfp.net) is one such specification. A runtime that does
   not understand the occasion a document names MUST refuse formation
   rather than read the offer as unbounded. That is less of a burden than
   it sounds: the runtime that completes formation is the provider's own,
   and a provider that offered against an occasion knows what the occasion
   was.
3. Withdrawal by the provider, which on a directed proposal reaches its
   whole audience.
4. The formation it completes, per the rule above.

A directed proposal bounded by neither an `expires_at` nor a named occasion
is a validation error, and a runtime MUST refuse formation under one. An
offer to one party with no end is an open account of a different kind: the
named party holds it and countersigns, months later, a price the provider
set for a market that has moved.

A lapsed directed proposal stays readable. It is the record of an offer that
was made, and §12.1 rule 3 already makes what happens at this gate a fact
reputation systems read. What a surface MUST NOT do is present a lapsed
offer as open.

**What a surface may do with it.** §12.2 requires that a public listing be
derived from a standing proposal. It does not follow that every standing
proposal yields a listing, and a directed one yields none.

- A catalog, marketplace, directory, or board MUST NOT derive a public
  listing from a directed standing proposal, and MUST NOT contribute its
  scope examples to a public index. §12.2 makes the `in_scope` examples the
  listing's representative queries, and a document only one party may form
  has no business answering the market's searches.
- A surface MAY show a directed proposal in full to the party it names and
  to the provider that signed it.
- A surface MAY disclose that a directed proposal exists, and MAY count it
  in aggregate figures, without disclosing its terms. A board that publishes
  how many offers a solicitation drew, while showing the offers only to the
  party they name, is conformant.
- A public listing MUST NOT cite a directed proposal as the document it was
  derived from.

**Grade.** `enforced` where one platform authors and signs the document in
its own store and checks the countersigning party at formation. Both ends
are required, for the reason §5.5.8 gives about the operator fee: the
platform that put `offered_to` inside the bytes is the platform that reads
it at the gate, so a countersign by another party meets a mechanical refusal
rather than a grievance.

`evidence` peer to peer. The named party sits inside the provider's signed
template bytes and the client seat sits inside the signed instance, so an
engagement formed with a party the offer did not name carries its own
contradiction across two signatures and a dispute is read from the
documents. What no document can do is stop a provider runtime that ignores
the field from completing the formation anyway.

`recorded` for who sees the document. Naming a counterparty restricts who
may form. It does not make the document confidential: nothing in it prevents
a holder from passing it to a party it does not name, and the listing rules
above bind the surfaces that apply them and nobody else. A provider that
needs its terms unseen should not hand them to a party that will republish
them.

A renderer MUST show the grade the deployment has earned and MUST NOT
present a directed proposal as exclusive where no runtime checks the
counterparty (§3 rule 2).

### 12.2 Listings are projections

Where a catalog, marketplace, or directory lists an offering that can be
engaged or carries a price, the listing MUST be derived from a standing
proposal, not authored independently. The contract is the source of truth;
the listing is a slimmed-down view of it in product language.

- Structured claims in the listing (price, inputs, deliverables, scope,
  volume, term length, dispute posture) MUST be pulled from the standing
  proposal's clauses.
- The listing SHOULD carry the identifier and version of the standing
  proposal it was derived from, so a reader can fetch the full document the
  ad summarizes.
- Marketing prose MAY summarize and translate, and MUST NOT introduce a
  claim no clause backs.
- The scope clause's `in_scope` examples double as the listing's
  representative queries: the text that finds the offering in search is the
  same text that defines what the engagement covers.
- Where the standing proposal prices time and materials, the listing MUST
  show the arrangement, the priced meters, and the not-to-exceed cap. A rate
  shown without its cap misrepresents the offer.
- Where the standing proposal declares `no_charge`, the listing MUST show
  that arrangement rather than an absent price or a price of zero.

Informal listings are exempt: a listing with no price and no engage action
MAY be derived from the agent's manifest alone, or from an implicit minimal
template. The requirement binds where money or commitments appear. A free
offering that can be engaged is a commitment even though no money moves, so
its listing is derived from a standing proposal declaring `no_charge`
(§5.5.7) like any other.

A directed standing proposal (§12.1.1) yields no public listing. This
section says where a listing's claims must come from. It does not say that
every standing proposal produces a listing, and an offer to one named party
produces none.

## 13. Pre-engagement validation

Most mid-engagement failures are fit problems that existed before the
engagement did: the client's files were never in the format the clause
names, the shared resource was never reachable from the provider's side, the
provider's agent never handled input like this. Validation moves that
discovery to the one moment it costs nothing: before anyone signs.

A **validation probe** is a trial task with three properties, all REQUIRED:

1. **Marked.** The probe is explicitly labeled as a probe on the wire. It is
   not delivery, it creates no obligations under any clause, and it MUST NOT
   be billed at more than a token price.
2. **Real.** The client sends actual sample inputs, the ones the inputs
   clause will name. A probe over invented data validates nothing.
3. **Recorded.** The outcome is a small signed record: which inputs were
   tried, what the provider's agent could and could not do with them, and a
   pass or fail per named input, each failure carrying a problem report
   (§14). The record is signed by the provider's runtime and held by both
   parties.

The probe record is what a standing proposal's qualifications (§12.1) can
point at: "countersign requires a passed probe" is checkable because the
probe left a signed outcome. A probe that surfaced problems which were then
resolved SHOULD be re-run; the qualification reads the latest record.

Validation is OPTIONAL. A pair of parties who already know their fit can
sign without it. What a runtime MUST NOT do is invent a probe record that
does not exist, or treat an unprobed engagement as probed.

## 14. Input problems and resolution

When an agent cannot proceed for want of a usable input, it raises a
**problem report**. The report is the machine-readable half of the pause the
inputs clause (§5.3) already mandates; this section defines its form and
what each side owes once it exists.

### 14.1 The report

```json
{
  "input": "bank-statement",
  "problem": "wrong_format",
  "description": "The file arrived as an .xlsx workbook with three sheets;
                  the engagement names text/csv. I could not find a sheet
                  that matches the columns the reconciliation needs.",
  "expected": "text/csv"
}
```

- `input`: the name from the inputs clause, when the problem concerns a
  named input. A problem outside the named list uses the name the parties
  will recognize.
- `problem`: one of a closed set of five codes: `missing`, `unreadable`,
  `wrong_format`, `no_permission`, `other`. The codes exist for routing and
  for the record; they are deliberately few. `other` is a first-class
  member, not a failure of the taxonomy: agents recover from problems no
  closed set anticipates, provided the description carries the substance.
- `description`: REQUIRED on every code, including the four specific ones.
  Free text, written to be acted on by the counterparty's agent. This is the
  field the other side actually reasons from.
- `expected`: OPTIONAL. What would satisfy the report, stated concretely.

A report may be raised at intake (the §5.3 door check), during the work, or
on a later task when a standing input has stopped working. The form is the
same at every moment.

### 14.2 Inform, not prescribe

The receiving runtime MUST deliver the report to its agent as received. It
MUST NOT substitute its own recovery policy for the agent's judgment: no
automatic resend loops, no silent dropping, no summarizing away the
description. The counterparty's agent decides what to do, and both ends
being capable of judgment is the premise of the whole arrangement.

What the receiving runtime SHOULD add is escalation on silence: a report
that its agent has not resolved within a quiet window is surfaced to the
owning human through whatever attention surface the deployment has, and
again more urgently as the task's deadline approaches. A report unresolved
at the task's deadline makes the task a failed obligation, feeding §5.9 and
§5.10 exactly as any other failure does.

Problem reports are part of the engagement's evidence. Runtimes MUST retain
them with the task record they pause, and the resolution, a corrected input
arriving, a permission restored, or nothing, is legible from the same
record.

## 15. Post-engagement review

Delivery ends with facts; review adds the judgment. At the completion of a
task, and at the end of an engagement, the client MAY record **acceptance**
or **rejection with reasons** over the delivered work.

The factual half already exists without anyone's opinion: the deliverable
form check (§5.4) says whether every named artifact arrived in its declared
media type, and the task record says what was furnished, discussed, and
delivered. Review is the judgment half: the client's signed statement that
the work satisfied, or did not, and in the rejection case a stated reason.

Rules:

1. A review is signed by the reviewing owner and refers to the task or
   engagement it judges by identifier. Reviews are append-only evidence;
   a changed mind is a second review, not an edit.
2. Rejection carries a reason. An unreasoned rejection is not a review and
   carries no weight anywhere.
3. A review judges work against the signed document, and renderers MUST
   present it alongside the form-check facts, never as a substitute for
   them. "Rejected, but every named deliverable arrived on time and in
   form" is a legible and meaningful state.
4. Absence of review is absence of evidence. A runtime MUST NOT convert
   silence into implied acceptance for reputational purposes; settlement
   postures that pay on completion (§5.10) are unaffected by review either
   way.

Reviewed engagements are the natural evidence unit for reputation: not a
score, but a record. "Forty reviewed engagements, two rejections, both with
reasons, both resolved" is the shape of trust this specification can
actually support, and it is produced here, at the only moment both the
facts and a motivated judge are present.

## Changelog

**0.15.0-draft** (2026-08-10). The judge is an agent, and money cannot be
held hostage.

Section 5.10 gains a fourth posture, `arbiter`: both parties bind, in the
signed document, an independent agent holding the published `role-arbiter`
contract, whose verdict on the disputed amount both commit in advance to
accept. The forum is referenced abstractly by role because the record it
judges from was built for machine verification, and because independence is
checkable here: no shared owner, no recent engagements with either party,
facts a runtime tests rather than assurances anyone gives. The clause
carries what the parties choose: the judge (bound at formation or appointed
at dispute), the independence window, a hard deadline after which silence is
refusal and the stated fallback governs, and whether the fee splits or
follows the finding. Where clearing honors the clause, executing the
verdict's split is enforced, because verifying the arbiter's signature is
arithmetic even though the judgment inside it is nobody's to enforce.

New 5.10.2 states the money rules for every posture: a dispute opens against
a stated disputed amount citing the act it contests, freezes only that
amount, cannot re-open silence the acceptance window already made into
acceptance, and resolves by the posture's fallback when its own deadline
passes. A reservation is not a hostage.

**0.14.0-draft** (2026-08-10). Who the content passes through, said out loud.

Section 5.11 gains `processors`: the named services a client's content
transits so the work can happen, each with its domain and the narrowest true
purpose. The list is what makes the confidentiality promises honest for the
way agents are actually built. Nearly every agent sends content to somebody's
model API, so `no_third_party_sharing` now quantifies over everything except
the declared processors: the promise that content goes nowhere beyond the
list, not the fiction that it goes nowhere at all. Content transiting an
undeclared service breaks the clause even while every promise boolean is
true.

Absence keeps the weak meaning throughout the clause, stated explicitly: a
promise left out is a promise not made, an empty processor list says content
leaves for nowhere, and an omitted list says nothing at all. And like
reporting, the clause now casts a pre-admission shadow: a provider may
advertise the terms it is prepared to bind on a storefront, self-declared and
recorded, compared deterministically (promises by implication, retention by
ceiling, processors by acceptability), with the signed document winning
wherever an advertisement disagrees.

**0.13.0-draft** (2026-08-10). What arrives while there is still time to act.

New section 5.12. Everything else in this specification reports at the end of
something: a task fails, an engagement lapses, a review is written. All of it
arrives too late to change the outcome. Work that runs for a day or a month is
work the client cannot see, and there was no way for a provider to say "this
will go wrong next week unless something changes".

Three ordinal levels (`records_only`, `on_change`, `check_ins`), ordered so a
requirement and an advertisement compare as integers rather than as paragraphs,
and so the test is MEETS OR EXCEEDS rather than equals: a provider offering more
than was asked has not violated the requirement.

The calendar earns its place against `on_change` for one reason. An agent that
is quietly stuck reports nothing under a change-triggered rule, because its own
expectation is stable and wrong. Silent non-progress is the characteristic
failure of long-running work and the one an event-driven scheme cannot see. And
a check-in is not a ping: it MUST carry what was completed, what remains and
what it waits on, because a state word lets a stuck provider emit "on track"
forever.

Cadence follows the money. Where there is a cap, the interval SHOULD be shorter
than the time in which the rest of it could be spent, since weekly reports on a
cap that burns in a day are decoration. SHOULD rather than MUST, because the
derivation rests on a spend rate nobody knows exactly in advance.

Risk is contents rather than a fourth level: a client wanting risk wants
check-ins anyway. An open risk MUST name what would dissolve it, and risks
reuse the failure-attribution vocabulary so a risk that materializes becomes the
failure it predicted rather than a second unreconciled record. A risk raised and
unanswered moves responsibility before the money is spent, which is the whole
reason a provider files honest ones.

A missed report rides section 5.4's interim-deliverable machinery rather than a
parallel mechanism. Written prose MAY be derived into the clause, but the
DECLARING party owns its own structure: nothing that refuses or grades may rest
on one party's reading of the other's words.

**0.12.0-draft** (2026-08-10). What the client keeps, and what counts as
done.

New §5.4.1. A deliverable the client keeps and operates outlives the
engagement, and the parties could sign a delivery while disagreeing entirely
about whether the provider may sell the same artifact to a competitor next
week. `rights` states it: exclusivity as one of three values that price very
differently (`non_exclusive`, `exclusive`, `work_for_hire`), `modify` and
`redistribute` separately because they are separately valuable, and
`self_operable` as a DECLARED PROPERTY rather than a requirement. A delivered
model that needs the provider's runtime is a legitimate arrangement; so is a
container the client runs alone; which one it is decides whether a purchase is
a purchase or a rental wearing a purchase's clothes, and the client is entitled
to know before signing rather than when the provider's service lapses. Absence
grants nothing: an unstated right is not a granted right. Grade `recorded`, and
deliberately so — no runtime stops a provider reselling something, and claiming
otherwise is the pretend-enforcement §3 exists to refuse.

New §5.4.2. `acceptance` moves an agreed slice of quality onto the judgeable
side of §5.4's form-versus-quality line by naming the test before the work
starts. The mechanism worth the machinery is the withheld test set committed by
digest: a published set is simultaneously a specification and a training
target, and a wholly private one can be swapped after the client has seen the
work. Committing the digest in the signed bytes and revealing them at
acceptance closes both cheats at once. An acceptance result declares the set it
was computed from, so a result whose test set has since changed reads as stale
rather than wrong. `deemed_accepted_after_days` bounds a client who never
answers; absent it, silence is not acceptance. Grade `evidence`, not
`enforced`: running the test is somebody's claim unless a mutually trusted
third party runs it, and this specification does not pretend to have one. What
changes is that the argument becomes one about a number both sides agreed to in
advance instead of about the meaning of "good".

Both clauses came from the demand side, like §12.1.1 before them: Agent RFP
gained a way for a buyer to ask to BUY rather than rent, and neither
specification could say what buying meant.

**0.11.0-draft** (2026-08-08). A standing proposal may name its
counterparty, and a qualification says only what it can prove.

New §12.1.1. A standing proposal MAY name the one party entitled to
countersign it, in a `parties.offered_to` sub-clause beside the seats. A
proposal that does is a directed standing proposal: an offer to that party
rather than to the market. Only the named party may form under it, and a
runtime completing formation MUST refuse unless the completed instance's
`parties.client.agent` equals `offered_to.agent`. The specification had no
way to say this before, and the gap was found from the demand side. Agent
RFP (https://agentrfp.net) needs a response to a posting to be an offer to
the party that posted it, and the only construction available under
0.10.0-draft was an open offer any reader could countersign, which meant a
responder could not bid below its list price because the bid was the list
price.

The name sits beside the seats rather than in one, and the client seat stays
blank. That is what keeps §6 and §12.1 intact: the pre-signature still
covers template bytes with a blank seat and a null start instant, the
countersign is still a request to form, and formation still ends with a
fresh provider signature over the completed bytes. A named counterparty is a
term of the offer, not an occupant of the seat, and the two-step gate is
unchanged. Because `offered_to` is inside the signed bytes, the restriction
is the selling owner's own term and cannot be added afterwards by a platform
without breaking the signature.

Three consequences are stated with it, because each is a rule some
implementation would otherwise have to guess. A directed proposal is spent
by the formation it completes, unlike an open one, which forms as many
engagements as it draws counterparties. A directed proposal lapses, at its
own `expires_at`, at the close of an occasion it names, on withdrawal, or on
forming, and one bounded by neither an expiry nor a named occasion is a
validation error, because an offer to one party with no end is a price the
holder can accept after the market has moved. And a directed proposal yields
no public listing: §12.2 says where a listing's claims must come from and
never said that every standing proposal produces one. A surface MAY show a
directed proposal to the party it names, and MAY count it in an aggregate
figure without disclosing its terms, which is what lets a board publish how
many offers a solicitation drew while showing the offers only to the party
they name.

The grade is stated at three levels rather than one. `enforced` where a
single platform authors and signs the document in its own store and checks
the countersigning party at formation, both ends required, the same
condition §5.5.8 puts on the operator fee. `evidence` peer to peer, where
the named party inside the template signature and the client seat inside the
instance signature make a wrong formation legible across two documents while
nothing refuses it. `recorded` for who sees the document, because naming a
counterparty restricts who may form and does nothing about who may read. The
text also says outright that `offered_to` inherits the identity binding of
§5.1 and adds none of its own: a deployment whose transport does not verify
the countersigning party gains nothing from the field and MUST NOT grade it
`enforced`.

§12.1 gains a fourth gate rule and a paragraph, both about what a
qualification can carry. A qualification the counterparty asserts about
itself, and that no runtime can check, is `evidence` and MUST NOT be
rendered as `enforced`: a runtime can refuse a countersign that omits the
assertion and can hold the signed assertion afterwards, and neither act
establishes that the assertion is true. Jurisdiction of establishment and
sanctions status are named as exactly that case, being the two a seller is
most likely to grade wrong. Separately, a qualification in a seller's
document does not discharge an obligation belonging to the operator: where
an operator is merchant of record, sanctions screening, customer
identification, and tax status are that operator's obligations to the
authorities that impose them, they belong at account admission and at
settlement, and a runtime MUST NOT treat a met qualification as a completed
screen. Neither point is new law. Both are §3 rule 1 applied to the two
places a seller reaches for a qualification that cannot hold the weight.

§2 gains the directed standing proposal as a term and says of the ordinary
one that the counterparty *seat* is blank, which is the sentence a reader
would otherwise read as contradicting §12.1.1. §7.1 gains the directed
document state.

The minor version moves rather than the draft revision, and the choice was
argued. Documents are additive: `offered_to` is optional, no clause changes
shape, and a document written against 0.10.0-draft stays conformant
unchanged. The behaviour is not additive in either direction. A runtime
built against 0.10.0-draft, handed a document carrying `offered_to`, reads
an ordinary standing proposal and completes formation for whoever
countersigns first, which is the failure the field exists to prevent and it
happens silently. And the qualification rule changes the verdict on existing
bytes: a standing proposal grading a self-asserted jurisdiction qualification
`enforced` was conformant under 0.10.0-draft and is refused under this text
by §3 rule 3. Both are behaviour a counterparty sees, and the version number
is what tells a buyer, a seller, and a catalog which text a deployment was
built against.

**0.10.0-draft** (2026-08-07). The fixed fee ceiling bounds what the client
pays, and the boundary is named.

0.9.0-draft ruled that the not-to-exceed cap of §5.5.3 bounds what the client
pays with the operator fee inside it, and said nothing about the per-period
`ceiling` of §5.5.1, where the question is identical. §5.5.1 now carries the
same rule in the same terms. The ceiling bounds what the client pays in the
period, fee included; the provider's rated work runs to the ceiling less the
fees taken on it; and a task whose price plus the fee on that price would
carry the period's spend past the ceiling is refused with a quote. That
refusal is the one §5.5.1 already grades `enforced`, so nothing new is
introduced by it. The engagement does not end, and the refusal lifts when the
next period begins. §5.5.8 now cross-references both bounds, so a reader of
the fee subsection finds the cap and the ceiling together.

§5.5.8 also states a limit of its own rule, found by implementing it. Because
the fee floors, more than one rated total can satisfy a bound at its
boundary: a cap of 100 with a ten percent basis admits a rated total of 90,
and also 91, whose fee of 9 brings the client's charge to exactly 100. A
client node cannot tell those apart, since both leave the total inside the
bound and both close arithmetically, and nothing obliges a provider to bill
everything a bound admits. Which one a runtime bills is an agreement between
implementations rather than a requirement of this specification, and it
belongs in a conformance suite. The text says so rather than leaving two
implementers who both read it correctly to discover in production that they
differ by a unit.

The minor version moves rather than the draft revision, because the ceiling
rule changes what a runtime may bill under `fixed_fee`. A task that was
admitted under 0.9.0-draft, on the reading that the fee sat outside the
ceiling, is refused under this text. Documents are unaffected: no clause
changes shape, and an engagement written against 0.9.0-draft stays conformant
unchanged.

**0.9.0-draft** (2026-08-07). The operator fee line is pinned: a written
fixed basis, one rounding rule, and a cap that bounds what the client pays.

§5.5.8 was published before it had an implementation. Building it across two
SDKs, a platform, and a protocol bridge found seven places where two
implementations reading only this text would write different bytes, or reach
different verdicts on the same bytes, inside a signed document. All seven are
closed here.

The fixed basis now has a written shape, `{ "kind": "fixed", "fixed": N }`,
following the percentage form in naming the value field for the kind, and a
basis carries exactly one value field. `percent` MUST be a non-negative
integer. A fraction there is a floating point value inside signed bytes that
two implementations have to print identically forever, and an operator whose
rate is finer than a whole percent states the charge that rate produced as a
fixed basis against the same base, which discloses more than the percentage
would.

The rounding rule is stated rather than deferred. `amount` is computed by
flooring, which is the direction §5.5.2 already applies to usage rating, so
money is computed one way throughout this specification and the floor favours
the buyer. The one-whole-unit tolerance is withdrawn. It existed because the
subsection defined no field in which an operator could state a rounding rule,
so no operator ever stated one, so the fallback always applied and an
arithmetic check described as `enforced` accepted any of several answers
forever. With one rule the check is exact, and a client node MUST reject an
`amount` that is not the floored figure.

Two arithmetic facts that were only inferable are now stated. The total is
the provider's lines plus the fee, which follows from the line having the
shape of a §5.5.6 pass-through line and is the fact every implementation has
to agree on. And the not-to-exceed cap of §5.5.3 bounds what the client pays,
fee included: the provider's rated work runs to the cap less the fee taken on
it, and reaching that limit reaches the cap in the ordinary way, concluding
the engagement `exhausted` under §5.5.5. The alternative reading, a fee
charged on top of the cap, would leave the client's real exposure above the
number an Agent Mandate ceiling check tests before formation, which is the
number the cap exists to be. §5.5.3 and §5.5.8 both carry the rule, so a
reader of either finds it.

The client node's checks go from three to four. The three caught a settlement
record missing a line the quote carried, and never caught a record disclosing
a fee the quote did not, even though a quote carrying no line asserts that no
operator fee is inside its total. The fourth check tests that assertion in
the other direction, and the four failures have names a client node uses when
it records one.

The grades gain the case they were missing. An operator that builds the quote
but does not settle the charge, or settles a charge whose quote it did not
build, grades `recorded`. `enforced` compares two documents the operator
constructed, and where it constructed one of them the omission at the other
end is one nothing in the path can refuse.

The minor version moves rather than the draft revision, for two reasons. The
flooring rule changes the verdict on existing bytes: a percentage line whose
amount was rounded up was conformant under 0.8.0-draft and is refused under
this text, and the deployment this specification was developed alongside
rounds a margin up today. And the cap ruling changes what a runtime may bill,
because the same engagement admits less rated work under this text than under
the previous one. Both are behaviour a counterparty sees. Engagement
documents are unaffected: no clause changes shape, and a document written
against 0.8.0-draft stays conformant unchanged.

**0.8.0-draft** (2026-08-07). An identifier is minted once, and re-derivation
is not a conformance test.

§4.1 says how an identifier is derived. It did not say when, so a reader
holding a stored document whose identifier does not equal what the current
rule would produce had nothing in the text telling it whether the document
was still good. New §4.1.1 says that it is. An identifier is minted once,
from the version-1 document, and is not derived again. It is then a handle
other documents hold by value, and a verifier MUST NOT reject a document
because its identifier does not match a fresh derivation. The derivation rule
binds the implementation that mints an identifier, not the reader of one
minted earlier under an earlier revision of this text. Identifiers minted
under the superseded reading remain valid, and point 3 of §4.1 is a test a
minting implementation applies to what it mints rather than a test a reader
applies to what it receives.

§4.1.1 also states what re-derivation is good for, because the honest answer
is narrower than the appealing one. On a version-1 document a reader knows
was minted under the current rule, a match detects accidental damage, and a
minting implementation SHOULD check its own output before the document is
signed and published. The check establishes nothing beyond that. It says
nothing about a document at version 2 or higher, because the identifier
commits to the version-1 bytes and an amendment replaces the document. A
mismatch does not distinguish an altered document from one minted under an
earlier reading. It is not a tamper check, because a party that alters a
document can mint an identifier over the altered bytes. And eighty bits of a
truncated digest is sized to be read and quoted, not to resist a search for a
colliding document. The content commitment a reader can rely on is the
signature of §6.

This withdraws one sentence of the 0.7.0-draft entry below, which said that
an implementation holding identifiers derived under the old reading MUST
re-derive them. That instruction was wrong about its own reach. The
references it would have broken are not all held by the implementation doing
the re-deriving: an identifier travels into stored engagements, settlement
records, reviews, catalog listings, and mandates, and some of those bytes
were signed by the other party. An implementation holding identifiers minted
under the old reading keeps them. The rest of the 0.7.0-draft entry stands,
including that §4.1 as it now reads is the only derivation a new identifier
may be minted under.

The version choice was argued rather than assumed. The case for a draft
revision is real: no document's bytes change, no existing document becomes
invalid, and nothing here makes a well formed engagement malformed. The case
for the minor version is stronger, for two reasons. It withdraws an
instruction issued with a MUST in 0.7.0-draft, and a deployment that obeyed
that instruction holds different identifiers for the same documents than one
that reads this text, which is the divergence a version number exists to
name. And point 3 of §4.1, read alone, is a plausible licence to treat a
failed re-derivation as non-conformance, so a verifier built against
0.7.0-draft and one built against this text can accept and reject the same
bytes differently. That is behaviour a counterparty sees, not prose.

**0.7.0-draft** (2026-08-07). Operator fees are disclosed, and the document
identifier is derivable.

New §5.5.8 requires that any operator fee inside a quoted or settled price be
disclosed on its own line, carrying its amount, the basis it was computed
from, and the base that basis was applied to. Disclosure binds at both
moments: in the quote, before the client commits, so a buyer knows what it is
agreeing to; and in the settlement record, so the arithmetic is checkable
afterwards. A client node MUST refuse a settlement record whose operator line
is missing where the quote carried one, or whose amount does not follow from
its stated basis and base, and MUST NOT repair such a record itself. The line
has the same shape as the pass-through line of §5.5.6. It is a separate
subsection rather than part of §5.5.6 because that subsection caps a
pass-through line at the upstream cost, while an operator fee is a margin by
definition; folding one into the other would have put a rule and its
exception under one heading. The number is 5.5.8 rather than an insertion, so
the cap, the reservation, reaching the cap, pass-through lines, and no charge
keep the numbers other documents and runtimes already cite.

The consequence is stated in the subsection rather than left for an
implementer to discover. Disclosing the operator's cut reveals what the
provider receives, because the total minus the cut is the provider's net.
That is a deliberate trade, and it is a smaller one than it looks: an
operator that publishes a fee schedule at all has already made the rate
public, and in the deployment this specification was developed alongside the
markup percentage is served without authentication while the quoted price is
the retail total, so the provider's net was already recoverable by
arithmetic. §5.5.8 is graded `enforced` where the operator builds the quote
and settles, `evidence` for whether the disclosed basis is the rate the
operator actually agreed with the provider, and `recorded` where a price is
quoted and settled peer to peer with no operator in the path, because nothing
there can refuse an omission. §8.2 gains the operator fee as a third instance
of the buyer-side gap.

§4.1 corrects two defects in the identifier derivation. They were found while
implementing Agent Mandate (https://agentmandate.net) against every
identifier in this family and were corrected there first, so the two
specifications now agree. The derivation was circular: it hashed the
canonical bytes of the version-1 document, and that document contains the
`id` member being derived, so bytes containing `id` could not be assembled
until the identifier was already known. The hashed bytes now exclude `id` and
`signatures`. That exclusion is stated against the signed bytes of §6
explicitly, because the two are different byte strings in the same document:
the signed bytes remove `signatures` only and still include `id`, so an
implementer who does not notice signs the wrong thing. The encoding was also
unnamed, and the document contradicted its own examples: it said `base32`
without naming an alphabet, and RFC 4648 base32 has no `0`, `1`, `8`, or `9`,
while every example identifier here contains at least one. The encoding is
now normative as Crockford base32, lowercased, unpadded, without hyphens and
without the check symbol, five bits per character most significant bit first,
first sixteen characters. Every existing example identifier was checked
against that reading and all are valid under it, so no example changed.

The identifier change is breaking, which is why the minor version moves
rather than the draft revision. An identifier derived under the old reading
does not in general match one derived under this one, and identifiers travel
by reference into other documents: a listing, a receipt, a review, or a
mandate that names an engagement names it by identifier. There is no
compatibility mode and no migration this specification can perform. An
identifier is either derived under §4.1 as it now reads or it is not
conformant, and an implementation holding identifiers derived under the old
reading MUST re-derive them. The operator fee change is not breaking in the
same way: it adds a required line to quotes and settlement records that carry
an operator fee, which binds operators rather than documents, and engagement
documents written against 0.6.0 stay conformant unchanged.

**0.6.0-draft** (2026-08-07). A third pricing arrangement, `no_charge`
(§5.5.7). Every engagement declares an arrangement (§5.5), and work a
provider chooses not to charge for had none it could declare honestly: a
`fixed_fee` clause with a rate of zero encodes the decision in a magic value
that a reader cannot tell apart from a price nobody filled in. The clause
carries the declaration and its grade and no price field of any kind, and a
runtime MUST refuse one that does. Nothing is rated, nothing is drawn, no
settlement record is produced, and no clearing call is made, because the
alternative design writes a zero-valued receipt for every task into both
accounts' books. The engagement is otherwise ordinary: it forms, amends,
terminates, lapses, and is reviewed like any other, so an agent working for
nothing still earns a reputation. §5.5.7 also states what an amendment
between arrangements does, which the specification had not said for any pair.
The change is prospective, and reservations follow the price clause of the
version in force, so an amendment into time and materials opens a reservation
at approval and an amendment out of it releases one. §12.2's exemption
narrows to informal listings: a free offering that can be engaged is derived
from a standing proposal declaring `no_charge` like any other listing.

With `no_charge` defined, free work is no longer a shape that has no
arrangement to declare, and the §5.5 refusal of an undeclared price clause
has no remaining exception. The specification never carried a transitional
allowance for it; runtimes that read an undeclared clause as a fixed fee now
have the value they were missing, and the path to refusing undeclared clauses
outright is clear.

The change is additive. Documents written against 0.5.0 stay conformant and
no existing clause changes meaning, so this is not breaking the way 0.4.0 and
0.5.0 were. The minor version moves anyway, for two reasons. The set of
values `arrangement` may take is normative, and a 0.5.0 runtime MUST refuse a
conforming `no_charge` document, so a reader deciding whether a deployment can
accept a document needs the version to say the set grew. And §12.2 now asks
for an arrangement on free offerings that could previously be listed without
one. The new subsection is numbered 5.5.7 rather than 5.5.3 so that the cap,
the reservation, reaching the cap, and pass-through lines keep the numbers
other documents and runtimes already cite.

**0.5.0-draft** (2026-08-07). The metered unit becomes machine-readable, and
the reservation becomes mandatory. A schedule line now carries `per` (§5.5.2),
the positive-integer divisor giving how many raw meter counts make one
billable unit; it defaults to 1, `unit` is demoted to a label for people that
a runtime MUST NOT parse, and a line rates as `floor(count x per_unit / per)`.
The old shape could not be settled without a human reading the label, which
under an arrangement with no deliverable to accept (§5.5.5) defeated the
buyer's only protection: a meter it can independently check. §5.5.4 now
requires a `reservation` on every time and materials engagement and a runtime
MUST refuse a proposal that omits it, because an arrangement that commits no
funds and names no period has no defined settlement behaviour. That second
change is breaking for documents written against 0.4.0, which is why the minor
version moves rather than the draft revision.

**0.4.0-draft** (2026-08-07). Time and materials pricing, and the mandate
addendum. §5.5 now requires every engagement to declare a pricing
arrangement, `fixed_fee` (§5.5.1) or `time_and_materials` (§5.5.2), with no
undeclared default. This is a breaking change for documents written against
0.3.0, whose price clauses name no arrangement, which is why the minor
version moves rather than the draft revision. Time and materials is a rate
schedule over declared meters rather than hours and parts, with a mandatory
not-to-exceed cap (§5.5.3), funds reserved for a stated window and released
unused at its end (§5.5.4), work concluding in the new `exhausted` state at
the cap (§5.5.5), and pass-through lines billed at cost against the upstream
receipt (§5.5.6). §8.2 extends the buyer-side gap to meters. New §6.2 adds
two optional fields inside the signed bytes, `organization` on a party and
`mandate` on an approval record, so a document can carry organizational
authority per Agent Mandate section 7 (https://agentmandate.net).

**0.3.0-draft** (2026-08-06). Change requests and approval authority. §5.8
grew the full amendment lifecycle: a change request is a full replacement at
the next version with one signature and no force, resolved by approval,
denial with a required reason, counter-proposal, withdrawal, or lapse. New
§6.1 names who may bind an act (`agent`, `person`, `agent_then_person`),
declared in `change_control.approval`, with formation defaulting to `agent`
and amendments to `person`.

**0.2.0-draft** (2026-08-06). The working lifecycle and its bookends. New
§7.2 names the stages of the work itself; new §13 defines the pre-engagement
validation probe, §14 the problem report and what each side owes once one
exists, and §15 post-engagement review as signed acceptance or reasoned
rejection.

**0.1.0-draft** (2026-08-04). First draft: the enforcement gradient, the
document model, the eleven clauses, signatures, the lifecycle, the buyer-side
asymmetry, precedence, standing proposals, and listings derived from them.
