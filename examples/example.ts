// Main example for using this addon
import { world, system, ScriptEventCommandMessageAfterEvent, ScriptEventSource } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";

// Constants
// Namespace your addon is listening for for callbacks.
const EventNamespace: string = "ExampleNamespace";
const CallbackRegisterResponse: string = `${EventNamespace}:registerAddonResponse`;
const CallbackAddLootEntryResponse: string = `${EventNamespace}:AddLootEntryResponse`;

// RequestID generated randomly when the server loads so other addons can't just send requests on our behalf.
const EventRequestID: string = `${Math.floor(Math.random() * 100000000)}`;

//ExtendedLootTable command lits
const ELTEventNamespace: string = "ExtLootTables";
const ELTregisterAddon: string = `${ELTEventNamespace}:registerAddon`;
const ELTaddLootEntry: string = `${ELTEventNamespace}:addLootEntry`;

type LootTablePool = {
  entityTypeID: string;
  lootTablePool: string;
};

// Loot Tables
const Allay: LootTablePool = {
  entityTypeID: "minecraft:allay",
  lootTablePool: `
  { 
    "rolls": 1, 
    "entries": [ 
      { "type": "item", 
        "name": "moremobheads:allay_head", 
        "weight": 1 
      }], 
    "conditions": [ 
      { "condition": "killed_by_player" }, 
      { "condition": "random_chance_with_looting", 
        "chance": 0.21, 
        "looting_multiplier": 0.01 
      }] 
  }`,
};

const Bat: LootTablePool = {
  entityTypeID: "minecraft:bat",
  lootTablePool: `
  { 
    "rolls": 1, 
    "entries": [ 
      { "type": "item", 
        "name": "moremobheads:bat_head", 
        "weight": 1 
      }], 
    "conditions": [ 
      { "condition": "killed_by_player" }, 
      { "condition": "random_chance_with_looting", 
        "chance": 0.12, 
        "looting_multiplier": 0.02 
      }] 
  }`,
};

// Globals

let g_LootTableArray: LootTablePool[] = [];

// Functions
function BuildLootTableArray() {
  g_LootTableArray.push(Allay);
  g_LootTableArray.push(Bat);
}

function GetNextPool(): LootTablePool | undefined {
  return g_LootTableArray.pop();
}

function SendCommand(command: string): void {
  world.getDimension(MinecraftDimensionTypes.Overworld).runCommandAsync(command);
}

function SendLootTable(pool: LootTablePool): void {
  SendCommand(`scriptevent ${ELTaddLootEntry} ${EventRequestID} ${pool.entityTypeID} ${pool.lootTablePool}`);
}

function ExtLootTableEventHandler(event: ScriptEventCommandMessageAfterEvent): void {
  if (event.sourceType === ScriptEventSource.Server) {
    switch (event.id) {
      case CallbackRegisterResponse: {
        // You can check for a return code here if you like
        system.runTimeout(() => {
          let nextPool = GetNextPool();
          if (nextPool) SendLootTable(nextPool);
        }, 20);
        break;
      }
      case CallbackAddLootEntryResponse: {
        // You can check for a return code here if you like
        system.run(() => {
          let nextPool = GetNextPool();
          if (nextPool) SendLootTable(nextPool);
        });
        break;
      }
    }
  }
}

function InitLootTables(): void {
  system.afterEvents.scriptEventReceive.subscribe(ExtLootTableEventHandler, { namespaces: [EventNamespace] });
  BuildLootTableArray();
  // Register with the ExtendedLootTables addon
  system.runTimeout(() => {
    SendCommand(
      `scriptevent ${ELTregisterAddon} { "callbackNamespace": "${EventNamespace}", "callbackID": "${EventRequestID}" } `
    );
  }, 20);
}

// Event Subscription that will trigger everything during world init.
world.afterEvents.worldInitialize.subscribe((event) => {
  system.runTimeout(() => {
    InitLootTables();
  }, 50);
});
