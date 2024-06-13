import {parseWorld} from "./library/world.js";

export async function bitsyToBipsi(text)
{
    const DEBUG = typeof Bun !== 'undefined';
    const TILESET_RESOURCE_ID = "0";

    // Bitsy will perform the exit and then do dialogue, whereas Bipsi will do dialogue first
    // We can use coincident events to recreate that behaviour, but it's a bit confusing to edit
    // Could possibly add a 'touch' field which manually defines execution order
    const REUSE_EXISTING_EVENTS = false;

    // TODO: Handle importing HTML Bitsy playable
    // TODO: Handle exits with dialogue
    // TODO: Handle dialogue markup including exits/ends and text styling

    const world = parseWorld(text);
    
    if (DEBUG)
    {
        // Debug save input to file
        const inputFilePath = "./output/source.json";
        await Bun.write(inputFilePath, JSON.stringify(world, null, 1));
    }

    const bipsi = {
        project: {
            rooms: [],
            palettes: [],
            tileset: TILESET_RESOURCE_ID,
            tiles: [],
        },
        resources: {}
    };

    // Convert drawings

    let BIPSI_HD = false;
    let TILE_PX = BIPSI_HD ? 16 : 8;
    let ROOM_SIZE = 16;
    let SCREEN_ZOOM = 2;
    let ROOM_PX = TILE_PX * ROOM_SIZE;

    const allDrawings = Object.values(world.drawings).flat(1);
    const drawingsCount = allDrawings.length;

    // Handle canvas creation


    // always 128 wide (16 tiles to a row) and height is based on how many tiles there
    const TILES_PER_ROW = 16;
    const WIDTH = 128
    const HEIGHT = Math.ceil(Math.max(drawingsCount, 1) / TILES_PER_ROW) * TILE_PX;

    let canvas;

    if (DEBUG)
    {
        const {createCanvas} = require("@napi-rs/canvas");
        canvas = createCanvas(WIDTH, HEIGHT);
    } else
    {
        canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
    }

    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;

    const drawingIds = [];
    for (const drawing of Object.entries(world.drawings))
    {
        drawingIds.push(drawing[0]);
    }

    // get the imageData and pixel array from the canvas
    const imgData = context.getImageData(0, 0, WIDTH, HEIGHT);
    const data = imgData.data;

    // Iterate through every channel value of each pixel
    let frameCount = 0;
    for (let i = 0; i < data.length; i += 4)
    {
        let pixelIndex = i / 4;

        let drawingX = pixelIndex % TILE_PX;
        let drawingY = Math.floor(pixelIndex / WIDTH) % TILE_PX;

        let drawingIndexRow = Math.floor(Math.floor(pixelIndex / WIDTH) / TILE_PX);
        let drawingIndexColumn = Math.floor(pixelIndex / TILE_PX) % TILES_PER_ROW;
        let drawingIndex = drawingIndexColumn + (drawingIndexRow * TILES_PER_ROW);

        let value = drawingIndex < drawingsCount ? allDrawings[drawingIndex][drawingY][drawingX] : 0;
        let pixelValue = value ? 255 : 0;

        data[i] = pixelValue;
        data[i + 1] = pixelValue;
        data[i + 2] = pixelValue;
        data[i + 3] = pixelValue; // make this pixel opaque

        frameCount++;
    }

    context.putImageData(imgData, 0, 0);

    let drawingsDataURL = canvas.toDataURL("image/png", 1);
    bipsi.resources[TILESET_RESOURCE_ID] = {type: "canvas-datauri", data: drawingsDataURL};

    // Convert drawings

    let tileIdIndex = 1;
    let frameIdIndex = 0;
    const drawingDictionary = {};
    for (const [id, drawing] of Object.entries(world.drawings))
    {
        bipsi.project.tiles.push({
            id: tileIdIndex,
            frames: Array.from({length: drawing.length}, (_, i) => i + frameIdIndex)
        });
        drawingDictionary[id] = tileIdIndex;
        frameIdIndex += drawing.length;
        tileIdIndex++;
    }

    // Convert tiles

    const tiles = Object.values(world.tile);

    // Convert rooms

    const ZEROES = (length) => Array(length).fill(0);
    const REPEAT = (length, value) => Array(length).fill(value);

    let roomIndex = 0;
    const rooms = Object.values(world.room);
    for (const sourceRoom of rooms)
    {
        const destRoom = {};
        destRoom["id"] = roomIndex;
        destRoom["tilemap"] = sourceRoom.tilemap.map(row => row.map(id => tiles.findIndex(tile => tile.id === id) + 1)); // Add 1 because 0 is an absence of tile
        destRoom["events"] = [];
        destRoom["palette"] = Number(sourceRoom.pal);
        destRoom["wallmap"] = sourceRoom.tilemap.map(row => row.map(id => tiles.find(tile => tile.id === id)?.isWall ? 1 : 0));
        destRoom["backmap"] = ZEROES(ROOM_SIZE).map(() => REPEAT(ROOM_SIZE, 1));
        destRoom["foremap"] = ZEROES(ROOM_SIZE).map(() => REPEAT(ROOM_SIZE, 2));
        bipsi.project.rooms.push(destRoom);
        roomIndex++;

        // Convert exits

        for (const exit of sourceRoom.exits)
        {
            destRoom.events.push({
                position: [exit.x, exit.y],
                fields: [{
                    key: "exit", type: "location", data: {
                        room: rooms.findIndex(room => room.id === exit.dest.room), position: [exit.dest.x, exit.dest.y]
                    }
                }]
            });
        }

        // Convert endings

        for (const ending of sourceRoom.endings)
        {
            destRoom.events.push({
                position: [ending.x, ending.y],
                fields: [{key: "ending", type: "dialogue", data: world.dialog[ending.id].src}]
            });
        }
    }

    // Convert sprites and items

    for (const sprite of [...Object.values(world.sprite), ...Object.values(world.item)])
    {
        const position = (sprite.type !== "ITM") ? [sprite.x, sprite.y] : [0, 0];

        const getColorIndex = index => Math.max(index + 1, 0);

        const event = {
            position: position,
            fields: [
                {key: "graphic", type: "tile", data: drawingDictionary[sprite.drw]},
                {key: "colors", type: "colors", data: {fg: getColorIndex(sprite.col), bg: getColorIndex(sprite.bgc)}},
            ]
        };

        // Handle dialogue

        if (sprite.dlg)
        {
            // TODO: Don't do this if the dialogue is an ending dialogue

            event.fields.push(
                {key: "say", type: "dialogue", data: getDialogue(sprite.dlg)}
            );
        }

        if (sprite.type === "AVA")
        {
            // Handle player avatar

            event.fields.push(
                {key: "is-player", type: "tag", data: true},
                {key: "title", type: "dialogue", data: getDialogue("title")}
            );
        } else if (sprite.type === "SPR")
        {
            // Handle sprite

            event.fields.push(
                {key: "solid", type: "tag", data: true}
            );
        } else if (sprite.type === "ITM")
        {
            // Handle item

            event.fields.push(
                {key: "one-time", type: "tag", data: true}
            );
        }


        if (sprite.type === "ITM")
        {
            // Add item instances

            for (const room of [...Object.values(world.room)])
            {
                const bipsiRoom = getRoom(room.id);

                for (const roomItem of room.items.filter(item => item.id === sprite.id))
                {
                    const eventInstance = structuredClone(event);
                    const existingEvent = findExistingEvent(bipsiRoom, roomItem.x, roomItem.y);

                    if (REUSE_EXISTING_EVENTS && existingEvent)
                    {
                        existingEvent.fields.push(...eventInstance.fields);
                    } else
                    {
                        eventInstance.position = [roomItem.x, roomItem.y];
                        bipsiRoom.events.push(eventInstance);
                    }
                }
            }
        } else
        {
            // Add event instance

            const bipsiRoom = getRoom(sprite.room);
            const existingEvent = findExistingEvent(bipsiRoom, event.position[0], event.position[1]);

            if (REUSE_EXISTING_EVENTS && existingEvent)
            {
                existingEvent.fields.push(...event.fields);
            } else
            {
                bipsiRoom.events.push(event);
            }
        }
    }

    function findExistingEvent(bipsiRoom, x, y)
    {
        return bipsiRoom.events.find(e => e.position[0] === x && e.position[1] === y);
    }

    function getRoom(id)
    {
        return bipsi.project.rooms.at(rooms.findIndex(room => room.id === id));
    }

    function getDialogue(id)
    {
        const remove = ['"""\n', '\n"""'];

        let dialogue = world.dialog[id].src;

        for (const query of remove)
        {
            dialogue = dialogue.replace(query, '');

        }
        return dialogue;
    }

    // Convert palettes

    function componentToHex(c)
    {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b)
    {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    let paletteIndex = 0;
    for (const palette of Object.values(world.palette))
    {
        let colors = palette.colors.map(rgb => rgbToHex(...rgb));
        colors.unshift("#000000");

        colors = Array.from({length: 8}, (_, index) =>
            colors[index] || "#000000"
        );

        bipsi.project.palettes.push({id: paletteIndex, colors});
        paletteIndex++;
    }

    if (DEBUG)
    {
        console.log("===== Import complete =====");

        // Debug save image data to file
        const drawingsPNGData = await canvas.encode('png');
        const imageFilePath = "./output/output.png";
        await Bun.write(imageFilePath, drawingsPNGData);
    }

    return JSON.stringify(bipsi);
}