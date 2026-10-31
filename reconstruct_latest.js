const fs = require('fs');
const path = require('path');

const log1 = 'C:\\Users\\Nitro\\.gemini\\antigravity-ide\\brain\\584d9f44-bbf8-45ab-a1df-3ce6d1da392c\\.system_generated\\logs\\transcript.jsonl';
const log2 = 'C:\\Users\\Nitro\\.gemini\\antigravity-ide\\brain\\584d9f44-bbf8-45ab-a1df-3ce6d1da392c\\.system_generated\\logs\\transcript_full.jsonl';
const appJsPath = 'C:\\Users\\Nitro\\Downloads\\New folder\\New folder\\js\\app.js';
const baseBackupPath = 'C:\\Users\\Nitro\\AppData\\Roaming\\Code\\User\\History\\-1c41f60d\\vX3L.js';

// Restore app.js to the base backup first to have a clean starting point
fs.copyFileSync(baseBackupPath, appJsPath);
console.log("Restored app.js to clean base backup (June 16).");

const editsMap = new Map();

function scanLog(logPath) {
    if (!fs.existsSync(logPath)) return;
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim() !== '');
    lines.forEach((line, index) => {
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                data.tool_calls.forEach(tc => {
                    const target = tc.args.TargetFile || tc.args.AbsolutePath || '';
                    if (target.toLowerCase().includes('app.js')) {
                        if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                            const key = `${data.step_index}_${tc.name}_${target}`;
                            if (!editsMap.has(key)) {
                                editsMap.set(key, {
                                    step: data.step_index,
                                    name: tc.name,
                                    args: tc.args,
                                    timestamp: data.created_at || ''
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) {}
    });
}

scanLog(log2); // Scan the untruncated log first so we get full JSON data
scanLog(log1);

const edits = Array.from(editsMap.values());
// Sort by timestamp chronologically
edits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

let code = fs.readFileSync(appJsPath, 'utf8');
console.log(`Base code length: ${code.length}`);

// We only want to apply edits that happened AFTER June 16, 2026 (15:24:52 GMT+0545 is 09:39:52 UTC)
const cutoffDate = new Date('2026-06-16T09:39:52Z');

let appliedCount = 0;
let failedCount = 0;

edits.forEach((edit, idx) => {
    const editDate = new Date(edit.timestamp);
    if (editDate <= cutoffDate) {
        console.log(`Skipping edit [${idx}] (Step ${edit.step}) because it is before/on June 16 cutoff (${edit.timestamp})`);
        return;
    }

    console.log(`\n--- Applying Edit [${idx}] (Step ${edit.step}, Date: ${edit.timestamp}, Tool: ${edit.name}) ---`);

    if (edit.name === 'replace_file_content') {
        const target = edit.args.TargetContent;
        const replacement = edit.args.ReplacementContent;
        
        if (code.includes(target)) {
            code = code.replace(target, replacement);
            console.log("Applied replace_file_content successfully.");
            appliedCount++;
        } else {
            // Try normalizing line endings to LF
            const targetLF = target.replace(/\r\n/g, '\n');
            const codeLF = code.replace(/\r\n/g, '\n');
            if (codeLF.includes(targetLF)) {
                code = codeLF.replace(targetLF, replacement.replace(/\r\n/g, '\n'));
                console.log("Applied replace_file_content successfully with LF normalization.");
                appliedCount++;
            } else {
                console.error("CRITICAL: TargetContent not found!");
                failedCount++;
            }
        }
    } else if (edit.name === 'multi_replace_file_content') {
        let chunks = edit.args.ReplacementChunks || [];
        if (typeof chunks === 'string') {
            try {
                chunks = JSON.parse(chunks);
            } catch (e) {
                console.error("Failed to parse ReplacementChunks JSON string:", e.message);
                chunks = [];
            }
        }
        console.log(`Processing ${chunks.length} chunks...`);
        let allChunksSucceeded = true;
        
        chunks.forEach((chunk, cIdx) => {
            const target = chunk.TargetContent;
            const replacement = chunk.ReplacementContent;
            
            if (code.includes(target)) {
                code = code.replace(target, replacement);
                console.log(`  Chunk [${cIdx}] applied successfully.`);
            } else {
                const targetLF = target.replace(/\r\n/g, '\n');
                const codeLF = code.replace(/\r\n/g, '\n');
                if (codeLF.includes(targetLF)) {
                    code = codeLF.replace(targetLF, replacement.replace(/\r\n/g, '\n'));
                    console.log(`  Chunk [${cIdx}] applied successfully with LF normalization.`);
                } else {
                    console.error(`  CRITICAL: Chunk [${cIdx}] TargetContent not found!`);
                    allChunksSucceeded = false;
                }
            }
        });
        
        if (allChunksSucceeded) {
            appliedCount++;
        } else {
            failedCount++;
        }
    }
});

// Normalize line endings to CRLF for Windows compatibility
code = code.replace(/\r?\n/g, '\r\n');

fs.writeFileSync(appJsPath, code, 'utf8');
console.log(`\nReconstruction finished!`);
console.log(`Successfully applied: ${appliedCount} edits`);
console.log(`Failed to apply: ${failedCount} edits`);
console.log(`Final file size: ${fs.statSync(appJsPath).size} bytes`);
