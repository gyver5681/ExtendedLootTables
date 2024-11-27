import { debuglog } from "./main";
import {
  Entity,
  EntityComponentTypes,
  EntityDamageSource,
  EntityEquippableComponent,
  EntityTameableComponent,
  EntityVariantComponent,
  EquipmentSlot,
  ItemEnchantableComponent,
} from "@minecraft/server";
import { MinecraftEnchantmentTypes, MinecraftEntityTypes } from "@minecraft/vanilla-data";

export type ParseConditionInput = {
  condition: string;
  value?: number;
  chance?: number;
  looting_multiplier?: number;
};

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

export class LootTableCondition {
  // Parameters
  type: LootTableConditionTypes;
  value: number;
  chance: number;
  lootingMultiplier: number;

  constructor() {
    this.type = LootTableConditionTypes.Always;
    this.value = 0;
    this.chance = 0;
    this.lootingMultiplier = 0;
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
        if (variant) {
          if (debuglog) {
            console.warn(`mark_variant component found: ${(<EntityVariantComponent>variant).value}`);
          }
          returnFlag = (<EntityVariantComponent>variant).value === this.value;
        } else {
          if (debuglog) {
            console.warn(`mark_variant component not found`);
          }
          returnFlag = false;
        }
        break;
      }
      case LootTableConditionTypes.HasVariant: {
        if (debuglog) {
          console.warn(`Test HasVariant`);
        }
        const variant = deadEntity.getComponent("minecraft:variant");
        if (variant) {
          if (debuglog) {
            console.warn(`variant component found: ${(<EntityVariantComponent>variant).value}`);
          }
          returnFlag = (<EntityVariantComponent>variant).value === this.value;
        } else {
          if (debuglog) {
            console.warn(`variant component not found`);
          }
          returnFlag = false;
        }
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
    if (typeof input.value === "number") {
      this.value = input.value;
    }
    if (typeof input.chance === "number") {
      this.chance = input.chance;
    }
    if (typeof input.looting_multiplier === "number") {
      this.lootingMultiplier = input.looting_multiplier;
    }
  }

  stringify(): string {
    let output: string = "";
    switch (this.type) {
      case LootTableConditionTypes.HasMarkVariant: {
        output = `{ "condition": "${LootTableConditionTypes.HasMarkVariant}", "value": ${this.value} }`;
        break;
      }
      case LootTableConditionTypes.HasVariant: {
        output = `{ "condition": "${LootTableConditionTypes.HasVariant}", "value": ${this.value} }`;
        break;
      }
      case LootTableConditionTypes.KilledByPlayerOrPets: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayerOrPets}" }`;
        break;
      }
      case LootTableConditionTypes.RandomChance: {
        output = `{ "condition": "${LootTableConditionTypes.RandomChance}", "chance": ${this.chance} }`;
        break;
      }
      case LootTableConditionTypes.KilledByPlayer: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayer}" }`;
        break;
      }
      case LootTableConditionTypes.RandomChanceWithLooting: {
        output = `{ "condition": "${LootTableConditionTypes.KilledByPlayer}", "chance": ${this.chance}, "looting_multiplier": ${this.lootingMultiplier} }`;
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
}
