const nbt = require("prismarine-nbt");
const { Buffer } = require('buffer');

// Contact button click event listener
document.getElementById("contactButton").addEventListener("click", () => {
    const contactBox = document.getElementById("contactBox");
    contactBox.style.display = contactBox.style.display === "none" ? "block" : "none";
});

// Initially hide the contact box
document.getElementById("contactBox").style.display = "none";

// Upload form submit event listener
document.getElementById("uploadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const file = document.getElementById("file").files[0];
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const buffer = reader.result;
            const inflatedBuffer = pako.inflate(buffer); // Decompress NBT data
            const data = await nbt.parse(Buffer.from(inflatedBuffer)); // Parse NBT data
            const nbt_data = data.parsed.value;

            console.log("Original NBT data:", JSON.stringify(nbt_data, null, 2));

            const targetVersion = parseInt(document.getElementById("targetVersion").value); // Select target version

            // Show warning message when converting to 1.19 or lower
            if (targetVersion <= 3105) {
                const userConfirmed = confirm("Warning: Converting to versions 1.19 or lower may result in corrupted files or unconverted NBT tags. Do you wish to continue?");
                if (!userConfirmed) {
                    alert("Conversion cancelled.");
                    return;
                }
            }

            nbt_data.MinecraftDataVersion.value = targetVersion; // Update version to target version

            if (targetVersion >= 3953) { // For versions 1.21 or higher
                nbt_data.Version.value = 7; // Set NBT version

                // Recursive function to rename Count to count
                const renameCountTags = (obj) => {
                    if (typeof obj !== 'object' || obj === null) return;

                    for (const key in obj) {
                        if (key === 'Count' && obj[key] !== undefined) {
                            // Change Count to count
                            obj['count'] = { "type": "int", "value": obj['Count'].value };
                            delete obj['Count'];
                        } else if (key === 'BlockEntityTag' && obj[key]?.value?.Items) {
                            // Recursively process items in BlockEntityTag
                            renameCountTags(obj[key].value.Items);
                        } else {
                            // Recursively search all objects
                            renameCountTags(obj[key]);
                        }
                    }
                };

                // Function to convert sign text
                const convertSignTags = (obj) => {
                    if (typeof obj !== 'object' || obj === null) return;

                    for (const key in obj) {
                        if (['Text1', 'Text2', 'Text3', 'Text4'].includes(key)) {
                            // Convert Text1~Text4 to front_text and back_text
                            const messages = ['Text1', 'Text2', 'Text3', 'Text4'].map(textKey => {
                                return obj[textKey] ? obj[textKey].value : "{\"text\":\"\"}";
                            });

                            obj['front_text'] = {
                                "type": "compound",
                                "value": {
                                    "has_glowing_text": {
                                        "type": "byte",
                                        "value": obj['GlowingText'] ? obj['GlowingText'].value : 0
                                    },
                                    "color": {
                                        "type": "string",
                                        "value": obj['Color'] ? obj['Color'].value : "black"
                                    },
                                    "messages": {
                                        "type": "list",
                                        "value": {
                                            "type": "string",
                                            "value": messages
                                        }
                                    }
                                }
                            };

                            obj['back_text'] = {
                                "type": "compound",
                                "value": {
                                    "has_glowing_text": {
                                        "type": "byte",
                                        "value": 0
                                    },
                                    "color": {
                                        "type": "string",
                                        "value": "black"
                                    },
                                    "messages": {
                                        "type": "list",
                                        "value": {
                                            "type": "string",
                                            "value": [
                                                "{\"text\":\"\"}",
                                                "{\"text\":\"\"}",
                                                "{\"text\":\"\"}",
                                                "{\"text\":\"\"}"
                                            ]
                                        }
                                    }
                                }
                            };

                            // Remove the original text keys
                            delete obj['Text1'];
                            delete obj['Text2'];
                            delete obj['Text3'];
                            delete obj['Text4'];
                            delete obj['GlowingText'];
                            delete obj['Color'];
                        } else {
                            // Recursively search all objects
                            convertSignTags(obj[key]);
                        }
                    }
                };

                // Function to convert redstone wire tags
                const convertRedstoneWireTags = (obj) => {
                    if (typeof obj !== 'object' || obj === null) return;

                    if (obj['Name'] && obj['Name'].value === 'minecraft:redstone_wire' && obj['Properties']) {
                        const properties = obj['Properties'].value;
                        // Maintain the direction information as 'none' or 'side'
                        for (const dir of ['north', 'south', 'east', 'west']) {
                            if (properties[dir] && properties[dir].value === 'none') {
                                properties[dir].value = 'none';
                            } else if (properties[dir] && properties[dir].value === 'side') {
                                properties[dir].value = 'side';
                            }
                        }
                    }

                    // Recursively search all objects
                    for (const key in obj) {
                        convertRedstoneWireTags(obj[key]);
                    }
                };

                // Call conversion functions for higher versions
                renameCountTags(nbt_data);
                convertSignTags(nbt_data);
                convertRedstoneWireTags(nbt_data);

            } else { // For lower versions
                // Only update MinecraftDataVersion and Version for lower versions
                nbt_data.Version.value = targetVersion >= 3218 && targetVersion < 3463 ? 6 : (targetVersion <= 2586 ? 5 : 6);

                // Do not modify other data
            }

            console.log("Modified NBT data:", JSON.stringify(nbt_data, null, 2));

            const outputBuffer = pako.gzip(nbt.writeUncompressed(data.parsed)); // Recompress the data

            const blob = new Blob([outputBuffer]);
            console.log("Final output blob:", blob);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = file.name;
            link.click(); // Click the download link
        } catch (error) {
            console.error("Error processing the file:", error);
            alert("An error occurred while processing the file. Please check the console log.");
        }
    };
    reader.readAsArrayBuffer(file); // Read the file
});
