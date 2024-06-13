import {bitsyToBipsi} from './main.js';

const path = './input/bitsy/custom_8_12.bitsy';
const file = Bun.file(path);
const text = await file.text();
bitsyToBipsi(text).then(async output =>
{
    const inputFilePath = "./output/output.json";
    await Bun.write(inputFilePath, output);
    console.log("Output saved as output.json");
});