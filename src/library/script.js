/*
Modified from bitsy repository by Adam Le Doux and Bitsy authors

MIT License

Copyright (c) 2016-present, Bitsy authors (see CREDITS.md)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Sym = {
    DialogOpen : '"""',
    DialogClose : '"""',
    CodeOpen : "{",
    CodeClose : "}",
    Linebreak : "\n", // just call it "break" ?
    Separator : ":",
    List : "-",
    String : '"',
    ConditionEnd : "?",
    Else : "else",
    ElseExp : ":", // special shorthand for expressions (deprecate?)
    Set : "=",
    Operators : ["==", ">=", "<=", ">", "<", "-", "+", "/", "*"], // operators need to be in reverse order of precedence
};

export const scriptUtils = {
    ReadDialogScript: function(lines, i) {
        var scriptStr = "";
        if (lines[i] === Sym.DialogOpen) {
            scriptStr += lines[i] + "\n";
            i++;
            while(lines[i] != Sym.DialogClose) {
                scriptStr += lines[i] + "\n";
                i++;
            }
            scriptStr += lines[i];
            i++;
        }
        else {
            scriptStr += lines[i];
            i++;
        }
        return { script:scriptStr, index:i };
    }
};