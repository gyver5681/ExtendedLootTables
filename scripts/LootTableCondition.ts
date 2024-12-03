import { debuglog } from "./main";
import {
  Entity,
  EntityColorComponent,
  EntityComponentTypes,
  EntityDamageSource,
  EntityEquippableComponent,
  EntityMarkVariantComponent,
  EntityTameableComponent,
  EntityVariantComponent,
  EquipmentSlot,
  ItemEnchantableComponent,
} from "@minecraft/server";
import { MinecraftEnchantmentTypes, MinecraftEntityTypes } from "@minecraft/vanilla-data";

export type ParseConditionInput = {
  condition: string;
  value?: number | string | boolean;
  chance?: number;
  looting_multiplier?: number;
  id?: string;
  operator?: string;
  not?: boolean;
  conditions?: ParseConditionInput[];
};

enum Operators {
  Equals = "",
  NotEquals = "!=",
  LessThanEquals = "<=",
  LessThan = "<",
  GreaterThan = ">",
  GreaterThanEquals = ">=",
}

function EntityLootLevel(entity: Entity): number {
  let lootLevel: number = 0;
  const heldItem: EntityEquippableComponent | undefined = <EntityEquippableComponent | undefined>(
    entity.getComponent(EntityComponentTypes.Equippable)
  );
  if (heldItem) {
    const mainHand = heldItem.getEquipment(EquipmentSlot.Mainhand);
    if (mainHand) {
      const enchantComp: ItemEnchantableComponent | undefined = <ItemEnchantableComponent | undefined>(
        mainHand.getComponent("minecraft:enchantable")
      );
      if (enchantComp) {
        const lootingEnchant = enchantComp.getEnchantment(MinecraftEnchantmentTypes.Looting);
        if (lootingEnchant) lootLevel = lootingEnchant.level;
      }
    }
  }
  return lootLevel;
}

function EntityIsPlayerPet(entity: Entity): boolean {
  let entityIsPet: boolean = false;
  const tameableComponent: EntityTameableComponent | undefined = <EntityTameableComponent | undefined>(
    entity.getComponent(EntityComponentTypes.Tameable)
  );
  if (tameableComponent) {
    entityIsPet = tameableComponent.isTamed;
  }
  return entityIsPet;
}

function TestNumberWithOperator(testValue: number, entityValue: number, operator: Operators): boolean {
  let returnValue: boolean = false;
  switch (operator) {
    case Operators.NotEquals: {
      returnValue = testValue !== entityValue;
      break;
    }
    case Operators.LessThan: {
      returnValue = testValue < entityValue;
      break;
    }
    case Operators.LessThanEquals: {
      returnValue = testValue <= entityValue;
      break;
    }
    case Operators.GreaterThan: {
      returnValue = testValue > entityValue;
      break;
    }
    case Operators.GreaterThanEquals: {
      returnValue = testValue >= entityValue;
      break;
    }
    default: {
      returnValue = testValue === entityValue;
      break;
    }
  }

  return returnValue;
}

export class LootTableCondition {
  // Parameters
  type: LootTableConditionTypes;
  value?: number | string | boolean;
  chance: number;
  lootingMultiplier: number;
  id: string;
  operator: string;
  not: boolean;
  conditions: LootTableCondition[];

  constructor() {
    this.type = LootTableConditionTypes.Always;
    this.chance = 0;
    this.lootingMultiplier = 0;
    this.id = "";
    this.operator = "";
    this.not = false;
    this.conditions = [];
  }

  testCondition(deadEntity: Entity, damageSource: EntityDamageSource): boolean {
    let returnFlag: boolean = true;
    switch (this.type) {
      case LootTableConditionTypes.Always: {
        if (debuglog) {
          console.warn(`Test HasVariant`);
        }
        break;
      }
      case LootTableConditionTypes.HasMarkVariant: {
        if (debuglog) {
          console.warn(`Test HasMarkVariant`);
        }
        const variant = deadEntity.getComponent("minecraft:mark_variant");
        if (variant && typeof this.value === "number") {
          if (debuglog) {
            console.warn(`mark_variant component found: ${(<EntityMarkVariantComponent>variant).value}`);
          }
          returnFlag = TestNumberWithOperator(
            (<EntityMarkVariantComponent>variant).value,
            this.value,
            <Operators>this.operator
          );
        } else {
          if (debuglog) {
            console.warn(`mark_variant component not found`);
          }
          returnFlag = false;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.HasVariant: {
        if (debuglog) {
          console.warn(`Test HasVariant`);
        }
        const variant = deadEntity.getComponent("minecraft:variant");
        if (variant && typeof this.value === "number") {
          if (debuglog) {
            console.warn(`variant component found: ${(<EntityVariantComponent>variant).value}`);
          }
          returnFlag = TestNumberWithOperator(
            (<EntityVariantComponent>variant).value,
            this.value,
            <Operators>this.operator
          );
        } else {
          if (debuglog) {
            console.warn(`variant component not found`);
          }
          returnFlag = false;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.KilledByPlayerOrPets: {
        if (debuglog) {
          console.warn(`Test KilledByPlayerOrPets`);
        }
        returnFlag = false;
        if (damageSource.damagingEntity) {
          if (
            damageSource.damagingEntity.typeId === MinecraftEntityTypes.Player ||
            EntityIsPlayerPet(damageSource.damagingEntity)
          ) {
            returnFlag = true;
          }
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.RandomChance: {
        if (debuglog) {
          console.warn(`Test RandomChance`);
        }
        if (Math.random() > this.chance) {
          returnFlag = false;
        }
        break;
      }
      case LootTableConditionTypes.KilledByPlayer: {
        if (debuglog) {
          console.warn(`Test KilledByPlayer`);
        }
        returnFlag = false;
        if (damageSource.damagingEntity && damageSource.damagingEntity.typeId === MinecraftEntityTypes.Player) {
          returnFlag = true;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.RandomChanceWithLooting: {
        if (debuglog) {
          console.warn(`Test RandomChanceWithLooting`);
        }
        let chance: number = this.chance;
        if (damageSource.damagingEntity) {
          let lootLevel: number = EntityLootLevel(damageSource.damagingEntity);
          if (debuglog) {
            console.warn(`LootLevel (${lootLevel})`);
          }
          chance += this.lootingMultiplier * lootLevel;
        }

        if (Math.random() > chance) {
          returnFlag = false;
        }
        break;
      }
      // Extended, non-vanilla conditions
      case LootTableConditionTypes.HasComponent: {
        if (debuglog) {
          console.warn(`Test HasComponent ${this.id}`);
        }
        returnFlag = deadEntity.hasComponent(this.id);
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.HasProperty: {
        if (debuglog) {
          console.warn(`Test HasProperty ${this.id}`);
        }
        let testProperty = deadEntity.getProperty(this.id);
        if (typeof testProperty === "undefined") {
          if (debuglog) {
            console.warn(`testProperty undefined`);
          }
          returnFlag = false;
        } else {
          if (debuglog) {
            console.warn(`testProperty: ${testProperty}`);
          }
          returnFlag = true;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.HasTag: {
        if (debuglog) {
          console.warn(`Test HasTag ${this.id}`);
        }
        returnFlag = deadEntity.hasTag(this.id);
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.Or: {
        if (debuglog) {
          console.warn(`Test Or`);
        }
        if (this.conditions.length) {
          returnFlag = false;
          for (let i: number = 0; i < this.conditions.length && !returnFlag; i++) {
            let testCondition = this.conditions[i];
            returnFlag = testCondition.testCondition(deadEntity, damageSource);
            if (debuglog) {
              console.warn(`Condition [${i}] ${returnFlag}`);
            }
          }
        }
        if (this.not) returnFlag = !returnFlag;
        if (debuglog) {
          console.warn(`Test Or Done`);
        }
        break;
      }
      case LootTableConditionTypes.ColorComponent: {
        returnFlag = false;
        if (debuglog) {
          console.warn(`Test ColorComponent`);
        }
        let testComponent: EntityColorComponent | undefined = <EntityColorComponent | undefined>(
          deadEntity.getComponent(EntityComponentTypes.Color)
        );
        if (debuglog) {
          console.warn(`typeof testComponent: (${typeof testComponent}) typeof this.value: (${typeof this.value})`);
        }
        if (testComponent && typeof this.value === "number") {
          returnFlag = TestNumberWithOperator(testComponent.value, this.value, <Operators>this.operator);
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.BoolProperty: {
        returnFlag = false;
        if (debuglog) {
          console.warn(`Test BoolProperty`);
        }
        let testProperty = deadEntity.getProperty(this.id);
        if (typeof testProperty === "boolean") {
          returnFlag = testProperty;
          if (this.operator === "!=") {
            returnFlag = !returnFlag;
          }
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.StringProperty: {
        returnFlag = false;
        if (debuglog) {
          console.warn(`Test StringProperty`);
        }
        let testProperty = deadEntity.getProperty(this.id);
        if (debuglog) {
          console.warn(`typeof testProperty: (${typeof testProperty}) typeof this.value: (${typeof this.value})`);
        }
        if (typeof testProperty === "string" && typeof this.value === "string") {
          returnFlag = `${testProperty}` === `${this.value}`;
          if (debuglog) {
            console.warn(`Property matches Value`);
          }
        }
        if (this.operator === "!=") {
          returnFlag = !returnFlag;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.NumberProperty: {
        returnFlag = false;
        if (debuglog) {
          console.warn(`Test NumberProperty`);
        }

        let testProperty = deadEntity.getProperty(this.id);
        if (debuglog) {
          console.warn(`typeof testProperty: (${typeof testProperty}) typeof this.value: (${typeof this.value})`);
        }
        if (typeof testProperty === "number" && typeof this.value === "number") {
          returnFlag = TestNumberWithOperator(testProperty, this.value, <Operators>this.operator);
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      case LootTableConditionTypes.IsNamed: {
        if (debuglog) {
          console.warn(`Test IsNamed`);
        }
        returnFlag = `${deadEntity.nameTag}` === `${this.id}`;
        if (this.operator === "!=") {
          returnFlag = !returnFlag;
        }
        if (this.not) returnFlag = !returnFlag;
        break;
      }
      default:
        returnFlag = false;
    }

    return returnFlag;
  }

  // Methods
  parse(input: ParseConditionInput): void {
    if ((<string[]>Object.values(LootTableConditionTypes)).includes(input.condition)) {
      this.type = <LootTableConditionTypes>input.condition;
    } else {
      this.type = LootTableConditionTypes.Always;
    }
    if (typeof input.value !== "undefined") {
      this.value = input.value;
    }
    if (typeof input.chance === "number") {
      this.chance = input.chance;
    }
    if (typeof input.looting_multiplier === "number") {
      this.lootingMultiplier = input.looting_multiplier;
    }
    if (typeof input.id === "string") {
      this.id = input.id;
    }
    if (typeof input.operator === "string") {
      this.operator = input.operator;
    }
    if (typeof input.not === "boolean") {
      this.not = input.not;
    }
    if (this.type === LootTableConditionTypes.Or) {
      if (debuglog) {
        console.warn(`Or Type: ${LootTableConditionTypes.Or}`);
      }
      if (input.conditions) {
        if (debuglog) {
          console.warn(`conditions found: ${JSON.stringify(input.conditions)}`);
        }
        this.conditions = [];
        const inputConditions: ParseConditionInput[] = <ParseConditionInput[]>input.conditions;
        if (this.conditions) {
          inputConditions.forEach((element) => {
            let tableCondition: LootTableCondition = new LootTableCondition();
            tableCondition.parse(element);
            this.conditions.push(tableCondition);
          });
        }
      }
    }
  }

  stringify(): string {
    let output: string = "";
    switch (this.type) {
      case LootTableConditionTypes.HasMarkVariant: {
        output = `{ "condition": "${LootTableConditionTypes.HasMarkVariant}"`;
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(`, "value": ${this.value} }`);
        break;
      }
      case LootTableConditionTypes.HasVariant: {
        output = `{ "condition": "${LootTableConditionTypes.HasVariant}"`;
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(`, "value": ${this.value} }`);
        break;
      }
      case LootTableConditionTypes.KilledByPlayerOrPets: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayerOrPets}"`;
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.RandomChance: {
        output = `{ "condition": "${LootTableConditionTypes.RandomChance}", "chance": ${this.chance} }`;
        break;
      }
      case LootTableConditionTypes.KilledByPlayer: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayer}" }`;
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.RandomChanceWithLooting: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayer}", "chance": ${this.chance}, "looting_multiplier": ${this.lootingMultiplier} }`;
        break;
      }
      // Extended, non-vanilla conditions
      case LootTableConditionTypes.HasComponent: {
        output = `{ "condition": "${LootTableConditionTypes.HasComponent}"`;
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(`, "id": "${this.id}" }`);
        break;
      }
      case LootTableConditionTypes.HasProperty: {
        output = `{ "condition": "${LootTableConditionTypes.HasProperty}"`;
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(`, "id": "${this.id}" }`);
        break;
      }
      case LootTableConditionTypes.HasTag: {
        output = `{ "condition": "${LootTableConditionTypes.HasTag}"`;
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(`, "id": "${this.id}" }`);
        break;
      }
      case LootTableConditionTypes.Or: {
        output = `{ "condition": "${LootTableConditionTypes.Or}"`;
        if (this.conditions.length > 0) {
          output = output.concat(', "conditions": [ ');
          this.conditions.forEach((condition) => {
            const JsonString: string = condition.stringify();
            if (`${JsonString}` != "") {
              output = output.concat(`${JsonString}, `);
            }
          });
          output = output.concat("]");
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat("}");
        break;
      }
      case LootTableConditionTypes.ColorComponent: {
        output = `{ "condition": "${LootTableConditionTypes.ColorComponent}"`;
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (typeof this.value === "number") {
          output = output.concat(`, "value": "${this.value}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.BoolProperty: {
        output = `{ "condition": "${LootTableConditionTypes.BoolProperty}"`;
        output = output.concat(`, "id": "${this.id}"`);
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.StringProperty: {
        output = `{ "condition": "${LootTableConditionTypes.StringProperty}"`;
        output = output.concat(`, "id": "${this.id}"`);
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (typeof this.value === "string") {
          output = output.concat(`, "value": "${this.value}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.NumberProperty: {
        output = `{ "condition": "${LootTableConditionTypes.NumberProperty}"`;
        output = output.concat(`, "id": "${this.id}"`);
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (typeof this.value === "number") {
          output = output.concat(`, "value": "${this.value}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
      case LootTableConditionTypes.IsNamed: {
        output = `{ "condition": "${LootTableConditionTypes.IsNamed}"`;
        output = output.concat(`, "id": "${this.id}"`);
        if (this.operator != "") {
          output = output.concat(`, "operator": "${this.operator}"`);
        }
        if (this.not) {
          output = output.concat(`, "not": true`);
        }
        output = output.concat(` }`);
        break;
      }
    }
    return output;
  }
}

export enum LootTableConditionTypes {
  Always = "always",
  HasMarkVariant = "has_mark_variant",
  HasVariant = "has_variant",
  KilledByPlayerOrPets = "killed_by_player_or_pets",
  RandomChance = "random_chance",
  KilledByPlayer = "killed_by_player",
  RandomChanceWithLooting = "random_chance_with_looting",
  // Extended, non-vanilla conditions
  HasComponent = "has_component",
  HasProperty = "has_property",
  HasTag = "has_tag",
  Or = "or",
  ColorComponent = "color_component",
  BoolProperty = "bool_property",
  StringProperty = "string_property",
  NumberProperty = "number_property",
  IsNamed = "is_named",
}
