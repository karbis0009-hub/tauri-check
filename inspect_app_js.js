const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Nitro\\.gemini\\antigravity-ide\\brain\\584d9f44-bbf8-45ab-a1df-3ce6d1da392c\\.system_generated\\logs\\transcript_full.jsonl';

if (!fs.existsSync(logPath)) {
    console.error("Log file not found:", logPath);
    process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');

console.log("Total log lines:", lines.length);

const writes = [];
const views = [];

lines.forEach((line, index) => {
    try {
        const data = JSON.parse(line);
        if (data.tool_calls) {
            data.tool_calls.forEach(tc => {
                const target = tc.args.TargetFile || tc.args.AbsolutePath || '';
                if (target.includes('app.js')) {
                    writes.push({
                        lineIndex: index,
                        step: data.step_index,
                        type: data.type,
                        name: tc.name,
                        args: tc.args
                    });
                }
            });
        }
        if (data.type === 'VIEW_FILE' && data.content && line.includes('app.js')) {
            views.push({
                lineIndex: index,
                step: data.step_index,
                length: data.content.length,
                preview: data.content.substring(0, 100)
            });
        }
    } catch (e) {
        // ignore
    }
});

console.log("=== WRITES / EDITS ===");
writes.forEach(w => {
    console.log(`Line ${w.lineIndex} | Step ${w.step} | Tool: ${w.name} | StartLine: ${w.args.StartLine} | EndLine: ${w.args.EndLine}`);
    if (w.name === 'write_to_file') {
        console.log(`   CodeContent length: ${w.args.CodeContent ? w.args.CodeContent.length : 0}`);
    }
});

console.log("\n=== VIEWS ===");
views.forEach(v => {
    console.log(`Line ${v.lineIndex} | Step ${v.step} | Length: ${v.length} | Preview: ${v.preview.replace(/\r?\n/g, ' ')}`);
});
