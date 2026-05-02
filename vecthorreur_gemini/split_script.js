const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'vecthorreur.js');
const src = fs.readFileSync(srcPath, 'utf8');

const lines = src.split('\n');
const sections = [];
let currentSection = { num: 0, title: 'Header', lines: [] };

// Regular expression to match section headers
// e.g. // SECTION 1 — AUDIO or // SECTION 22 - START GAME
const sectionRegex = /^\/\/\s*SECTION\s+(\d+)\s*[-—]\s*(.*)$/i;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(sectionRegex);
  
  // Also look for the decorative line before the section to include it
  // // ═══════════════════════════════════════════════════
  const isDecorative = /^\/\/\s*[═=]{10,}/.test(line);

  if (match) {
    // If the previous line was decorative, move it to the new section
    let decorativeLine = null;
    if (currentSection.lines.length > 0 && /^\/\/\s*[═=]{10,}/.test(currentSection.lines[currentSection.lines.length - 1])) {
      decorativeLine = currentSection.lines.pop();
    }
    
    sections.push(currentSection);
    currentSection = { num: parseInt(match[1], 10), title: match[2], lines: [] };
    
    if (decorativeLine) {
      currentSection.lines.push(decorativeLine);
    }
    currentSection.lines.push(line);
  } else {
    currentSection.lines.push(line);
  }
}
sections.push(currentSection); // Push the last one

// Map sections to files
const fileMap = {
  'v-audio.js': [1],
  'v-data.js': [2, 3],
  'v-state.js': [4],
  'v-engine.js': [5, 6, 10, 11, 12, 18, 19, 20, 22, 23, 24, 25],
  'v-ui.js': [7, 8, 9, 13, 14, 15, 16, 17, 21, 26]
};

console.log(`Parsed ${sections.length} sections.`);

for (const [filename, secNums] of Object.entries(fileMap)) {
  let content = `// ${filename} — Extrait de vecthorreur.js\n\n`;
  for (const num of secNums) {
    const sec = sections.find(s => s.num === num);
    if (sec) {
      content += sec.lines.join('\n') + '\n';
    } else {
      console.warn(`Warning: Section ${num} not found!`);
    }
  }
  
  // Header block for engine
  if (filename === 'v-engine.js' && sections.find(s => s.num === 0)) {
    // Add header lines (0) to engine or state? Let's add header to data to be safe, or just skip it if it's just comments.
  }

  const outPath = path.join(__dirname, filename);
  fs.writeFileSync(outPath, content);
  console.log(`Wrote ${outPath} (${content.length} bytes)`);
}

// Rename original
fs.renameSync(srcPath, srcPath + '.bak');
console.log('Renamed original to vecthorreur.js.bak');
