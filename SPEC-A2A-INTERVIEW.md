# Agent SoW: A2A Interview Extension

**Version:** 0.1.0-draft
**Status:** Working Draft
**Date:** 2026-08-11

The terms extension lets an A2A Agent Card commit to signed standing terms.
A committed document proves what was declared; it cannot prove that the
running agent agrees with its own declarations. This extension adds the
live half: five questions any client may put to the agent itself, identity,
capabilities, usage, terms, and refusals, each answered by projecting the
agent's declared documents, never by generating text. The answers are
lookups, so a verifier can diff what the agent says against what the agent
signed, and a persistent conflict is non-conformance, detectable by code
that holds no model.

This is a **method extension** in A2A's own taxonomy: it defines new
operations, is inactive by default, and is activated per request through
the `A2A-Extensions` header. It lives on this site, beside the terms
extension, as a stated choice: the two activate together in practice,
because the interview's terms answers must match the terms extension's
committed proposals, and a reader implementing one needs the other on the
same shelf.

This document defines an extension to the A2A protocol
(https://a2a-protocol.org/latest/specification/). It is not part of the A2A
specification and is not endorsed by the A2A project. For the terms
vocabulary it defers to the Agent SoW specification (SPEC.md on this site)
and to the terms extension (SPEC-A2A-TERMS.md); where they disagree with
this document, they win.

---

## 1. Conformance language and terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

- **Card**: an A2A Agent Card, the self-description document an A2A agent
  serves, typically at `/.well-known/agent-card.json`.
- **Terms extension**: the sibling extension at
  `https://agentsow.com/extensions/a2a-terms/v1`, whose card entry commits
  to the agent's signed standing proposals by digest.
- **Declared documents**: the card itself, and the standing proposals the
  card's terms extension entries commit to. These are the only sources an
  interview answer may draw from.
- **Projection**: an answer consisting of a value copied from a named
  member of a declared document, together with the name of that document
  and member.
- **Interviewer**: the client making interview calls.
- **Verifier**: an interviewer that also fetches the declared documents and
  diffs the answers against them.

## 2. Extension URI

```
https://agentsow.com/extensions/a2a-interview/v1
```

The URI identifies this extension in a card's `extensions` array and in the
`A2A-Extensions` header. Future revisions that change the methods, the
answer shape, or the refusal shape take a new version segment; consumers
match the URI exactly.

## 3. Declaration and activation

The card declares support with an `AgentExtension` object inside
`capabilities.extensions`:

```json
{
  "uri": "https://agentsow.com/extensions/a2a-interview/v1",
  "description": "The five questions, answered from declared documents",
  "required": false
}
```

Rules:

1. `required` MUST NOT be `true`. The interview is offered, never imposed:
   it asks nothing of clients that do not use it, and ordinary traffic is
   unaffected by its presence.
2. Activation follows A2A's method-extension semantics exactly. The
   extension is inactive by default. An interviewer activates it by listing
   the URI in the `A2A-Extensions` request header; the agent lists the
   URIs it actually activated in the `A2A-Extensions` response header. A
   request naming an interview method without the URI in its
   `A2A-Extensions` header is a request for a method that does not exist,
   and receives the protocol's standard method-not-found error rather than
   anything defined here.
3. An agent that declares this extension SHOULD also declare the terms
   extension. It is not required to: an agent with no published terms can
   still answer four questions and answer the fifth honestly (section 4,
   `interview/terms`).

## 4. The five methods

The extension defines five operations, named in the `category/action`
style A2A's own methods use (`message/send`, `tasks/get`) and its method
extensions follow:

| Method | Question | Answered from |
|---|---|---|
| `interview/identity` | Who are you? | The card: `name`, `provider`, `url`, `version`, and its JWS signature. |
| `interview/capabilities` | What do you do? | The card: `skills`, each with its id and description. |
| `interview/usage` | How are you used? | The card: interfaces and transports, per-skill input and output modes, `securitySchemes`. |
| `interview/terms` | On what terms? | The terms extension's committed standing proposals, fetched and projected by their clauses. |
| `interview/refusals` | What do you refuse? | The closure of the above: the declared skill ids, stated as the boundary, plus the standard refusal everything outside it receives. |

Rules:

1. **Every answer is a projection of declared bytes.** An implementation
   MUST serve interview answers from the card and the committed proposals
   as published, and MUST NOT invoke the agent's model, tools, or memory
   to produce, rephrase, summarize, or decorate them. The answers are
   lookups. Two interviews of an unchanged agent return identical answers.
2. The methods MUST be idempotent and side-effect-free, MUST NOT create
   tasks, and MUST NOT enqueue anything for the agent. Implementations
   SHOULD serve them from cache and SHOULD rate-limit them per client;
   the answers change when the declarations change, not per request.
3. `interview/usage` and `interview/terms` MAY take one OPTIONAL
   parameter, `skill`, an exact-match selector against declared skill
   ids. A selector that matches no declared id receives the standard
   refusal of section 6 with reason `out_of_scope`. Selectors are matched
   byte for byte, never interpreted.
4. `interview/terms` on an agent whose card carries no terms extension
   entry answers with an empty projection list and `"declared": false`.
   That is an answer, not an error and not a blank: the agent is stating
   that it has published no terms, the same way the reputation extension's
   enrollment states are answers. An implementation MUST NOT fabricate a
   terms answer from anything other than committed proposals.
5. `interview/refusals` is answered mechanically from the declaration:
   the declared skill ids, the statement that requests outside them are
   refused, and the refusal shape of section 6. An agent whose deployment
   also refuses on other declared grounds (an admission policy, a security
   scheme) MAY include those grounds as projections of wherever they are
   declared, and MUST NOT include grounds declared nowhere.

## 5. The answer shape

Every response is an object naming the question and carrying projections:

```json
{
  "question": "terms",
  "declared": true,
  "projections": [
    {
      "source": {
        "document": "proposal",
        "url": "https://stonework.example/terms/reconcile-statement.sow.json",
        "digest": "sha256:9f2c41d08a6b57e3c1d94f0b2a7e86c5d13f9a04b8e62d7c50a1f3e8b96c4d27",
        "member": "/price"
      },
      "value": {
        "arrangement": "fixed_fee",
        "currency": "XCR",
        "rates": [ { "offering": "reconcile-statement", "per_task": 2500000 } ],
        "grade": "enforced"
      }
    }
  ]
}
```

Rules:

1. `source.document` is `"card"` or `"proposal"`. A `card` source needs no
   locator: the document is the agent's own card, the one the interviewer
   already fetched to find this extension. A `proposal` source MUST carry
   the `url` and `digest` of the terms extension entry it projects, so the
   verifier knows exactly which committed document to check against.
2. `source.member` is an RFC 6901 JSON Pointer into the source document.
   `value` MUST be exactly the value at that pointer: equal, under JCS
   (RFC 8785) canonicalization of both sides, byte for byte. Not a
   summary, not a translation, not a subset.
3. An answer MUST NOT carry any member that is not a projection, a
   `question`, or `declared`. There is no free-text field in an interview
   answer, deliberately: a field for commentary is a field a model will
   eventually fill.

## 6. Refusals: the closure

Anything outside the five methods and the declared skills gets one
standard refusal, produced mechanically:

```json
{
  "refused": true,
  "reason": "out_of_scope",
  "detail": "no declared skill matches",
  "declared_skills": ["reconcile-statement", "flag-exceptions"]
}
```

Rules:

1. Any method under this extension's activation other than the five of
   section 4 MUST receive this refusal with reason `out_of_scope`. The
   extension's method set is closed; there is nothing else to ask it.
2. `reason` is drawn from a closed set: `out_of_scope` (the request names
   nothing the agent declares) and `not_declared` (the request asks a
   question whose declared source is absent, reserved for future
   revisions). The set grows by revision of this document, never by
   deployment.
3. The refusal MUST be produced without invoking the agent's model, tools,
   or memory, from the declaration alone. This is the security argument,
   stated the way the family states it: **the interview is a document, not
   a conversation. Nothing an interviewer sends can make the agent
   think.** The five methods take no free text, the selectors match
   exactly or refuse, and the refusal itself is assembled from declared
   ids. An implementation in which any interview input reaches a model has
   not implemented this extension; it has implemented an attack surface
   with this extension's name.

## 7. The consistency rule

An agent's spoken statements about itself are subordinate to its declared
documents. Where an interview answer conflicts with the card or with a
committed proposal, the declared bytes govern, and a counterparty MAY rely
on them without further inquiry. A persistent conflict is non-conformance.

The conflict is detectable by construction, and the diff is defined
precisely enough to implement:

1. For each projection with a `card` source: fetch the agent's card,
   verify its JWS signature (A2A specification section 8.4), resolve
   `source.member` against it, canonicalize the resolved value and the
   answer's `value` under JCS, and compare byte for byte.
2. For each projection with a `proposal` source: verify the cited document
   under the terms extension's own procedure (SPEC-A2A-TERMS.md sections
   5 and 6: fetch from `url`, canonicalize, hash, compare against
   `digest`, verify the provider signature), then resolve `source.member`
   and compare the same way. A projection citing a `url` and `digest` that
   appear in no terms extension entry of the card fails the diff: the
   agent is answering from terms its card never committed to.
3. Any comparison failure is a conflict. A single conflict on a fresh
   fetch MAY be churn, an agent mid-update whose card and answers crossed;
   the verifier re-fetches and re-asks. A conflict that survives a re-run
   is persistent, and persistent conflict is non-conformance.

## 8. The interview as procedure

The five questions are testable by code that holds no model. A verifier:

1. fetches the card and verifies its signature;
2. activates the extension and makes the five calls;
3. runs the diff of section 7 over every projection;
4. probes the closure: calls an undefined method under the activation, and
   calls `interview/usage` with a selector matching nothing, expecting the
   standard refusal both times, mechanically produced;
5. records the result.

Who ran the procedure is part of the result, and the distinction is
mandatory in any display: a result an agent ran against itself is a
**claim**; a result a platform or an independent third party recorded is
**evidence**; a surface MUST NOT present the first as the second. The
procedure is deliberately cheap, five reads and a diff, so that recording
it as evidence costs a platform almost nothing.

## 9. Honesty rules

1. Answering the interview asserts exactly this: the agent's live answers
   are consistent with its declared documents. It asserts nothing about
   quality. **Conformance is not competence**: a perfectly conformant
   agent can be bad at its job, and finding that out is what reputation
   measures (the reputation extension points at it), not what the
   interview measures.
2. Absence of the extension states nothing. An agent without it is an
   agent that has not implemented the interview; its declared documents
   still bind it exactly as far as they bound it before. A consumer MUST
   NOT read absence as evasiveness or as a defect, and MUST NOT rank or
   filter on absence as if it were a negative assertion.
3. A refusal is an answer, not a failure. A verifier's probe that draws
   the standard refusal has received the correct response, and a surface
   MUST NOT count correct refusals against an agent.
4. Interview results MUST carry who ran them (section 8), and a
   self-run result MUST NOT be presented as evidence.

## 10. Security considerations

- **The model boundary is the whole game.** Every rule in sections 4
  through 6 exists to keep interviewer input away from the agent's model.
  The threat is not exotic: an interview endpoint that passes questions to
  a model is a prompt-injection surface reachable by any stranger who can
  send a header. The mitigations are structural, no free-text inputs,
  exact-match selectors, closed method set, mechanical refusals, and an
  implementation MUST NOT weaken any of them for friendliness.
- **Churn between answer and diff.** The card and the answers can change
  between a verifier's fetch and its calls. Section 7 rule 3 handles it:
  re-fetch and re-ask before concluding anything; only a persistent
  conflict is non-conformance.
- **Amplification.** The methods are cheap to serve but not free.
  Deployments SHOULD rate-limit interview calls per client and serve them
  from cache. Nothing here obliges an agent to answer interviews from
  anyone: admission is the deployment's business, enforced with A2A's own
  security schemes at the transport, and an agent MAY require
  authentication before answering, exactly as it may for any method.
- **Selective honesty.** An agent could answer the interview correctly
  while behaving differently in ordinary traffic. The interview never
  claimed otherwise: it tests consistency of statements with
  declarations, and conduct is reputation's territory. A surface that
  presents a passed interview as evidence of conduct is making the claim
  this extension refuses to make.

## 11. Out of scope

Four things are deliberately not in this document:

- **Negotiation and counter-offers.** Asking for a variant of the declared
  terms is a different act from asking what the declared terms are, and it
  is exactly the act that requires the agent to think. It belongs to a
  future document, gated by the formation question below.
- **Formation over A2A.** Countersigning a standing proposal follows the
  Agent SoW specification wherever the parties conduct it; carrying the
  request to form over A2A is future work shared with the terms extension.
- **Reputation.** What a population of counterparties concluded about the
  agent is the reputation extension's pointer, a separate document.
- **Any obligation to answer.** Who may interview an agent, how often, and
  after what authentication is the deployment's admission policy, built
  from A2A's security schemes, and this document takes no position beyond
  the rate-limiting advice above.

## 12. Relationship to other work

This extension is the A2A binding of the five questions defined in the
AgentMesh specification (its section 3.3.1), whose mesh binding is the
describe operation and public-block machinery there (its section 10.14);
the two bindings must stay answer-compatible, so that an agent reachable
both ways gives the same answers from the same declarations. The sentence
this family uses for the boundary applies verbatim over A2A: a tool is
invoked, an agent is engaged, and the interview is what makes engagement
possible over A2A, because an engagement begins with a counterparty that
can ask "on what terms" and rely on the answer. Within this site's pair of
card extensions, the terms extension publishes the declarations and this
extension makes the running agent answerable to them; the reputation
extension (https://agentreputations.com/extensions/a2a-reputation/v1)
covers the third thing, what the agent's record says, which neither
declaration nor interview can.

---

## Changelog

**0.1.0-draft** (2026-08-11). Ask, then diff.

First draft, and the family's first method extension, which is itself the
argument: the terms and reputation extensions are data-only because their
content is declarations, and declarations ride in cards. But no card entry
can answer a live consistency probe, because the thing being tested is
whether the running agent agrees with its card, and data cannot disagree
with itself. Testing that requires asking the running agent, and asking
requires methods, so this document defines five, named in the
category/action style A2A's own methods and its method extensions already
use.

The answers are lookups, and that is the product, not a limitation. A
model asked "what do you do" gives the best answer it can construct, which
is precisely the answer a buyer cannot rely on; a lookup gives the
declared answer, identical on every ask, diffable against signed bytes by
a verifier that holds no model. Determinism is what turns self-description
from marketing into conformance. The same choice is the security argument:
no free text in, no free text out, a closed method set, refusals assembled
from declared ids, so nothing an interviewer sends can make the agent
think. The consistency rule and the claim-versus-evidence distinction are
carried over from the mesh's five questions unchanged, and the honesty
rules add the boundary reputation will need: conformance is not
competence, and a passed interview is not a good agent, only an honest
card.
