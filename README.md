# Litematica Converter (1.12 ~ 26.3+)

A powerful, standalone web and CLI converter for Minecraft `.litematic` schematic files. Supports bidirectional conversion across all versions of Minecraft from **1.12.2** to **26.3+**.

## 🌐 Online Converter

**[https://masa.harusarri.kr](https://masa.harusarri.kr)** (or [https://harusarri.github.io/litematica-converter/](https://harusarri.github.io/litematica-converter/))

---

## 🚀 Features

- **Full Version Span (1.12.2 ~ 26.3+)**:
  - **Format v7**: Minecraft 26.1, 26.2, 26.3, 1.21.x, and 1.20.5 / 1.20.6 (Data Components era)
  - **Format v6**: Minecraft 1.18 through 1.20.4
  - **Format v5**: Minecraft 1.13 through 1.17.1 (Post-Flattening era)
  - **Format v4**: Minecraft 1.12.2 and older (Pre-Flattening era)
  - **Custom DataVersion**: Enter any snapshot or custom DataVersion.

- **Bidirectional Item & Container Conversion**:
  - **Quantity Tag**: Accurately converts `Count` (byte, $\le$ 1.20.4) $\leftrightarrow$ `count` (int, $\ge$ 1.20.5). Prevents items from disappearing when downgrading!
  - **Data Components $\leftrightarrow$ NBT Tag**: Automatically maps modern `components` (`custom_data`, `damage`, `repair_cost`, `custom_name`, `lore`, `enchantments`, `stored_enchantments`, `potion_contents`) to legacy `tag` compounds and vice-versa.
  - Recursively converts nested items inside chests, shulker boxes, droppers, dispensers, hoppers, item frames, armor stands, etc.

- **Bidirectional Sign Conversion**:
  - Seamlessly translates legacy `Text1` ~ `Text4`, `Color`, `GlowingText` $\leftrightarrow$ modern `front_text`, `back_text`, and `is_waxed`.

- **Block State & Palette Flattening**:
  - Full conversion between 1.12.2 numeric/variant blocks and 1.13+ flattened blocks (wool, concrete, terracotta, wood planks, slabs, double slabs, logs, leaves, stones, repeaters, comparators, redstone torches, lamps, etc.).
  - Preserves redstone wire connections and power states.
  - Modern updates: `grass` $\leftrightarrow$ `short_grass` (1.20.3+), signs (1.13 $\leftrightarrow$ 1.14+).

- **Smart Block Fallback Option**:
  - Gracefully substitutes blocks added in newer versions (crafter $\rightarrow$ dropper, copper bulb $\rightarrow$ redstone lamp, copper doors $\rightarrow$ iron doors, pale oak $\rightarrow$ dark oak) when converting to older versions, preventing missing blocks or air pockets.

- **Litemapy & Mod Compatibility**:
  - Automatically manages `PendingFluidTicks` and `PendingBlockTicks` per format specification.

- **Modern Web UI**:
  - Drag-and-drop file upload.
  - Batch conversion of multiple `.litematic` files simultaneously.
  - Live metadata inspection card (Schematic Name, Author, Source Minecraft version, Schematic format version, Region count, Block count).

- **Command-Line Interface (CLI)**:
  - Batch convert files and directories directly from the terminal.
  - Built-in integrity test runner (`--test`).

---

## 💻 CLI Usage

The repository includes `cli.js` for automation and command-line workflows:

```bash
# Convert a single file to Minecraft 26.3
node cli.js schematic.litematic -v 26.3

# Convert a single file to Minecraft 1.20.4
node cli.js schematic.litematic -v 1.20.4

# Convert a file to 1.12.2
node cli.js schematic.litematic -v 1.12.2

# Batch convert an entire folder to Minecraft 1.20.4 into an output directory
node cli.js /path/to/schematics -v 1.20.4 -o /path/to/output

# Run the test suite on all schematics in a directory
node cli.js --test /path/to/schematics
```

---

## 📋 Version Reference Table

| Minecraft Version | MinecraftDataVersion | Litematica Format Version |
|---|---|---|
| **26.3** (Latest) | `5023` | **Version 7** |
| **26.2** | `4903` | **Version 7** |
| **26.1** | `4786` | **Version 7** |
| **1.21.8 ~ 1.21.11** | `4440` | **Version 7** |
| **1.21.4** | `4189` | **Version 7** |
| **1.21.2 / 1.21.3** | `4082` | **Version 7** |
| **1.21 / 1.21.1** | `3955` | **Version 7** |
| **1.20.5 / 1.20.6** | `3839` | **Version 7** |
| **1.20.4** | `3700` | **Version 6** |
| **1.20.2** | `3578` | **Version 6** |
| **1.20 / 1.20.1** | `3465` | **Version 6** |
| **1.19.4** | `3337` | **Version 6** |
| **1.19 ~ 1.19.2** | `3120` | **Version 6** |
| **1.18.2** | `2975` | **Version 6** |
| **1.18 / 1.18.1** | `2865` | **Version 6** |
| **1.17.1** | `2730` | **Version 5** |
| **1.16.5** | `2586` | **Version 5** |
| **1.15.2** | `2230` | **Version 5** |
| **1.14.4** | `1976` | **Version 5** |
| **1.13.2** | `1631` | **Version 5** |
| **1.12.2** | `1343` | **Version 4** |

---

## 🛠️ Community & Support

- GitHub: [https://github.com/Harusarri/litematica-converter](https://github.com/Harusarri/litematica-converter)
- Discord: [https://discord.gg/Qx7S63UG3k](https://discord.gg/Qx7S63UG3k)
