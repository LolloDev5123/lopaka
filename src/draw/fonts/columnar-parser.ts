/**
 * Parser for column-major byte array fonts (e.g., from embedded systems)
 * Converts column-major bitmap data to row-major FontPack format
 */

export interface ColumnarFontSpec {
    data: number[][];
    charHeight: number;
    charWidth: number;
    firstChar?: number;
    name?: string;
}

function readBit(byte: number, bit: number): number {
    return (byte & (1 << bit)) >> bit;
}

function writeBit(byte: number, bit: number, value: number): number {
    return byte | (value << bit);
}

/**
 * Convert column-major bitmap to row-major bitmap
 * @param colData - Array where data is organized as: [col0_lowerByte, col1_lowerByte, ..., colN_lowerByte, col0_upperByte, col1_upperByte, ..., colN_upperByte]
 * @param width - Character width in pixels
 * @param height - Character height in pixels
 */
function columnMajorToRowMajor(colData: number[], width: number, height: number): number[] {
    const rowBytes: number[] = [];
    const bytesPerRow = Math.ceil(width / 8);
    const bytesPerColumn = Math.ceil(height / 8);
    
    // The data format is: all first bytes of each column, then all second bytes, etc.
    // For 16px tall font with 13 columns: [col0_low, col1_low, ..., col12_low, col0_high, col1_high, ..., col12_high]
    
    for (let row = 0; row < height; row++) {
        let byte = 0;
        let bitPos = 0;
        
        for (let col = 0; col < width; col++) {
            // Determine which byte in the column this row belongs to
            const byteInColumn = Math.floor(row / 8);
            const bitInByte = row % 8;
            
            // Calculate index in the data array
            // Data is organized as: all byte 0s, then all byte 1s, etc.
            const dataIndex = byteInColumn * width + col;
            
            // Read bit from column-major data
            const bit = dataIndex < colData.length ? readBit(colData[dataIndex], bitInByte) : 0;
            
            // Write to row-major format (MSB first)
            byte = writeBit(byte, 7 - bitPos, bit);
            bitPos++;
            
            if (bitPos === 8 || col === width - 1) {
                rowBytes.push(byte);
                byte = 0;
                bitPos = 0;
            }
        }
    }
    
    return rowBytes;
}

export default function parseColumnar(spec: ColumnarFontSpec): FontPack {
    const {data, charHeight, charWidth, firstChar = 32, name = 'ColumnarFont'} = spec;
    
    const glyphs = new Map<number, FontGlyph>();
    
    data.forEach((charData, index) => {
        const code = firstChar + index;
        const bytes = columnMajorToRowMajor(charData, charWidth, charHeight);
        
        glyphs.set(code, {
            code,
            bytes,
            // bounds: [xOffset, yOffset, width, height]
            // yOffset = charHeight - 1 aligns text properly in bounds box
            // drawText formula: charPos.y + (j - bounds[1]) - scaleFactor
            // Row 0: charPos.y + (0 - (charHeight-1)) - 1 = charPos.y - charHeight
            // Last row: charPos.y + ((charHeight-1) - (charHeight-1)) - 1 = charPos.y - 1
            bounds: [0, charHeight - 1, charWidth, charHeight],
            scalableSize: [charWidth, charHeight],
            deviceSize: [charWidth, charHeight],
            xAdvance: charWidth + 1, // Add 1px spacing between characters
        });
    });
    
    const font: FontPack = {
        meta: {
            name,
            size: {
                points: charHeight,
                resolutionX: charHeight * 10,
                resolutionY: charHeight * 10,
            },
            bounds: [0, 0, charWidth, charHeight],
            properties: {
                fontDescent: 0,
                fontAscent: charHeight,
                defaultChar: firstChar,
            },
            totalChars: glyphs.size,
        },
        glyphs,
    };
    
    return font;
}
