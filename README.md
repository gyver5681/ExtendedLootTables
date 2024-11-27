# ExtendedLootTables
Extended Loot Tables Behavior Pack.

Extend Entity on death Loot Tables via script, instead of overriding vanilla entity and loot table files in your behavior pack.

This addon does not yet cover all loot table conditions or scenarios in which loot tables can be used in the game. I'll do my best to add more functionality, but I'm also more than happy to accept pull requests from anyone looking to add to the project.

How To:

Modify your Behavior Pack's manifest:
You'll want to indicate to the game that your behavior pack requires this addon by adding an entry to your addon's dependencies array.

```json
"dependencies": [
  {
    "module_name": "@minecraft/server",
    "version": "1.15.0"
  },
  {
    "uuid": "792854bf-38d5-445c-9b12-b22f01762576",
    "version": [1, 0, 0]
  }
]
```
Make sure both the uuid and the version number matches the version of the Extended Loot Tables addon you've downloaded.

There are two functions that are sent to this addon, via Script Events sent from the server.

These are:

- "ExtLootTables:registerAddon"
- "ExtLootTables:addLootEntry"

Registering your Addon for callbacks:
Registering your addon tells Extended Loot Tables what the namespace is for your addon to send responses to and allows you to assign an alias ID that you can randomly generate at runtime for additional security. You'll send the ID for subsequent calls and will receive responses at your addon's namespace. If you don't want to use a different ID, then just send your namespace again in the callback ID field.

During your addon's intitialization, you'll want to send the following commmand
```ts
let command = `scriptevent ExtLootTables:registerAddon { "callbackNamespace": "${EventNamespace}", "callbackID": "${EventRequestID}" } `
```
Where the EventNamespace is the namespace you're listening for responses from and the EventRequestID is the alias you will send when you add loot entries.

Once this addon processes your registration function, it'll send a response via scriptevent
The event ID will be `${EventNamespace}:registerAddonResponse` and will contain the message `{"rc":${returnCode}}`.
Where the returnCode will be 0. Any followup calls to register the same namespace will be ignored as long as the world is loaded.

Adding a Loot table Pool:
Adding a Pool is done in a similar fashion you'll send a command via script event as follows

```ts
let command = `scriptevent ExtLootTables:addLootEntry ${EventRequestID} ${entityTypeID} ${lootTablePoolJSON}`
```
Your Event Request ID will be the aliase you registered in the previous step.
The `entityTypeID` is the ID for the entity "minecraft:bat", for example.
`lootTablePoolJSON` is the JSON string for a loot table pool like what you would use in the Resource Pack JSON.

Here's an example for a custom Bat Mob Head item that I want to drop when the bat dies
```json
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
  }
```
Flattening the JSON string down and putting the whole command together would look something like this:

```ts
let command = `scriptevent ExtLootTables:addLootEntry ${EventRequestID} minecraft:bat { "rolls": 1, "entries": [{ "type": "item", "name": "moremobheads:bat_head", "weight": 1 }], "conditions": [{ "condition": "killed_by_player" }, { "condition": "random_chance_with_looting", "chance": 0.12, "looting_multiplier": 0.02 }]}`
```
No changes will be made to the existing vanilla loot tables, these additional entries will be processed via the AfterEntityDie world event in script.

Currently supported conditions:

- "has_mark_variant"
- "has_variant"
- "killed_by_player_or_pets"
- "random_chance"
- "killed_by_player"
- "random_chance_with_looting"
