import {
  world,
  system,
  ScriptEventCommandMessageAfterEvent,
  ScriptEventSource,
  EntityDieAfterEvent,
  Entity,
  EntityDamageSource,
} from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";

import LootTablePool from "./LootTablePool";

// Constants
export const debuglog: boolean = false;
const EventNamespace: string = "ExtLootTables";
const ELTregisterAddon: string = `${EventNamespace}:registerAddon`;
const ELTaddLootEntry: string = `${EventNamespace}:addLootEntry`;

const CallbackRegisterResponse: string = "registerAddonResponse";
const CallbackAddLootEntryResponse: string = "AddLootEntryResponse";

// Global Variables
let g_CallbackRegistry: Map<string, string> = new Map<string, string>();
let g_MobLootEntries: Map<string, LootTablePool[]> = new Map<string, LootTablePool[]>();

// Functions

function SendResponse(command: string): void {
  if (debuglog) {
    console.warn(`ELT: sending response (${command})`);
  }
  world.getDimension(MinecraftDimensionTypes.Overworld).runCommandAsync(command);
}

function EntityDieEventHandler(event: EntityDieAfterEvent): void {
  const EntityID = event.deadEntity.typeId;
  if (debuglog) {
    console.warn(`${EntityID} Died`);
  }
  if (g_MobLootEntries.has(EntityID)) {
    if (debuglog) {
      console.warn(`${EntityID} Died`);
    }
    const lootTable: LootTablePool[] = <LootTablePool[]>g_MobLootEntries.get(EntityID);
    const deadEntity: Entity = event.deadEntity;
    const source: EntityDamageSource = event.damageSource;
    if (debuglog) {
      console.warn(`Processing ${lootTable.length} Pool(s)`);
    }
    lootTable.forEach((pool) => {
      pool.processPool(deadEntity, source);
    });
  }
}

function ExtLootTableEventHandler(event: ScriptEventCommandMessageAfterEvent): void {
  if (event.sourceType === ScriptEventSource.Server) {
    switch (event.id) {
      // Register an Addon
      case ELTregisterAddon: {
        if (debuglog) {
          console.warn(`Received ${ELTregisterAddon}`);
        }
        let { callbackNamespace, callbackID } = JSON.parse(event.message);
        if (!g_CallbackRegistry.has(callbackID)) {
          g_CallbackRegistry.set(callbackID, callbackNamespace);
          const responseEventName: string = `${callbackNamespace}:${CallbackRegisterResponse}`;
          const command: string = `scriptevent ${responseEventName} {"rc":0}`;
          SendResponse(command);
        }
        break;
      }
      // Add a Loot Entry
      case ELTaddLootEntry: {
        if (debuglog) {
          console.warn(`Received ${ELTaddLootEntry}`);
          console.warn(`event.message (${event.message})`);
          console.warn(`event.message.length ${event.message.length}`);
        }
        const callbackIDEnd = event.message.indexOf(" ");
        if (debuglog) {
          console.warn(`callbackIDEnd ${callbackIDEnd}`);
        }
        if (callbackIDEnd < event.message.length) {
          const callbackID = event.message.substring(0, callbackIDEnd);
          if (debuglog) {
            console.warn(`callbackID (${callbackID})`);
          }
          const callbackName = g_CallbackRegistry.get(callbackID);
          if (callbackName) {
            if (debuglog) {
              console.warn(`callbackName (${callbackName})`);
            }
            let returnCode = 0;
            const entityTypeBegin = callbackIDEnd + 1;
            const entityTypeEnd = event.message.indexOf(" ", entityTypeBegin);
            const lootTablePoolBegin = entityTypeEnd + 1;
            if (debuglog) {
              console.warn(
                `entityTypeBegin ${entityTypeBegin}, entityTypeEnd ${entityTypeEnd}, lootTablePoolBegin ${lootTablePoolBegin}`
              );
            }
            if (lootTablePoolBegin < event.message.length) {
              const entityType: string = event.message.substring(entityTypeBegin, entityTypeEnd);
              if (debuglog) {
                console.warn(`entityType (${entityType})`);
              }
              const lootTablePoolJSON: string = event.message.substring(lootTablePoolBegin);
              if (debuglog) {
                console.warn(`lootTablePoolJSON (${lootTablePoolJSON})`);
              }
              let lootTablePool: LootTablePool = new LootTablePool();
              lootTablePool.parse(lootTablePoolJSON);
              if (g_MobLootEntries.has(entityType)) {
                (<LootTablePool[]>g_MobLootEntries.get(entityType)).push(lootTablePool);
              } else {
                g_MobLootEntries.set(entityType, [lootTablePool]);
              }
            } else {
              returnCode = 1;
            }

            const responseEventName: string = `${callbackName}:${CallbackAddLootEntryResponse}`;
            const command: string = `scriptevent ${responseEventName} {"rc":${returnCode}}`;
            SendResponse(command);
          } else {
            if (debuglog) {
              console.warn(`callbackName not found`);
            }
          }
        }
        break;
      }
    }
  }
}

system.afterEvents.scriptEventReceive.subscribe(ExtLootTableEventHandler, { namespaces: [EventNamespace] });
world.afterEvents.entityDie.subscribe(EntityDieEventHandler);
