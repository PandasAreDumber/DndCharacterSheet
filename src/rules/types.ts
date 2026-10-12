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
  note?: string
}

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
  spells: Spell[] // spells the player added themselves
  spellModifiers: string[] // chosen options like Metamagic, by id
}

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
  note?: string
}

export type PassiveDef = {
  id: string
  name: string
  minLevel: number
  text: TextFormula
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
  | { type: 'DISMISS_FOLLOW_UPS' } // player skips the follow up (e.g. no Inspiring Smite this time)

/** State = base with every event in the log applied. Undo = drop the last event. */
export type Tracker = {
  base: CharacterState
  log: GameEvent[]
}

export type Check = { ok: true; warnings: string[] } | { ok: false; reason: string }
