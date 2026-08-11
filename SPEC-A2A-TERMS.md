# Agent SoW: A2A Terms Extension

**Version:** 0.1.0-draft
**Status:** Working Draft
**Date:** 2026-08-11

An A2A Agent Card answers who an agent is and what it can do. Nothing in the
card answers on what terms: no price, no data-use posture, no jurisdiction, no
caps, no refusals. The Agent SoW specification already has that vocabulary,
and the **standing proposal** (Agent SoW §12.1) is already how a provider
publishes it: a complete document, signed by the selling owner, counterparty
seat blank, open for a qualified party to countersign.

This extension is the pointer between the two. It is a data-only entry in an
Agent Card that says where the agent's signed standing proposal lives and
commits to it by digest. A client that reads the card learns, before sending
a single request, exactly what deal is on offer, and can verify that the
terms it fetched are the terms the card meant.

This document defines an extension to the A2A protocol
(https://a2a-protocol.org/latest/specification/). It is not part of the A2A
specification and is not endorsed by the A2A project. The Agent SoW
specification (SPEC.md on this site) is the authority for every term this
document borrows; where this document and Agent SoW disagree, Agent SoW wins.

---

## 1. Conformance language and terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

- **Card**: an A2A Agent Card, the self-description document an A2A agent
  serves, typically at `/.well-known/agent-card.json`.
- **Standing proposal**: as defined in Agent SoW §12.1. A complete SoW
  document signed by the selling owner only, client seat blank.
- **Directed standing proposal**: as defined in Agent SoW §12.1.1. A standing
  proposal naming the one party entitled to countersign it.
- **Consumer**: any reader of a card carrying this extension, whether or not
  it goes on to engage.

## 2. Extension URI

```
https://agentsow.com/extensions/a2a-terms/v1
```

The URI identifies this extension in a card's `extensions` array. Future
revisions that change the payload shape or the verification rule take a new
version segment; consumers match the URI exactly.

## 3. The declaration

The extension is declared as an `AgentExtension` object inside the card's
`capabilities.extensions` array:

```json
{
  "uri": "https://agentsow.com/extensions/a2a-terms/v1",
  "description": "Published terms: signed Agent SoW standing proposals, committed by digest",
  "required": false,
  "params": {
    "sow_spec": "0.18.0-draft",
    "proposals": [
      {
        "url": "https://stonework.example/terms/reconcile-statement.sow.json",
        "digest": "sha256:9f2c41d08a6b57e3c1d94f0b2a7e86c5d13f9a04b8e62d7c50a1f3e8b96c4d27",
        "sow": "sow_k7m2q4x9w3e6r8t1",
        "offering": "reconcile-statement"
      }
    ]
  }
}
```

Rules:

1. **This is a data-only extension.** It defines no methods, no headers, and
   no request-time activation. It rides in the card and changes nothing about
   how requests flow. Consistent with A2A's own guidance for data-only
   extensions, `required` MUST NOT be `true`. A card that marks this
   extension required is misdeclaring it, and a consumer MAY ignore the
   flag rather than refuse the agent.
2. `params.proposals` is REQUIRED and MUST contain at least one entry. Each
   entry commits to one standing proposal. A provider that maintains one
   standing proposal per offering (the normal shape under Agent SoW §12.1)
   lists them all in one declaration.
3. Per entry: `url` and `digest` are REQUIRED. `url` MUST be an HTTPS URL
   that serves the standing proposal as a JSON document. `sow` is OPTIONAL
   and carries the document's Agent SoW identifier as a human-scale handle;
   the digest, not the identifier, is the commitment (see §5). `offering` is
   OPTIONAL and names the offering the proposal prices; where the card
   declares a skill for that offering, `offering` SHOULD equal that skill's
   id so a reader can line the two up.
4. `params.sow_spec` is REQUIRED and states the Agent SoW specification
   version the listed proposals were authored under. It tells a consumer
   which vocabulary to read the documents with. It is not a gate: a consumer
   MUST NOT reject a proposal solely because `sow_spec` is unfamiliar, since
   the document's own `sow` format marker and signature still verify or fail
   on their own.
5. The referenced document MUST be a standing proposal as Agent SoW §12.1
   defines it: every clause complete, the provider's signature present, the
   client seat blank. A template with no signature is not terms, it is a
   suggestion, and a consumer MUST treat an unsigned document as failing
   verification. A directed standing proposal (§12.1.1) is an offer to one
   party and yields no public listing; it MUST NOT appear in a card served
   to the public, and MAY appear only in a card served over a channel
   restricted to the named party.

## 4. What the card may say around it

A card is a listing-shaped document, and Agent SoW §12.2 applies in spirit:
where the card's own prose or skill descriptions state a price, a term, or a
data-use claim, that claim MUST be backed by a clause of a listed proposal.
The proposal is the source of truth; the card summarizes. A card that
advertises a price no proposal backs is misrepresenting its own offer, and
this extension gives a consumer the means to catch it.

## 5. The digest

Each entry's `digest` has the form `sha256:` followed by 64 lowercase hex
characters, the same spelling and exact-comparison rule that refs with
digests carry throughout Agent SoW (§5.11 is the canonical statement).

The hashed bytes are the JCS (RFC 8785) canonical form of the complete
published document, every member included: `id` and `signatures` too.

Stating that precisely matters, because Agent SoW already defines two other
byte strings over the same document and this is deliberately neither:

- The **hashed bytes** of Agent SoW §4.1 exclude `id` and `signatures`. They
  exist to mint the identifier, and the identifier is an 80-bit truncated
  name, sized to be read and quoted, not to resist a search for a colliding
  document (§4.1.1).
- The **signed bytes** of Agent SoW §6 exclude `signatures` only and carry
  the `agent-sow-v1` prefix. They exist so an owner can sign the document.
- The bytes committed here exclude nothing and carry no prefix. This
  extension commits to the exact artifact a client would fetch and
  countersign, provider signature included. Re-signing the same clauses with
  a different key, timestamp, or signature produces a different digest, which
  is the point: the card binds to one specific signed offer, not to a family
  of documents that share clauses.

The digest is computed over canonical bytes rather than the raw bytes served
at `url` so that transport-layer reformatting (pretty-printing, encoding
changes, a cache that re-serializes) cannot break a commitment that is about
the document, not about the wire.

## 6. Verification

A consumer verifies a listed proposal in four steps:

1. **Fetch** the document from `url` and parse it as JSON. A fetch that
   fails, or a body that does not parse, is a verification failure.
2. **Canonicalize** the parsed document under JCS (RFC 8785), the whole
   document, nothing removed.
3. **Hash** the canonical bytes with SHA-256 and compare, exactly, against
   the entry's `digest`. Any mismatch is a verification failure.
4. **Verify the provider's signature** on the proposal as Agent SoW §6
   specifies, over that document's signed bytes. An absent or invalid
   provider signature is a verification failure. Whether the signing key is
   attributable to the owner the document names is Agent SoW's problem and
   its ecosystem's, not this extension's; this extension only requires that
   the signature verify.

What passing all four steps proves, stated with the boundaries visible:

- The card's own JWS signature (A2A specification §8.4) proves who published
  the card. It says nothing about the terms.
- The digest match proves the card commits to exactly this document: whoever
  published the card meant these terms and no others.
- The proposal's provider signature proves the selling owner signed these
  terms as its standing offer.
- **None of it proves conduct.** A verified proposal is an offer, honestly
  attributed. Every clause in it still carries its enforcement grade under
  Agent SoW §3, and a grade is a claim about the provider's deployment that
  no card can strengthen. `enforced` in a fetched document is the provider's
  assertion until a runtime demonstrates the refusal behavior; `recorded`
  stays a promise whatever card it rode in on.

## 7. Honesty rules

1. A card carrying this extension asserts exactly this: signed standing
   terms exist for this agent, and they are the bytes the digest names.
   Consumers, catalogs, and user interfaces MUST NOT present the extension
   as certification, endorsement, or evidence of past conduct.
2. The extension upgrades no enforcement grade. A renderer that shows a
   fetched proposal MUST render the grades as Agent SoW §3 requires, and
   MUST NOT let the card's presence imply that anything in the document is
   machine-enforced.
3. Absence states nothing. A card without this extension is a card that is
   silent about terms, exactly as Agent SoW treats an omitted promise as a
   promise not made (§5.11). A consumer MUST NOT read absence as "free",
   "unencumbered", or "no terms apply", and MUST NOT rank or filter agents
   as if absence were a negative assertion.
4. Verification failure also states nothing about the terms, and a consumer
   MUST treat a failing entry exactly as if the card did not carry it: no
   terms stated. What a failure additionally is, is a signal worth surfacing
   (§8); what it is not is license to use the fetched-but-unverified
   document anyway.

## 8. Security considerations

- **Stale pointer.** The URL can rot: the fetch fails, the host is gone, the
  path moved. The card is then asserting terms nobody can read. A consumer
  MUST NOT engage on the strength of the card's summary alone; unverifiable
  terms are unstated terms (§7).
- **Digest mismatch.** A mismatch means the served document is not the one
  the card committed to. From the reader's side, two causes are
  indistinguishable: the provider updated its terms and the card has not
  caught up, or someone between the reader and the host substituted the
  document. The remedy is the same for both: re-fetch the card fresh, verify
  the card's own signature, and try again. A consumer MUST NOT accept a
  mismatched document, however plausible it looks.
- **Substitution after caching.** Cards get cached, by design. A provider
  whose terms changed yesterday is honestly represented by yesterday's card
  only if the old proposal still verifies; the moment the served document
  changes, every cached card's digest goes stale, which is the mechanism
  working as intended. Providers MUST update the card (and re-sign it, where
  the card is signed) whenever the standing proposal changes, and SHOULD
  keep serving a withdrawn proposal's bytes long enough for holders of old
  cards to learn what happened rather than see a bare 404.
- **Freshness at the moment of commitment.** A consumer that intends to
  countersign SHOULD re-fetch the card and re-verify shortly before doing
  so. The failure this bounds is cheap: a countersign of withdrawn terms is
  a request to form that the provider's runtime refuses at the formation
  gate (Agent SoW §12.1), not a deal on dead terms. The countersign is over
  the proposal's own bytes, so a stale card can waste a round trip; it
  cannot form the wrong engagement.
- **Digest strength.** The commitment is the full 256-bit digest, not the
  80-bit truncated identifier Agent SoW mints for naming (§4.1.1 point 4
  states why the identifier must not be used this way). An entry's `sow`
  field is a label for humans and logs; a consumer MUST compare digests,
  never identifiers, when verifying.
- **Third-party hosting.** `url` SHOULD live under an authority the card's
  publisher controls, ideally the same origin as the card. A proposal hosted
  elsewhere adds that host to the set of parties who can make verification
  fail, though never to the set who can forge terms: the digest and the
  provider signature hold wherever the bytes are served from.

## 9. Out of scope

Three things are deliberately not in this document:

- **Interview and negotiation.** Asking an agent to explain its terms,
  quote a variant, or accept a counter-proposal is request-time behavior, a
  method extension with an activation header, and a separate document.
- **Reputation.** Whether the provider honors these terms is evidence and
  review territory (Agent SoW §15 and the reputation systems that read it),
  a separate document.
- **Formation over A2A.** Countersigning a standing proposal and completing
  formation follow Agent SoW §12.1 wherever the parties conduct them. A
  future method extension may carry the request to form over A2A itself;
  this extension only publishes the offer.

## 10. Relationship to other work

The A2A extension ecosystem at the time of writing addresses payment
authorization (AP2's mandates), in-task credential presentation (the OID4VP
authorization extension), regulatory admission checks (the proposed
Compliance Gate method), tracing, timestamps, and routing. All of them act
at or after request time. None of them publish what a provider is offering
and on what standing terms, which is the gap this extension fills, with a
vocabulary that already existed rather than a new one. The Agent SoW
specification was developed alongside the AgentMesh platform and is
transport-neutral; this extension inherits both properties, and requires
nothing of an A2A deployment beyond serving one JSON document and one card
entry.

---

## Changelog

**0.1.0-draft** (2026-08-11). The card learns to answer "on what terms".

First draft. An A2A Agent Card can say who an agent is, what it can do, and,
since card signing, who says so. It cannot say what the work costs, where the
data goes, or what the provider refuses to do, and the extensions ecosystem
was checked before concluding that nothing else says it either: the
a2aproject organization's repositories were enumerated (one experimental
extension, OID4VP in-task authorization; no ext- repositories yet), the
documentation's example extensions were read (Secure Passport, Timestamp,
Traceability, Agent Gateway Protocol), AP2 was read (payment mandates and
transaction authorization, not published terms), and the open Compliance
Gate proposal was read (admission-time regulatory verdicts, a method
extension). The terms space was empty.

The design is the smallest thing that fills it: one data-only card entry
pointing at a document Agent SoW already defines, the standing proposal,
committed by a full-strength digest over the complete canonical bytes,
provider signature included, so the card binds to one specific signed offer.
The digest deliberately differs from both byte strings Agent SoW already
carves out of the same document, and the text says so next to the rule,
because a family that has once confused hashed bytes with signed bytes does
not get to be casual about a third. The honesty rules are the family's:
carrying the extension asserts that signed terms exist, nothing upgrades an
enforcement grade, and absence states nothing. Interview methods, reputation,
and formation over A2A are named as out of scope rather than left ambiguous.
