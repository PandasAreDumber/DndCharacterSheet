// Core types for the rules engine. Everything is either a Resource or an Action.

export type AbilityName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type AbilityScores = Record<AbilityName, number>

export type CastingTime = 'action' | 'bonus' | 'reaction' | 'other'

export type Spell = {
  name: string
  level: number // 0 = cantrip
  castingTime: CastingTime
  concentration: boolean
  ritual: boolean
  upcast: boolean
  /** How far it reaches, as written in the spell: "Self", "Touch", "60 ft", "Unlimited". Optional. */
  range?: string
  /** Set when the spell was added from the SRD list, so it could be refreshed from the list later. */
  srdId?: string
  /** How long it lasts, without the word Concentration (that's the flag): "Instantaneous", "1 minute". Optional. */
  duration?: string
  note?: string
  /** The full spell text, when it came from the SRD list and the note is only a short summary. */
  description?: string
}

/** A spell from the bundled SRD 5.2 list, with extra info for searching. */
export type SrdSpell = Spell & { srdId: string; classes: string[]; school: string }

/** What the player types in. Everything else is computed from this. */
export type CharacterBuild = {
  name: string
  classId: string
  subclassId: string | null
  speciesId: string | null // 2024 "species" (was race)
  lineageId: string | null // lineage / ancestry / legacy (was subrace)
  level: number
  abilities: AbilityScores
  maxHp: number // the one stored max
  ac: number // Armor Class, typed in by the player (armor, shields and magic items aren't tracked)
  spells: Spell[] // spells the player added themselves
  spellModifiers: string[] // chosen options like Metamagic, by id
  /** 2024 background. Its Origin feat is also in `feats`. Optional for older saves. */
  backgroundId?: string | null
  /** Feats the player picked. Optional so saves from before feats existed still load. */
  feats?: FeatPick[]
}

/** A feat the player picked, plus any spells they chose for it (Magic Initiate, Fey Touched). */
export type FeatPick = { id: string; spells?: Spell[] }

export type Formula = (build: CharacterBuild) => number
export type TextFormula = string | ((build: CharacterBuild) => string)

// ---------- Resources ----------

export type ResourceId = string

export type ResourceKind = 'spellSlot' | 'pool' | 'uses' | 'hitDice'

export type RechargeRule =
  /** Restore everything. */
  | { type: 'all' }
  /**
   * Restore up to `amount`. If `limitedBy` is set, this only happens while that
   * resource has a use left, and it spends one use (e.g. Sorcerous Restoration).
   */
  | { type: 'amount'; amount: Formula; limitedBy?: ResourceId }

export type ResourceDef = {
  id: ResourceId
  name: string
  kind: ResourceKind
  /** Max is computed, never stored. A max of 0 means the character doesn't have it. */
  max: Formula
  recharge: { short?: RechargeRule; long?: RechargeRule }
  slotLevel?: number // only for kind "spellSlot"
}

// ---------- Actions ----------

export type Economy = 'action' | 'bonus' | 'reaction' | 'free'

export type Cost = { resource: ResourceId; amount: number }

export type Gain = {
  resource: ResourceId
  amount: number
  /** If true, current can go above max (Font of Magic created slots). Extras vanish on a long rest. */
  canExceedMax?: boolean
}

/** One way to pay for an action. The user picks one. */
export type PaymentOption = {
  id: string
  label: string
  costs: Cost[]
  gains?: Gain[] // conversions: spend X to gain Y
  castLevel?: number // for spells: the level it's cast at
  minLevel?: number // option only exists from this class level
  /** Option is only usable while this resource is at 0 (Sorcery Incarnate). */
  onlyWhenEmpty?: ResourceId
}

export type EffectDef = {
  name: string
  duration: TextFormula
  concentration?: boolean
  /** Ends automatically when the player starts a new turn (Dodge, Disengage, Ready). */
  endsOnNewTurn?: boolean
}

/** Where a feature comes from, so the UI can tag it. Set by the engine, not in the data files. */
export type FeatureSource = { kind: 'class' | 'subclass' | 'species' | 'feat'; name: string }

export type ActionDef = {
  id: string
  name: string
  economy: Economy
  minLevel?: number
  payments: PaymentOption[]
  /** The user picks how much of this resource to spend (Lay on Hands). */
  variableCost?: { resource: ResourceId; min: number }
  /** Follow up: only available right after the action with this id resolves. */
  after?: string
  /** A basic action everyone has (Attack, Dash, ...). The UI shows these as a compact grid. */
  basic?: boolean
  effect?: EffectDef
  spell?: Spell // set when this action is casting a spell
  /** Gives the character this much temp HP (keeps the current temp HP if it's higher). */
  tempHp?: Formula
  /** Heals the character this much (capped at max HP). */
  heal?: Formula
  note?: TextFormula
  source?: FeatureSource
}

/** Something that changes how a spell is cast, like Metamagic. */
export type SpellModifierDef = {
  id: string
  name: string
  minLevel: number
  costs: Cost[]
  economyChange?: { from: Economy; to: Economy }
  /** Can be used together with another modifier on the same casting. */
  combinable?: boolean
  /** Only works on level 1+ spells that can be upcast (Twinned Spell). */
  needsUpcast?: boolean
  /**
   * Can't be used if a level 1+ spell was already cast this turn, and no level 1+ spell
   * can be cast for the rest of the turn after using it (Quickened Spell).
   */
  locksLeveledSpells?: boolean
  /** Offered right after the spell is cast instead of before (Seeking Spell, after a miss). */
  afterCast?: boolean
  /** What it does, shown in the info popup. A short summary, not the full rule text. */
  description?: string
  note?: string
}

export type PassiveDef = {
  id: string
  name: string
  minLevel: number
  text: TextFormula
  source?: FeatureSource
}

/** A spell a class or subclass always has prepared, optionally with extra ways to pay. */
export type GrantedSpell = {
  spell: Spell
  minLevel: number
  extraPayments?: PaymentOption[]
  note?: TextFormula
}

export type FeatureSet = {
  resources: ResourceDef[]
  actions: ActionDef[]
  passives: PassiveDef[]
  grantedSpells: GrantedSpell[]
  spellModifiers: SpellModifierDef[]
}

export type ClassDef = FeatureSet & {
  id: string
  name: string
  hitDie: number
  /** Class level where the subclass is picked. Every 2024 class picks at 3, so that's the default. */
  subclassLevel?: number
  /** What this class calls its spell modifiers in the UI, e.g. "Metamagic". */
  spellModifierName?: string
  /** Row i = class level i + 1, column j = slots of level j + 1. */
  slotTable: number[][]
}

export type SubclassDef = FeatureSet & {
  id: string
  classId: string
  name: string
}

/** A lineage, ancestry or legacy. Adds features on top of its species. */
export type LineageDef = FeatureSet & {
  id: string
  name: string
}

export type SpeciesDef = FeatureSet & {
  id: string
  name: string
  /** What the book calls the choice: "Lineage", "Draconic Ancestry", "Fiendish Legacy"... */
  lineageLabel?: string
  lineages: LineageDef[]
}

// ---------- State and events ----------

export type TurnState = {
  action: boolean // true = used
  bonus: boolean
  reaction: boolean
  /** A spell slot was already spent on a spell this turn (2024 one-slot rule). */
  slotSpellCast: boolean
  /** A level 1+ spell was cast this turn. Optional so saves from older versions still load. */
  leveledSpellCast?: boolean
  /** No more level 1+ spells this turn (after Quickened Spell). */
  leveledSpellsLocked?: boolean
  /** The spell just cast, while after-cast modifiers (Seeking Spell) can still be used on it. */
  lastSpell?: string | null
  /** Actions unlocked by the last action (follow ups). */
  followUps: string[]
}

export type ActiveEffect = {
  id: number
  name: string
  duration: string
  concentration: boolean
  sourceActionId: string
  endsOnNewTurn?: boolean
}

export type CharacterState = {
  /** Amount used per resource. Negative means above max (created slots). */
  expended: Record<ResourceId, number>
  hp: { current: number; temp: number }
  turn: TurnState
  effects: ActiveEffect[]
  nextEffectId: number
}

export type GameEvent =
  | {
      type: 'PERFORM_ACTION'
      actionId: string
      paymentId: string
      amount?: number // for variable costs
      spellModifiers?: string[]
    }
  | { type: 'USE_ECONOMY'; economy: 'action' | 'bonus' | 'reaction' } // e.g. an attack
  | { type: 'NEW_TURN' }
  /** Hit point dice are spent as part of the short rest. Player rolls and types the total healing. */
  | { type: 'SHORT_REST'; hitDice?: { count: number; healing: number } }
  | { type: 'LONG_REST' }
  | { type: 'DAMAGE'; amount: number }
  | { type: 'HEAL'; amount: number }
  | { type: 'SET_TEMP_HP'; amount: number }
  | { type: 'END_EFFECT'; effectId: number }
  /** Use an after-cast modifier (Seeking Spell) on the spell just cast. */
  | { type: 'AFTER_CAST_MODIFIER'; modifierId: string }
  | { type: 'SKIP_AFTER_CAST' } // player didn't need it (e.g. the attack hit)
  | { type: 'DISMISS_FOLLOW_UPS' } // player skips the follow up (e.g. no Inspiring Smite this time)

/** State = base with every event in the log applied. Undo = drop the last event. */
export type Tracker = {
  base: CharacterState
  log: GameEvent[]
}

export type Check = { ok: true; warnings: string[] } | { ok: false; reason: string }

// ---------- Feats ----------

export type FeatCategory = 'origin' | 'general' | 'fightingStyle'

/** Spells the player picks for a feat. Leveled ones can get a free cast once per long rest. */
export type FeatSpellChoice = {
  level: number
  count: number
  /** What they can pick, shown in the setup form ("a level 1 Divination or Enchantment spell"). */
  hint: string
  /** Each chosen spell can be cast once per long rest without a slot. */
  freeUse?: boolean
}

export type FeatDef = FeatureSet & {
  id: string
  name: string
  category: FeatCategory
  /** Shown as a label only. The app doesn't stop you from taking the feat. */
  prerequisite?: string
  /** One or two lines for the feat picker. */
  summary: string
  spellChoices?: FeatSpellChoice[]
}

/** A background only matters here for the Origin feat it gives. */
export type BackgroundDef = {
  id: string
  name: string
  featId: string
  /** Which version of the feat (Magic Initiate: "Cleric spells"). */
  featNote?: string
}
