import { debuglog } from "./main";
import { Entity, ItemStack } from "@minecraft/server";
import { LootTableCondition, ParseConditionInput } from "./LootTableCondition";

export type ParseLootTableEntryInput = {
  type: string;
  name?: string;
  weight?: number;
  conditions?: ParseConditionInput[];
};

export class LootTableEntry {
  // Parameters
  type: LootTableEntryTypes;
  name: string;
  weight: number;
  conditions: LootTableCondition[];

  constructor() {
    this.type = LootTableEntryTypes.Item;
    this.name = "";
    this.weight = 1;
    this.conditions = [];
  }

  // Methods

  dropLoot(deadEntity: Entity): void {
    if (debuglog) {
      console.warn(`dropping ${this.name} x (1) at: ${JSON.stringify(deadEntity.location)}`);
    }
    deadEntity.dimension.spawnItem(new ItemStack(this.name, 1), deadEntity.location);
  }

  parse(input: ParseLootTableEntryInput): void {
    if ((<string[]>Object.values(LootTableEntryTypes)).includes(input.type)) {
      this.type = <LootTableEntryTypes>input.type;
    }
    if (input.name) {
      this.name = input.name;
    }
    if (typeof input.weight === "number") {
      this.weight = input.weight;
    }
    if (input.conditions) {
      if (debuglog) {
        console.warn(`conditions found: ${JSON.stringify(input.conditions)}`);
      }
      const inputConditions: ParseConditionInput[] = <ParseConditionInput[]>input.conditions;
      inputConditions.forEach((element) => {
        let tableCondition: LootTableCondition = new LootTableCondition();
        tableCondition.parse(element);
        this.conditions.push(tableCondition);
      });
    }
  }

  stringify(): string {
    let output: string = "";
    switch (this.type) {
      case LootTableEntryTypes.Item: {
        output = `{ "type": "${LootTableEntryTypes.Item}", "name": "${this.name}", "weight": ${this.weight}`;
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
        output = output.concat("}");
        break;
      }
    }

    return output;
  }
}

export enum LootTableEntryTypes {
  Item = "item",
}
