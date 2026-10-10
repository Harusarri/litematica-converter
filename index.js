const nbt = require("prismarine-nbt");
const { Buffer } = require("buffer");

// Version definitions
const MINECRAFT_VERSIONS = [
    { name: "26.3 (Latest)", dataVersion: 5023, schematicVersion: 7 },
    { name: "26.2", dataVersion: 4903, schematicVersion: 7 },
    { name: "26.1", dataVersion: 4786, schematicVersion: 7 },
    { name: "1.21.8 ~ 1.21.11", dataVersion: 4440, schematicVersion: 7 },
    { name: "1.21.4", dataVersion: 4189, schematicVersion: 7 },
    { name: "1.21.2 / 1.21.3", dataVersion: 4082, schematicVersion: 7 },
    { name: "1.21 / 1.21.1", dataVersion: 3955, schematicVersion: 7 },
    { name: "1.20.5 / 1.20.6", dataVersion: 3839, schematicVersion: 7 },
    { name: "1.20.4", dataVersion: 3700, schematicVersion: 6 },
    { name: "1.20.2", dataVersion: 3578, schematicVersion: 6 },
    { name: "1.20 / 1.20.1", dataVersion: 3465, schematicVersion: 6 },
    { name: "1.19.4", dataVersion: 3337, schematicVersion: 6 },
    { name: "1.19 ~ 1.19.2", dataVersion: 3120, schematicVersion: 6 },
    { name: "1.18.2", dataVersion: 2975, schematicVersion: 6 },
    { name: "1.18 / 1.18.1", dataVersion: 2865, schematicVersion: 6 },
    { name: "1.17.1", dataVersion: 2730, schematicVersion: 5 },
    { name: "1.16.5", dataVersion: 2586, schematicVersion: 5 },
    { name: "1.15.2", dataVersion: 2230, schematicVersion: 5 },
    { name: "1.14.4", dataVersion: 1976, schematicVersion: 5 },
    { name: "1.13.2", dataVersion: 1631, schematicVersion: 5 },
    { name: "1.12.2", dataVersion: 1343, schematicVersion: 4 }
];

function getSchematicVersion(dataVersion) {
    if (dataVersion >= 3837) return 7; // 1.20.5+ Data Components
    if (dataVersion >= 2860) return 6; // 1.18+ (2860 to 3836)
    if (dataVersion >= 1344) return 5; // 1.13+ (1344 to 2859)
    return 4;                          // <= 1.12.2 (1343 and below)
}

function formatVersionFromDataVersion(dv) {
    for (const v of MINECRAFT_VERSIONS) {
        if (v.dataVersion === dv) return v.name;
    }
    if (dv >= 5000) return `26.x (DV ${dv})`;
    if (dv >= 4786) return `26.1+ (DV ${dv})`;
    if (dv >= 3953) return `1.21+ (DV ${dv})`;
    if (dv >= 3837) return `1.20.5/6 (DV ${dv})`;
    if (dv >= 3463) return `1.20+ (DV ${dv})`;
    if (dv >= 2860) return `1.18+ (DV ${dv})`;
    if (dv >= 1344) return `1.13+ (DV ${dv})`;
    return `1.12.2 or older (DV ${dv})`;
}

// Flattening block conversion mappings (1.12 <-> 1.13+)
const COLORS = [
    "white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
    "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"
];
const WOOD_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak"];

function convertBlockTo1_12(block) {
    const name = block.Name ? block.Name.value : "";
    const props = block.Properties ? block.Properties.value : {};
    let newName = name;
    let newProps = { ...props };
    const bareName = name.replace(/^minecraft:/, "");

    for (const c of COLORS) {
        if (bareName === `${c}_wool`) {
            return { Name: { type: "string", value: "minecraft:wool" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
        if (bareName === `${c}_concrete`) {
            return { Name: { type: "string", value: "minecraft:concrete" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
        if (bareName === `${c}_concrete_powder`) {
            return { Name: { type: "string", value: "minecraft:concrete_powder" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
        if (bareName === `${c}_stained_glass`) {
            return { Name: { type: "string", value: "minecraft:stained_glass" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
        if (bareName === `${c}_stained_glass_pane`) {
            return { Name: { type: "string", value: "minecraft:stained_glass_pane" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
        if (bareName === `${c}_terracotta`) {
            return { Name: { type: "string", value: "minecraft:stained_hardened_clay" }, Properties: { type: "compound", value: { color: { type: "string", value: c } } } };
        }
    }

    if (bareName === "terracotta") {
        return { Name: { type: "string", value: "minecraft:hardened_clay" } };
    }

    for (const w of WOOD_TYPES) {
        if (bareName === `${w}_planks`) {
            return { Name: { type: "string", value: "minecraft:planks" }, Properties: { type: "compound", value: { variant: { type: "string", value: w } } } };
        }
        if (bareName === `${w}_slab`) {
            const half = props.type?.value === "top" ? "top" : "bottom";
            if (props.type?.value === "double") {
                return { Name: { type: "string", value: "minecraft:double_wooden_slab" }, Properties: { type: "compound", value: { variant: { type: "string", value: w } } } };
            }
            return { Name: { type: "string", value: "minecraft:wooden_slab" }, Properties: { type: "compound", value: { half: { type: "string", value: half }, variant: { type: "string", value: w } } } };
        }
        if (bareName === `${w}_log`) {
            const isLog2 = (w === "acacia" || w === "dark_oak");
            const axis = props.axis ? props.axis.value : "y";
            return { Name: { type: "string", value: isLog2 ? "minecraft:log2" : "minecraft:log" }, Properties: { type: "compound", value: { axis: { type: "string", value: axis }, variant: { type: "string", value: w } } } };
        }
        if (bareName === `${w}_leaves`) {
            const isLeaves2 = (w === "acacia" || w === "dark_oak");
            return { Name: { type: "string", value: isLeaves2 ? "minecraft:leaves2" : "minecraft:leaves" }, Properties: { type: "compound", value: { variant: { type: "string", value: w } } } };
        }
        if (bareName === `${w}_sapling`) {
            return { Name: { type: "string", value: "minecraft:sapling" }, Properties: { type: "compound", value: { variant: { type: "string", value: w } } } };
        }
        if (bareName === `${w}_door`) {
            return { Name: { type: "string", value: w === "oak" ? "minecraft:wooden_door" : `minecraft:${w}_door` }, Properties: { type: "compound", value: newProps } };
        }
        if (bareName === `${w}_trapdoor`) {
            return { Name: { type: "string", value: w === "oak" ? "minecraft:trapdoor" : `minecraft:${w}_trapdoor` }, Properties: { type: "compound", value: newProps } };
        }
        if (bareName === `${w}_fence`) {
            return { Name: { type: "string", value: w === "oak" ? "minecraft:fence" : `minecraft:${w}_fence` }, Properties: { type: "compound", value: newProps } };
        }
        if (bareName === `${w}_fence_gate`) {
            return { Name: { type: "string", value: w === "oak" ? "minecraft:fence_gate" : `minecraft:${w}_fence_gate` }, Properties: { type: "compound", value: newProps } };
        }
        if (bareName === `${w}_button`) {
            return { Name: { type: "string", value: "minecraft:wooden_button" }, Properties: { type: "compound", value: newProps } };
        }
        if (bareName === `${w}_pressure_plate`) {
            return { Name: { type: "string", value: "minecraft:wooden_pressure_plate" }, Properties: { type: "compound", value: newProps } };
        }
    }

    const stoneVariants = {
        granite: "granite",
        polished_granite: "smooth_granite",
        diorite: "diorite",
        polished_diorite: "smooth_diorite",
        andesite: "andesite",
        polished_andesite: "smooth_andesite"
    };
    if (stoneVariants[bareName]) {
        return { Name: { type: "string", value: "minecraft:stone" }, Properties: { type: "compound", value: { variant: { type: "string", value: stoneVariants[bareName] } } } };
    }

    if (bareName === "stone_slab" || bareName === "smooth_stone_slab") {
        const half = props.type?.value === "top" ? "top" : "bottom";
        if (props.type?.value === "double") {
            return { Name: { type: "string", value: "minecraft:double_stone_slab" }, Properties: { type: "compound", value: { variant: { type: "string", value: "stone" } } } };
        }
        return { Name: { type: "string", value: "minecraft:stone_slab" }, Properties: { type: "compound", value: { half: { type: "string", value: half }, variant: { type: "string", value: "stone" } } } };
    }

    if (bareName === "repeater") {
        const powered = props.powered?.value === "true";
        newName = powered ? "minecraft:powered_repeater" : "minecraft:unpowered_repeater";
        delete newProps.powered;
        return { Name: { type: "string", value: newName }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "comparator") {
        const powered = props.powered?.value === "true";
        newName = powered ? "minecraft:powered_comparator" : "minecraft:unpowered_comparator";
        delete newProps.powered;
        return { Name: { type: "string", value: newName }, Properties: { type: "compound", value: newProps } };
    }

    if (bareName === "redstone_lamp") {
        const lit = props.lit?.value === "true";
        return { Name: { type: "string", value: lit ? "minecraft:lit_redstone_lamp" : "minecraft:redstone_lamp" } };
    }
    if (bareName === "furnace") {
        const lit = props.lit?.value === "true";
        delete newProps.lit;
        return { Name: { type: "string", value: lit ? "minecraft:lit_furnace" : "minecraft:furnace" }, Properties: { type: "compound", value: newProps } };
    }

    if (bareName === "wall_torch") {
        return { Name: { type: "string", value: "minecraft:torch" }, Properties: { type: "compound", value: { facing: props.facing || { type: "string", value: "north" } } } };
    }
    if (bareName === "redstone_wall_torch") {
        return { Name: { type: "string", value: "minecraft:redstone_torch" }, Properties: { type: "compound", value: { facing: props.facing || { type: "string", value: "north" } } } };
    }

    if (bareName === "redstone_wire") {
        const cleanProps = {};
        if (props.power) cleanProps.power = props.power;
        return { Name: { type: "string", value: "minecraft:redstone_wire" }, Properties: { type: "compound", value: cleanProps } };
    }

    if (bareName === "grass_block") {
        return { Name: { type: "string", value: "minecraft:grass" }, Properties: { type: "compound", value: { snowy: props.snowy || { type: "string", value: "false" } } } };
    }
    if (bareName === "short_grass" || bareName === "grass") {
        return { Name: { type: "string", value: "minecraft:tallgrass" }, Properties: { type: "compound", value: { type: { type: "string", value: "tall_grass" } } } };
    }

    if (bareName.endsWith("_sign") || bareName.endsWith("_wall_sign")) {
        const isWall = bareName.includes("wall");
        newName = isWall ? "minecraft:wall_sign" : "minecraft:standing_sign";
        return { Name: { type: "string", value: newName }, Properties: { type: "compound", value: newProps } };
    }

    return block;
}

function convertBlockFrom1_12(block) {
    const name = block.Name ? block.Name.value : "";
    const props = block.Properties ? block.Properties.value : {};
    const bareName = name.replace(/^minecraft:/, "");
    let newProps = { ...props };

    if (bareName === "wool") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_wool` } };
    }
    if (bareName === "concrete") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_concrete` } };
    }
    if (bareName === "concrete_powder") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_concrete_powder` } };
    }
    if (bareName === "stained_glass") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_stained_glass` } };
    }
    if (bareName === "stained_glass_pane") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_stained_glass_pane` } };
    }
    if (bareName === "stained_hardened_clay") {
        const color = props.color?.value || "white";
        return { Name: { type: "string", value: `minecraft:${color}_terracotta` } };
    }
    if (bareName === "hardened_clay") {
        return { Name: { type: "string", value: "minecraft:terracotta" } };
    }
    if (bareName === "planks") {
        const variant = props.variant?.value || "oak";
        return { Name: { type: "string", value: `minecraft:${variant}_planks` } };
    }
    if (bareName === "wooden_slab") {
        const variant = props.variant?.value || "oak";
        const type = props.half?.value === "top" ? "top" : "bottom";
        return { Name: { type: "string", value: `minecraft:${variant}_slab` }, Properties: { type: "compound", value: { type: { type: "string", value: type } } } };
    }
    if (bareName === "double_wooden_slab") {
        const variant = props.variant?.value || "oak";
        return { Name: { type: "string", value: `minecraft:${variant}_slab` }, Properties: { type: "compound", value: { type: { type: "string", value: "double" } } } };
    }
    if (bareName === "log" || bareName === "log2") {
        const variant = props.variant?.value || "oak";
        return { Name: { type: "string", value: `minecraft:${variant}_log` }, Properties: { type: "compound", value: { axis: props.axis || { type: "string", value: "y" } } } };
    }
    if (bareName === "leaves" || bareName === "leaves2") {
        const variant = props.variant?.value || "oak";
        return { Name: { type: "string", value: `minecraft:${variant}_leaves` } };
    }
    if (bareName === "stone") {
        const v = props.variant?.value || "stone";
        const map = {
            stone: "stone",
            granite: "granite",
            smooth_granite: "polished_granite",
            diorite: "diorite",
            smooth_diorite: "polished_diorite",
            andesite: "andesite",
            smooth_andesite: "polished_andesite"
        };
        return { Name: { type: "string", value: `minecraft:${map[v] || "stone"}` } };
    }
    if (bareName === "grass") {
        return { Name: { type: "string", value: "minecraft:grass_block" }, Properties: { type: "compound", value: { snowy: props.snowy || { type: "string", value: "false" } } } };
    }
    if (bareName === "unpowered_repeater") {
        newProps.powered = { type: "string", value: "false" };
        return { Name: { type: "string", value: "minecraft:repeater" }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "powered_repeater") {
        newProps.powered = { type: "string", value: "true" };
        return { Name: { type: "string", value: "minecraft:repeater" }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "unpowered_comparator") {
        newProps.powered = { type: "string", value: "false" };
        return { Name: { type: "string", value: "minecraft:comparator" }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "powered_comparator") {
        newProps.powered = { type: "string", value: "true" };
        return { Name: { type: "string", value: "minecraft:comparator" }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "standing_sign") {
        return { Name: { type: "string", value: "minecraft:oak_sign" }, Properties: { type: "compound", value: newProps } };
    }
    if (bareName === "wall_sign") {
        return { Name: { type: "string", value: "minecraft:oak_wall_sign" }, Properties: { type: "compound", value: newProps } };
    }

    return block;
}

function convertBlockBetweenModern(block, sourceVersion, targetVersion, enableFallback) {
    const name = block.Name ? block.Name.value : "";
    const props = block.Properties ? block.Properties.value : {};
    const bareName = name.replace(/^minecraft:/, "");

    // 1.13 <-> 1.14+ signs
    if (targetVersion < 1952) {
        if (bareName === "oak_sign") return { Name: { type: "string", value: "minecraft:sign" }, Properties: { type: "compound", value: props } };
        if (bareName === "oak_wall_sign") return { Name: { type: "string", value: "minecraft:wall_sign" }, Properties: { type: "compound", value: props } };
    } else if (sourceVersion < 1952 && targetVersion >= 1952) {
        if (bareName === "sign") return { Name: { type: "string", value: "minecraft:oak_sign" }, Properties: { type: "compound", value: props } };
        if (bareName === "wall_sign") return { Name: { type: "string", value: "minecraft:oak_wall_sign" }, Properties: { type: "compound", value: props } };
    }

    // 1.20.2 <-> 1.20.3+ grass -> short_grass
    if (targetVersion < 3579 && bareName === "short_grass") {
        return { Name: { type: "string", value: "minecraft:grass" } };
    } else if (targetVersion >= 3579 && bareName === "grass") {
        return { Name: { type: "string", value: "minecraft:short_grass" } };
    }

    // Smart Fallback for blocks introduced in later versions
    if (enableFallback) {
        if (targetVersion < 3837) { // < 1.20.5
            if (bareName === "crafter") {
                return { Name: { type: "string", value: "minecraft:dropper" }, Properties: { type: "compound", value: props } };
            }
            if (bareName.includes("copper_bulb")) {
                return { Name: { type: "string", value: "minecraft:redstone_lamp" } };
            }
            if (bareName.includes("copper_door")) {
                return { Name: { type: "string", value: "minecraft:iron_door" }, Properties: { type: "compound", value: props } };
            }
            if (bareName.includes("copper_trapdoor")) {
                return { Name: { type: "string", value: "minecraft:iron_trapdoor" }, Properties: { type: "compound", value: props } };
            }
        }
        if (targetVersion < 4189) { // < 1.21.4 (Pale Oak, etc.)
            if (bareName.startsWith("pale_oak_")) {
                const sub = bareName.replace("pale_oak_", "");
                return { Name: { type: "string", value: `minecraft:dark_oak_${sub}` }, Properties: { type: "compound", value: props } };
            }
            if (bareName === "creaking_heart") {
                return { Name: { type: "string", value: "minecraft:dark_oak_log" }, Properties: { type: "compound", value: props } };
            }
            if (bareName.startsWith("resin_")) {
                return { Name: { type: "string", value: "minecraft:orange_concrete" } };
            }
        }
    }

    return block;
}

function convertPalettes(regions, sourceVersion, targetVersion, enableFallback) {
    for (const rKey in regions) {
        const region = regions[rKey].value;
        if (!region.BlockStatePalette?.value?.value) continue;
        const palette = region.BlockStatePalette.value.value;

        for (let i = 0; i < palette.length; i++) {
            let b = palette[i];
            if (targetVersion <= 1343) {
                b = convertBlockTo1_12(b);
            } else if (sourceVersion <= 1343 && targetVersion > 1343) {
                b = convertBlockFrom1_12(b);
            }
            b = convertBlockBetweenModern(b, sourceVersion, targetVersion, enableFallback);
            palette[i] = b;
        }
    }
}

function convertSigns(obj, targetVersion) {
    if (typeof obj !== 'object' || obj === null) return;

    if (targetVersion >= 3463) {
        if (obj.Text1 || obj.Text2 || obj.Text3 || obj.Text4) {
            const messages = ['Text1', 'Text2', 'Text3', 'Text4'].map(k => {
                let val = obj[k] ? obj[k].value : '{"text":""}';
                if (!val || val === 'null') val = '{"text":""}';
                if (typeof val === 'string' && !val.startsWith('{') && !val.startsWith('"')) {
                    val = JSON.stringify({ text: val });
                }
                return String(val);
            });

            obj['front_text'] = {
                type: 'compound',
                value: {
                    has_glowing_text: {
                        type: 'byte',
                        value: obj.GlowingText ? Number(obj.GlowingText.value) : 0
                    },
                    color: {
                        type: 'string',
                        value: obj.Color ? String(obj.Color.value) : 'black'
                    },
                    messages: {
                        type: 'list',
                        value: {
                            type: 'string',
                            value: messages
                        }
                    }
                }
            };

            obj['back_text'] = {
                type: 'compound',
                value: {
                    has_glowing_text: { type: 'byte', value: 0 },
                    color: { type: 'string', value: 'black' },
                    messages: {
                        type: 'list',
                        value: {
                            type: 'string',
                            value: ['{"text":""}', '{"text":""}', '{"text":""}', '{"text":""}']
                        }
                    }
                }
            };
            obj['is_waxed'] = { type: 'byte', value: 0 };

            delete obj.Text1; delete obj.Text2; delete obj.Text3; delete obj.Text4;
            delete obj.Color; delete obj.GlowingText;
        }
    } else {
        if (obj.front_text && obj.front_text.value) {
            const front = obj.front_text.value;
            const msgs = (front.messages?.value?.value) ? front.messages.value.value : [];
            for (let i = 0; i < 4; i++) {
                let m = msgs[i] !== undefined ? msgs[i] : '{"text":""}';
                if (typeof m !== 'string') m = JSON.stringify(m);
                obj[`Text${i + 1}`] = { type: 'string', value: m };
            }
            if (front.color) {
                obj['Color'] = { type: 'string', value: String(front.color.value || 'black') };
            }
            if (front.has_glowing_text) {
                obj['GlowingText'] = { type: 'byte', value: Number(front.has_glowing_text.value || 0) };
            }
            delete obj.front_text;
            delete obj.back_text;
            delete obj.is_waxed;
        }
    }

    for (const key in obj) {
        if (key !== 'front_text' && key !== 'back_text') {
            convertSigns(obj[key], targetVersion);
        }
    }
}

function convertSingleItem(item, targetVersion) {
    if (typeof item !== 'object' || item === null) return;

    // 1. Quantity tag: count (int, >= 1.20.5 / 3837) vs Count (byte, <= 1.20.4)
    if (targetVersion >= 3837) {
        if (item.Count !== undefined) {
            const val = Number(item.Count.value);
            item['count'] = { type: 'int', value: isNaN(val) ? 1 : val };
            delete item.Count;
        }
    } else {
        if (item.count !== undefined) {
            let val = Number(item.count.value);
            if (isNaN(val)) val = 1;
            val = Math.max(-128, Math.min(127, val));
            item['Count'] = { type: 'byte', value: val };
            delete item.count;
        }
    }

    // 2. Components (>= 1.20.5) vs tag (<= 1.20.4)
    if (targetVersion < 3837) {
        if (item.components && item.components.value) {
            const comps = item.components.value;
            if (!item.tag) {
                item.tag = { type: 'compound', value: {} };
            }
            const tagVal = item.tag.value;

            if (comps['minecraft:custom_data']?.value) {
                Object.assign(tagVal, comps['minecraft:custom_data'].value);
            }
            if (comps['minecraft:damage']) {
                tagVal.Damage = { type: 'int', value: Number(comps['minecraft:damage'].value) };
            }
            if (comps['minecraft:repair_cost']) {
                tagVal.RepairCost = { type: 'int', value: Number(comps['minecraft:repair_cost'].value) };
            }
            if (comps['minecraft:custom_name']) {
                tagVal.display = tagVal.display || { type: 'compound', value: {} };
                tagVal.display.value.Name = { type: 'string', value: String(comps['minecraft:custom_name'].value) };
            }
            if (comps['minecraft:lore']) {
                tagVal.display = tagVal.display || { type: 'compound', value: {} };
                tagVal.display.value.Lore = comps['minecraft:lore'];
            }
            if (comps['minecraft:enchantments']?.value?.levels?.value) {
                const levels = comps['minecraft:enchantments'].value.levels.value;
                const enchList = [];
                for (const enchId in levels) {
                    enchList.push({
                        id: { type: 'string', value: enchId },
                        lvl: { type: 'short', value: Number(levels[enchId].value) }
                    });
                }
                tagVal.Enchantments = {
                    type: 'list',
                    value: { type: 'compound', value: enchList }
                };
            }
            if (comps['minecraft:stored_enchantments']?.value?.levels?.value) {
                const levels = comps['minecraft:stored_enchantments'].value.levels.value;
                const enchList = [];
                for (const enchId in levels) {
                    enchList.push({
                        id: { type: 'string', value: enchId },
                        lvl: { type: 'short', value: Number(levels[enchId].value) }
                    });
                }
                tagVal.StoredEnchantments = {
                    type: 'list',
                    value: { type: 'compound', value: enchList }
                };
            }
            if (comps['minecraft:potion_contents']?.value?.potion) {
                tagVal.Potion = { type: 'string', value: String(comps['minecraft:potion_contents'].value.potion.value) };
            }

            delete item.components;
        }
    } else {
        if (item.tag && item.tag.value) {
            const tagVal = item.tag.value;
            if (!item.components) {
                item.components = { type: 'compound', value: {} };
            }
            const comps = item.components.value;

            if (tagVal.Damage) {
                comps['minecraft:damage'] = { type: 'int', value: Number(tagVal.Damage.value) };
                delete tagVal.Damage;
            }
            if (tagVal.RepairCost) {
                comps['minecraft:repair_cost'] = { type: 'int', value: Number(tagVal.RepairCost.value) };
                delete tagVal.RepairCost;
            }
            if (tagVal.display?.value) {
                if (tagVal.display.value.Name) {
                    comps['minecraft:custom_name'] = { type: 'string', value: String(tagVal.display.value.Name.value) };
                    delete tagVal.display.value.Name;
                }
                if (tagVal.display.value.Lore) {
                    comps['minecraft:lore'] = tagVal.display.value.Lore;
                    delete tagVal.display.value.Lore;
                }
                if (Object.keys(tagVal.display.value).length === 0) {
                    delete tagVal.display;
                }
            }
            if (tagVal.Enchantments?.value?.value) {
                const levels = {};
                for (const e of tagVal.Enchantments.value.value) {
                    if (e.id?.value && e.lvl?.value !== undefined) {
                        levels[e.id.value] = { type: 'int', value: Number(e.lvl.value) };
                    }
                }
                comps['minecraft:enchantments'] = {
                    type: 'compound',
                    value: { levels: { type: 'compound', value: levels } }
                };
                delete tagVal.Enchantments;
            }
            if (tagVal.StoredEnchantments?.value?.value) {
                const levels = {};
                for (const e of tagVal.StoredEnchantments.value.value) {
                    if (e.id?.value && e.lvl?.value !== undefined) {
                        levels[e.id.value] = { type: 'int', value: Number(e.lvl.value) };
                    }
                }
                comps['minecraft:stored_enchantments'] = {
                    type: 'compound',
                    value: { levels: { type: 'compound', value: levels } }
                };
                delete tagVal.StoredEnchantments;
            }
            if (tagVal.Potion) {
                comps['minecraft:potion_contents'] = {
                    type: 'compound',
                    value: { potion: tagVal.Potion }
                };
                delete tagVal.Potion;
            }

            if (Object.keys(tagVal).length > 0) {
                comps['minecraft:custom_data'] = { type: 'compound', value: tagVal };
            }
            delete item.tag;
        }
    }

    if (item.tag?.value?.BlockEntityTag?.value?.Items) {
        convertItemsRecursively(item.tag.value.BlockEntityTag.value.Items, targetVersion);
    }
}

function convertItemsRecursively(obj, targetVersion) {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
        for (const elem of obj) convertItemsRecursively(elem, targetVersion);
        return;
    }

    if (obj.id && (obj.Count !== undefined || obj.count !== undefined || obj.components !== undefined || obj.Slot !== undefined)) {
        convertSingleItem(obj, targetVersion);
    }

    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            convertItemsRecursively(obj[key], targetVersion);
        }
    }
}

function adjustTicks(regions, targetVersion) {
    for (const rKey in regions) {
        const region = regions[rKey].value;

        if (targetVersion <= 1343) {
            delete region.PendingFluidTicks;
        } else {
            if (!region.PendingFluidTicks) {
                region.PendingFluidTicks = {
                    type: 'list',
                    value: { type: 'end', value: [] }
                };
            }
        }

        if (!region.PendingBlockTicks) {
            region.PendingBlockTicks = {
                type: 'list',
                value: { type: 'end', value: [] }
            };
        }
    }
}

function convertLitematic(nbtData, targetVersion, enableFallback) {
    const root = nbtData.value;
    const sourceDataVersion = root.MinecraftDataVersion ? Number(root.MinecraftDataVersion.value) : 1343;
    const targetSchematicVersion = getSchematicVersion(targetVersion);

    if (root.MinecraftDataVersion) {
        root.MinecraftDataVersion.value = targetVersion;
    } else {
        root.MinecraftDataVersion = { type: 'int', value: targetVersion };
    }

    if (root.Version) {
        root.Version.value = targetSchematicVersion;
    } else {
        root.Version = { type: 'int', value: targetSchematicVersion };
    }

    const regions = root.Regions ? root.Regions.value : {};

    adjustTicks(regions, targetVersion);
    convertPalettes(regions, sourceDataVersion, targetVersion, enableFallback);
    convertSigns(regions, targetVersion);
    convertItemsRecursively(regions, targetVersion);

    if (root.Metadata?.value) {
        const now = Date.now();
        const high = Math.floor(now / 0x100000000);
        const low = now >>> 0;
        root.Metadata.value.TimeModified = { type: 'long', value: [high, low] };
    }

    return {
        sourceDataVersion,
        targetDataVersion: targetVersion,
        targetSchematicVersion
    };
}

// UI & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    const contactButton = document.getElementById("contactButton");
    const contactBox = document.getElementById("contactBox");
    const uploadForm = document.getElementById("uploadForm");
    const fileInput = document.getElementById("file");
    const dropZone = document.getElementById("dropZone");
    const targetVersionSelect = document.getElementById("targetVersion");
    const customVersionGroup = document.getElementById("customVersionGroup");
    const customVersionInput = document.getElementById("customVersionInput");
    const fileInfoBox = document.getElementById("fileInfoBox");
    const fileInfoContent = document.getElementById("fileInfoContent");
    const statusBox = document.getElementById("statusBox");
    const convertBtn = document.getElementById("convertBtn");
    const optSmartFallback = document.getElementById("optSmartFallback");
    const optAppendVersion = document.getElementById("optAppendVersion");

    // Contact button toggle
    if (contactButton && contactBox) {
        contactButton.addEventListener("click", (e) => {
            e.stopPropagation();
            contactBox.style.display = contactBox.style.display === "none" ? "block" : "none";
        });
        document.addEventListener("click", (e) => {
            if (!contactBox.contains(e.target) && e.target !== contactButton) {
                contactBox.style.display = "none";
            }
        });
    }

    // Toggle custom version input
    targetVersionSelect.addEventListener("change", () => {
        if (targetVersionSelect.value === "custom") {
            customVersionGroup.style.display = "block";
            customVersionInput.required = true;
            customVersionInput.focus();
        } else {
            customVersionGroup.style.display = "none";
            customVersionInput.required = false;
        }
    });

    // Drag and drop events
    ["dragenter", "dragover"].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
    });
    ["dragleave", "drop"].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
        });
    });
    dropZone.addEventListener("drop", (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection(fileInput.files);
        }
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileSelection(fileInput.files);
        }
    });

    function setStatus(msg, type) {
        statusBox.style.display = "block";
        statusBox.className = `status-box status-${type}`;
        statusBox.innerHTML = msg;
    }

    // Inspect file header for live info
    async function handleFileSelection(fileList) {
        if (fileList.length === 0) return;
        const firstFile = fileList[0];
        dropZone.querySelector(".drop-text").innerHTML = fileList.length === 1
            ? `Selected: <strong>${firstFile.name}</strong> (${(firstFile.size / 1024).toFixed(1)} KB)`
            : `Selected <strong>${fileList.length} files</strong>`;

        try {
            const buf = await firstFile.arrayBuffer();
            const inflated = pako.inflate(new Uint8Array(buf));
            const data = await nbt.parse(Buffer.from(inflated));
            const root = data.parsed.value;
            const dv = root.MinecraftDataVersion ? Number(root.MinecraftDataVersion.value) : "Unknown";
            const ver = root.Version ? Number(root.Version.value) : "Unknown";
            const meta = root.Metadata ? root.Metadata.value : {};
            const name = meta.Name?.value || firstFile.name;
            const author = meta.Author?.value || "Unknown";
            const totalBlocks = meta.TotalBlocks?.value !== undefined ? meta.TotalBlocks.value : "N/A";
            const regions = root.Regions ? Object.keys(root.Regions.value).length : 0;

            fileInfoContent.innerHTML = `
                <div class="file-info-item"><span class="file-info-label">Name:</span> <span class="file-info-val">${name}</span></div>
                <div class="file-info-item"><span class="file-info-label">Author:</span> <span class="file-info-val">${author}</span></div>
                <div class="file-info-item"><span class="file-info-label">Source Version:</span> <span class="file-info-val"><span class="badge badge-green">${formatVersionFromDataVersion(dv)}</span> (DV: ${dv})</span></div>
                <div class="file-info-item"><span class="file-info-label">Format:</span> <span class="file-info-val"><span class="badge badge-blue">Version ${ver}</span></span></div>
                <div class="file-info-item"><span class="file-info-label">Regions:</span> <span class="file-info-val">${regions} region(s), ${totalBlocks} blocks</span></div>
            `;
            fileInfoBox.style.display = "block";
            statusBox.style.display = "none";
        } catch (e) {
            console.warn("Could not preview file metadata:", e);
            fileInfoBox.style.display = "none";
        }
    }

    // Submit handler
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const files = fileInput.files;
        if (!files || files.length === 0) {
            setStatus("Please select at least one .litematic file.", "error");
            return;
        }

        let targetDataVersion;
        if (targetVersionSelect.value === "custom") {
            targetDataVersion = parseInt(customVersionInput.value, 10);
            if (isNaN(targetDataVersion) || targetDataVersion <= 0) {
                setStatus("Please enter a valid numeric DataVersion.", "error");
                return;
            }
        } else {
            targetDataVersion = parseInt(targetVersionSelect.value, 10);
        }

        const enableFallback = optSmartFallback.checked;
        const appendVersion = optAppendVersion.checked;

        convertBtn.disabled = true;
        convertBtn.textContent = `Converting ${files.length} file(s)...`;
        setStatus(`Processing ${files.length} file(s)...`, "info");

        let convertedCount = 0;
        let errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const arrayBuffer = await file.arrayBuffer();
                const inflated = pako.inflate(new Uint8Array(arrayBuffer));
                const parsedResult = await nbt.parse(Buffer.from(inflated));

                const result = convertLitematic(parsedResult.parsed, targetDataVersion, enableFallback);

                const uncompressed = nbt.writeUncompressed(parsedResult.parsed);
                const recompressed = pako.gzip(uncompressed);

                const blob = new Blob([recompressed], { type: "application/octet-stream" });
                const downloadUrl = window.URL.createObjectURL(blob);

                let downloadName = file.name;
                if (appendVersion) {
                    const ext = ".litematic";
                    const base = file.name.endsWith(ext) ? file.name.slice(0, -ext.length) : file.name;
                    const verTag = formatVersionFromDataVersion(targetDataVersion).split(" ")[0];
                    downloadName = `${base}_${verTag}${ext}`;
                }

                const link = document.createElement("a");
                link.href = downloadUrl;
                link.download = downloadName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);

                convertedCount++;
            } catch (err) {
                console.error(`Error converting ${file.name}:`, err);
                errors.push(`${file.name}: ${err.message}`);
            }
        }

        convertBtn.disabled = false;
        convertBtn.textContent = "Convert & Download";

        if (errors.length === 0) {
            const targetSchemVer = getSchematicVersion(targetDataVersion);
            setStatus(`Successfully converted <strong>${convertedCount}</strong> file(s) to <strong>${formatVersionFromDataVersion(targetDataVersion)}</strong> (Format v${targetSchemVer})!`, "success");
        } else {
            setStatus(`Converted ${convertedCount} file(s). ${errors.length} failed:<br>${errors.join("<br>")}`, "error");
        }
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MINECRAFT_VERSIONS,
        getSchematicVersion,
        formatVersionFromDataVersion,
        convertLitematic
    };
}
