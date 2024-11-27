import { debuglog } from "./main";
import { system, ItemStack, Dimension, Vector3 } from "@minecraft/server";

interface LootDropInfo {
  dimension: Dimension;
  location: Vector3;
  item: ItemStack;
  time: number;
}

// globals
let g_LootDropArray: Array<LootDropInfo> = new Array<LootDropInfo>();
let g_JobRunning: boolean = false;

function* ProcessLootDropQueue() {
  g_JobRunning = true;
  if (debuglog) {
    console.warn("Job Running");
  }
  do {
    let entry = g_LootDropArray.shift();
    if (entry) {
      if (Date.now() - entry.time < 300000) {
        try {
          entry.dimension.spawnItem(entry.item, entry.location);
          if (debuglog) {
            console.warn(`entry success ${entry.item.typeId} at ${JSON.stringify(entry.location)}`);
          }
        } catch {
          if (debuglog) {
            if (!(system.currentTick % 1000)) {
              console.warn(`entry unsuccessful ${entry.item.typeId}`);
            }
          }
          g_LootDropArray.push(entry);
        }
      } else {
        if (debuglog) {
          console.warn(`entry timeout ${entry.item.typeId}`);
        }
      }
    }
    yield;
  } while (g_LootDropArray.length > 0);
  g_JobRunning = false;
  if (debuglog) {
    console.warn("Job Done");
  }
}

function StartIfNotRunning() {
  if (g_LootDropArray.length && !g_JobRunning) {
    system.runJob(ProcessLootDropQueue());
  }
}

export function QueueLootDrop(dimensionIn: Dimension, locationIn: Vector3, itemIn: ItemStack, timeIn: number): void {
  let lootDrop: LootDropInfo = { dimension: dimensionIn, location: locationIn, item: itemIn, time: timeIn };
  g_LootDropArray.push(lootDrop);
  StartIfNotRunning();
}
