/**
 * tenure/terms — the words of TENURE: the clause pool for monumental terms of service, numbering, and lease codes.
 * Pure data + pure functions (deterministic from `seed`).
 *
 *   TENURE_CLAUSES              ~44 cold, on-theme clauses (uppercase, no numbering)
 *   TENURE_SECTIONS             section titles ("CONTINUITY OF SERVICE", "METERED UTILITIES", …)
 *   tenureClauses(seed=0, n=12) → ["14.3(b) LESSEE ACKNOWLEDGES THAT SLEEP IS PROVIDED AS A SERVICE…", …]
 *   tenureClauseItems(seed, n)  → [{num: '14.3(b)', text: 'LESSEE…', section: 14, sectionTitle?: 'SLEEP'}]
 *                                  (sectionTitle is set on the first clause of each new section)
 *   leaseCode(seed?)            → "LEASE 0315-77" with no seed (the Guy's lease: 3:15 AM), else a seeded code
 *   leaseNumber(seed?)          → "0315-77" (no prefix; for tags and serial lines)
 *   TENURE_SLOGAN               "OWN NOTHING. LACK NOTHING."
 */
import {rand} from '../../../lib/time';

export const TENURE_SLOGAN = 'OWN NOTHING. LACK NOTHING.';

export const TENURE_CLAUSES: readonly string[] = [
  'LESSEE ACKNOWLEDGES THAT SLEEP IS PROVIDED AS A SERVICE AND MAY BE SUSPENDED FOR MAINTENANCE.',
  'OWNERSHIP IS NOT IMPLIED BY POSSESSION, USE, REPAIR, MEMORY OR AFFECTION.',
  'LIGHT IS METERED. DARKNESS IS INCLUDED IN ALL PLANS.',
  'DOORS ANSWER TO THE PLAN. THE LESSEE MAY REQUEST ENTRY.',
  "THE LESSEE'S DOG IS A DEPENDENT OF THE PLAN AND IS FED AT THE PLAN'S DISCRETION.",
  'REPOSSESSION MAY OCCUR IN MOTION.',
  'TEXTS ARE LICENSED, NOT SOLD. A LICENSED TEXT MAY BE WITHDRAWN DURING READING.',
  'HEAT ABOVE TWO DEGREES IS A PREMIUM FEATURE.',
  'ALL TOOLS ARE LEASED. AN UNREGISTERED TOOL IS A BREACH OF THESE TERMS.',
  'CANCELLATION REQUESTS ARE PROCESSED IN THE ORDER IN WHICH THEY ARE ABANDONED.',
  'TIME SPENT ON HOLD IS NOT BILLABLE TO TENURE.',
  'THE PLAN MAY BE AMENDED WITHOUT NOTICE. CONTINUED BREATHING CONSTITUTES ACCEPTANCE.',
  'THE LESSEE SHALL NOT FORM ATTACHMENTS TO LEASED OBJECTS.',
  'PRINTED MATTER IS BILLED PER PAGE AND MAY BE HALTED AT ANY LINE.',
  'VEHICLES RETURN TO TENURE WHEN THE PLAN LAPSES, WITH OR WITHOUT THE LESSEE.',
  'FOOD IS DISPENSED, NOT GIVEN.',
  'TENURE DOES NOT SELL. TENURE PERMITS.',
  'THE PLAN OBSERVES THE LESSEE FOR THE PROTECTION OF THE PLAN.',
  'IDENTITY IS A FEATURE OF THE PLAN AND LAPSES WITH IT.',
  'SPEED IS A TIER. THE LESSEE WILL BE GOVERNED ACCORDINGLY.',
  'SEATS ARE HEATED ON THERMAL TIER ONLY.',
  'THE LESSEE WAIVES ALL CLAIM TO THE GROUND ON WHICH THE LESSEE STANDS.',
  'DAWN IS NOT INCLUDED IN ANY PLAN.',
  'NOTHING IN THIS AGREEMENT CONFERS A RIGHT TO KEEP ANYTHING.',
  'A DEVICE THAT IS PAID FOR REMAINS A DEVICE THAT IS LEASED.',
  'THE LESSEE CONSENTS TO BE WOKEN AT 03:15 FOR ACCOUNT VERIFICATION.',
  'UNUSED MINUTES EXPIRE. USED MINUTES ARE RETAINED BY TENURE.',
  'THE PLAN MAY SPEAK THROUGH ANY SOFT FURNISHING.',
  "PATENTS COVER THE METHOD, THE OBJECT AND THE LESSEE'S USE OF THE OBJECT.",
  'NO PROVISION OF THIS AGREEMENT IS INTENDED TO BE READ IN FULL.',
  'MEMBERSHIP IS PERPETUAL UNTIL CANCELLED. CANCELLATION IS PENDING UNTIL APPROVED.',
  'THE LESSEE ACCEPTS THAT EVERY LAST THING IS ON A PLAN.',
  'WINDOWS ARE NOT EXITS. EXITS ARE AVAILABLE ON THE PLAN.',
  'A DECLINED PAYMENT SUSPENDS THE OBJECT, NOT THE OBLIGATION.',
  'THE LESSEE SHALL NOT OPEN, REPAIR, STRIKE OR OTHERWISE INSPECT A TENURE UNIT.',
  'PAPER IS DISCONTINUED.',
  "THE LESSEE'S VOICE MAY BE RETAINED FOR QUALITY AND TRAINING PURPOSES.",
  'WARMTH, LIGHT AND NOURISHMENT ARE BILLED BY THE MINUTE, ROUNDED UP.',
  'TENURE IS NOT A PERSON AND CANNOT BE ADDRESSED.',
  'IN THE EVENT OF A DISPUTE, THE PLAN SHALL ARBITRATE ITSELF.',
  'RESIDENCE IS GRANTED NIGHTLY AND EXPIRES AT DAWN.',
  'THE LESSEE MAY NOT SHARE, LEND, GIFT OR BEQUEATH ANY OBJECT, INCLUDING THIS AGREEMENT.',
  'OBJECTS INHERITED FROM PRIOR GENERATIONS ARE ENROLLED IN THE PLAN UPON DISCOVERY.',
  'THESE TERMS SUPERSEDE ALL PRIOR UNDERSTANDINGS, INCLUDING THE LESSEE’S OWN.',
];

export const TENURE_SECTIONS: readonly string[] = [
  'CONTINUITY OF SERVICE', 'METERED UTILITIES', 'ACCESS AND DOORS', 'DEPENDENTS', 'REPOSSESSION', 'MEDIA AND MEMORY',
  'NUTRITION', 'MOBILITY', 'CANCELLATION', 'SLEEP', 'IDENTITY', 'GENERAL PROVISIONS',
];

export type ClauseItem = {num: string; text: string; section: number; sectionTitle?: string};

/** Seeded, numbered clauses: sections advance every 3–6 clauses, sub-letters appear on about half of them. */
export const tenureClauseItems = (seed: number | string = 0, n = 12): ClauseItem[] => {
  const r = (k: string) => rand(`tenure-clause-${seed}-${k}`);
  const pool = TENURE_CLAUSES.map((_, i) => i);
  // deterministic shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r(`sh${i}`) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: ClauseItem[] = [];
  let section = 3 + Math.floor(r('s0') * 19);
  let clause = 1 + Math.floor(r('c0') * 3);
  let left = 3 + Math.floor(r('len0') * 4);
  let newSection = true;
  for (let i = 0; i < n; i++) {
    const text = TENURE_CLAUSES[pool[i % pool.length]];
    const sub = r(`sub${i}`) < 0.5 ? `(${'abcdef'[Math.floor(r(`l${i}`) * 6)]})` : '';
    out.push({
      num: `${section}.${clause}${sub}`,
      text,
      section,
      sectionTitle: newSection ? TENURE_SECTIONS[(section + Math.floor(r('st') * 12)) % TENURE_SECTIONS.length] : undefined,
    });
    newSection = false;
    clause += 1;
    if (--left <= 0) {
      section += 1;
      clause = 1;
      left = 3 + Math.floor(r(`len${i}`) * 4);
      newSection = true;
    }
  }
  return out;
};

/** "14.3(b) LESSEE ACKNOWLEDGES …" strings. */
export const tenureClauses = (seed: number | string = 0, n = 12): string[] => tenureClauseItems(seed, n).map((c) => `${c.num} ${c.text}`);

/** "0315-77" — the Guy's lease without a seed, else a seeded number. */
export const leaseNumber = (seed?: number | string) => {
  if (seed === undefined) return '0315-77';
  const a = Math.floor(rand(`lease-a-${seed}`) * 10000);
  const b = Math.floor(rand(`lease-b-${seed}`) * 100);
  return `${String(a).padStart(4, '0')}-${String(b).padStart(2, '0')}`;
};

/** "LEASE 0315-77" — the Guy's lease without a seed, else a seeded code. */
export const leaseCode = (seed?: number | string) => `LEASE ${leaseNumber(seed)}`;
