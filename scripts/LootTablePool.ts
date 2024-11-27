import { debuglog } from "./main";
import { Entity, EntityDamageSource } from "@minecraft/server";
import { LootTableCondition, ParseConditionInput } from "./LootTableCondition";
import { LootTableEntry, ParseLootTableEntryInput } from "./LootTableEntry";

export default class LootTablePool {
  // Parameters
  rolls: number;
  conditions: LootTableCondition[];
  entries: LootTableEntry[];

  constructor() {
    this.rolls = 1;
    this.conditions = [];
    this.entries = [];
  }

  // Methods

  processPool(deadEntity: Entity, damageSource: EntityDamageSource): void {
    if (debuglog) {
      console.warn(`Processing ${this.rolls} Rolls(s)`);
    }

    for (let rollcount: number = 0; rollcount < this.rolls; rollcount++) {
      let rollEntry = true;
      if (debuglog) {
        console.warn(`Processing ${this.conditions.length} Condition(s)`);
      }
      if (this.conditions.length) {
        for (let i: number = 0; i < this.conditions.length && rollEntry; i++) {
          let testCondition = this.conditions[i];
          rollEntry = testCondition.testCondition(deadEntity, damageSource);
        }
      }
      if (rollEntry) {
        if (debuglog) {
          console.warn(`Condition(s) passed, processing ${this.entries.length} Entries`);
        }
        if (this.entries.length) {
          // Conditions Passed, Calc the Weights and Roll the Pool entries
          let weightedIndexes: number[] = [];
          for (let i: number = 0; i < this.entries.length; i++) {
            let includeEntry: boolean = true;
            if (debuglog) {
              console.warn(`Processing ${this.entries[i].conditions.length} Condition(s)`);
            }
            if (this.entries[i].conditions.length) {
              for (let j: number = 0; j < this.entries[i].conditions.length && includeEntry; j++) {
                let testCondition = this.entries[i].conditions[j];
                includeEntry = testCondition.testCondition(deadEntity, damageSource);
              }
            }
            if (includeEntry) {
              if (debuglog) {
                console.warn(`Condition(s) passed, Entry ${i} included`);
              }
              for (let x: number = 0; x < this.entries[i].weight; x++) {
                weightedIndexes.push(i);
              }
            }
          }
          if (debuglog) {
            console.warn(`weightedIndexes count: ${weightedIndexes.length} Entries`);
          }
          const rolledIndex: number = weightedIndexes[Math.floor(Math.random() * weightedIndexes.length)];
          if (debuglog) {
            console.warn(`rolledIndex: ${weightedIndexes.length}`);
          }
          const rolledEntry: LootTableEntry = this.entries[rolledIndex];
          rolledEntry.dropLoot(deadEntity);
        }
      }
    }
  }

  parse(input: string): void {
    const inputObject = JSON.parse(input);
    if (inputObject) {
      if (inputObject.hasOwnProperty("rolls")) {
        this.rolls = inputObject.rolls;
        if (debuglog) {
          console.warn(`rolls found: ${this.rolls}`);
        }
      }
      if (inputObject.hasOwnProperty("conditions")) {
        if (debuglog) {
          console.warn(`conditions found: ${JSON.stringify(inputObject.conditions)}`);
        }
        const inputConditions: ParseConditionInput[] = <ParseConditionInput[]>inputObject.conditions;
        inputConditions.forEach((element) => {
          let tableCondition: LootTableCondition = new LootTableCondition();
          tableCondition.parse(element);
          this.conditions.push(tableCondition);
        });
      }
      if (inputObject.hasOwnProperty("entries")) {
        if (debuglog) {
          console.warn(`entries found: ${JSON.stringify(inputObject.entries)}`);
        }
        const inputEntries: ParseLootTableEntryInput[] = <ParseLootTableEntryInput[]>inputObject.entries;
        inputEntries.forEach((element) => {
          let tableEntry: LootTableEntry = new LootTableEntry();
          tableEntry.parse(element);
          this.entries.push(tableEntry);
        });
      }
    } else {
      if (debuglog) {
        console.warn(`Unable to Parse Pool JSON`);
      }
    }
  }

  stringify(): string {
    let output: string = `{ "rolls": ${this.rolls}`;
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
    if (this.entries.length > 0) {
      output = output.concat(', "entries": [ ');
      this.entries.forEach((entry) => {
        const JsonString: string = entry.stringify();
        if (`${JsonString}` != "") {
          output = output.concat(`${JsonString}, `);
        }
      });
      output = output.concat("]");
    }
    return output;
  }
}
