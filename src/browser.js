import {bitsyToBipsi} from "./main.js";

function readFileInBrowser(file, callback)
{
    const reader = new FileReader();
    reader.onload = (event) =>
    {
        callback(event.target.result).then(output =>
        {
            downloadFile(output, "bipsi.json", "text/plain");
        });
    };
    reader.readAsText(file);
}

function downloadFile(content, filename, contentType)
{
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.getElementById("generate").addEventListener("click", b =>
{
    const fileInput = document.getElementById("input-bitsy");
    const file = fileInput.files[0];
    if (file)
    {
        readFileInBrowser(file, bitsyToBipsi);
    } else
    {
        alert("Please select a file first.");
    }
});